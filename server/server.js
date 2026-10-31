/**
 * Family Home Interface - Backend Server (Node.js + MySQL)
 * Native HTTP server with mysql2 connection pool & fallback cache
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load Environment Variables (.env / server/.env)
function loadEnv() {
  const envCandidates = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env.development'),
  ];
  for (const envFile of envCandidates) {
    if (fs.existsSync(envFile)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envFile);
        } else {
          const content = fs.readFileSync(envFile, 'utf8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const eqIdx = trimmed.indexOf('=');
              if (eqIdx > 0) {
                const key = trimmed.slice(0, eqIdx).trim();
                const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                if (!process.env[key]) process.env[key] = val;
              }
            }
          }
        }
        console.log(`📄 Loaded environment from ${path.basename(envFile)}`);
        break;
      } catch (e) {
        console.warn(`Could not read ${envFile}:`, e.message);
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'family_home_db';
const DIST_PATH = path.join(__dirname, '..', 'dist');

// 2. Default Seed Data (Only Admin 2000 is built-in; no default members)
const DEFAULT_MEMBERS = [];

// Fallback in-memory cache if MySQL is offline
let memoryMembers = [];
let memoryGallery = [];

// 3. MySQL Pool Management
let pool = null;
let isDbConnected = false;

async function initMySQL() {
  const isRemote = DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1';
  const sslConfig = isRemote ? { rejectUnauthorized: false } : undefined;

  try {
    // 1. Attempt creating database if host permits (e.g. local MySQL)
    try {
      const rootConn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: sslConfig,
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await rootConn.end();
    } catch {
      // Cloud providers (e.g. TiDB) provide a pre-created database
    }

    // 2. Create pooled connection (with 64MB max packet for high-res photo uploads)
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      maxAllowedPacket: 67108864, // 64MB
      ssl: sslConfig,
    });

    // 3. Initialize Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(32) NOT NULL,
        caricature_key VARCHAR(64) NOT NULL DEFAULT 'boy',
        image_url LONGTEXT,
        role VARCHAR(255) DEFAULT 'Cherished Family Member',
        bio TEXT,
        tags JSON,
        room_title VARCHAR(255),
        room_desc TEXT,
        room_status TEXT,
        room_notes TEXT,
        checklist JSON,
        location JSON,
        quote TEXT,
        created_at VARCHAR(64),
        updated_at VARCHAR(64),
        UNIQUE KEY uq_member_mobile (mobile_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id VARCHAR(64) PRIMARY KEY,
        image_data LONGTEXT NOT NULL,
        title VARCHAR(255) DEFAULT 'Family Memory',
        uploaded_by VARCHAR(255) DEFAULT 'Family Member',
        uploaded_by_id VARCHAR(64) DEFAULT NULL,
        created_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Dynamic schema migrations for existing deployments
    try {
      await pool.query(`ALTER TABLE members ADD UNIQUE KEY uq_member_mobile (mobile_number)`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE gallery ADD COLUMN uploaded_by_id VARCHAR(64) DEFAULT NULL`);
    } catch {}

    // Ensure any legacy seed records are cleared from members table
    try {
      await pool.query(`DELETE FROM members WHERE id IN ('mem_jishnu', 'mem_ashna', 'mem_raju', 'mem_lalitha')`);
    } catch {}

    isDbConnected = true;
    console.log(`✅ MySQL Connected: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
  } catch (err) {
    isDbConnected = false;
    pool = null;
    console.warn(`⚠️ MySQL Connection Notice: Could not connect to ${DB_HOST}:${DB_PORT} (${err.code || err.message}).`);
    console.warn(`👉 Operating with in-memory cache until MySQL starts. Will retry connecting periodically.`);
  }
}

// Initial connect & periodic retry if DB was initially offline
initMySQL();
setInterval(() => {
  if (!isDbConnected) {
    initMySQL();
  }
}, 12000);

// 4. Helper Parsers (with 15MB DoS Protection)
function parseJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let receivedBytes = 0;
    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        req.destroy();
        const err = new Error('Payload Too Large');
        err.statusCode = 413;
        reject(err);
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function formatRow(row) {
  if (!row) return null;
  let tags = [];
  try {
    tags = typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []);
  } catch {
    tags = [];
  }
  let checklist = [];
  try {
    checklist = typeof row.checklist === 'string' ? JSON.parse(row.checklist || '[]') : (row.checklist || []);
  } catch {
    checklist = [];
  }
  let location = null;
  try {
    location = typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || null);
  } catch {
    location = null;
  }
  return { ...row, tags, checklist, location };
}

// 5. HTTP Server Request Router
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      database: isDbConnected ? 'MySQL' : 'MemoryCache',
      connected: isDbConnected,
      host: DB_HOST,
      port: DB_PORT,
      databaseName: DB_NAME,
      time: new Date().toISOString(),
    }));
    return;
  }

  // GET /api/members
  if (pathname === '/api/members' && req.method === 'GET') {
    try {
      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM members ORDER BY created_at ASC');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows.map(formatRow)));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(memoryMembers.map(formatRow)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/members/:id
  if (pathname.startsWith('/api/members/') && req.method === 'GET') {
    const id = pathname.replace('/api/members/', '');
    try {
      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        if (!rows || rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Member not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(formatRow(rows[0])));
        return;
      }

      const found = memoryMembers.find((m) => m.id === id);
      if (!found) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Member not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(found)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/members
  if (pathname === '/api/members' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      if (!data.name || !data.mobile_number) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name and Mobile Number are required.' }));
        return;
      }
      const mobile_number = String(data.mobile_number).trim();

      // Master Admin Code Protection
      if (mobile_number === '2000') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Mobile number "2000" is reserved for Master Admin login.' }));
        return;
      }

      // Check for duplicate mobile number
      if (isDbConnected && pool) {
        const [existing] = await pool.query('SELECT id FROM members WHERE TRIM(mobile_number) = ?', [mobile_number]);
        if (existing.length > 0) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Mobile number "${mobile_number}" is already registered to another member.` }));
          return;
        }
      } else {
        const dup = memoryMembers.find((m) => String(m.mobile_number).trim() === mobile_number);
        if (dup) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Mobile number "${mobile_number}" is already registered to another member.` }));
          return;
        }
      }

      const id = 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();
      const caricature_key = data.caricature_key || 'boy';
      const role = data.role || 'Cherished Family Member';
      const bio = data.bio || `${role}. Always bringing fresh energy and happiness to our family home!`;
      const tags = JSON.stringify(data.tags || [`🌟 ${role.slice(0, 20)}`, '🏡 Family Member']);
      const room_title = data.room_title || `${data.name}'s Cozy Corner`;
      const room_desc = data.room_desc || 'A freshly prepared cozy room with warm lighting.';
      const room_status = data.room_status || 'Settling happily into the family home!';
      const room_notes = data.room_notes || 'Welcome to my space!';
      const checklist = JSON.stringify(data.checklist || [
        { id: 'c_' + Date.now().toString(36), text: 'Settle into new room', completed: false },
      ]);
      const location = JSON.stringify(data.location || {
        name: 'Our Sweet Home',
        address: '22 Blossom Lane',
        lat: 12.97,
        lng: 77.59,
        updated_at: 'Just now',
        status: 'Relaxing at home',
      });
      const quote = data.quote || 'Home is where love resides and memories blossom.';
      const image_url = data.image_url || null;

      if (isDbConnected && pool) {
        await pool.query(
          `INSERT INTO members (id, name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, room_notes, checklist, location, quote, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, room_notes, checklist, location, quote, now, now]
        );
        const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(formatRow(rows[0])));
        return;
      }

      const newRecord = {
        id,
        name: data.name,
        mobile_number,
        caricature_key,
        image_url,
        role,
        bio,
        tags: data.tags || [`🌟 ${role.slice(0, 20)}`, '🏡 Family Member'],
        room_title,
        room_desc,
        room_status,
        room_notes,
        checklist: data.checklist || [
          { id: 'c_' + Date.now().toString(36), text: 'Settle into new room', completed: false },
        ],
        location: data.location || {
          name: 'Our Sweet Home',
          address: '22 Blossom Lane',
          lat: 12.97,
          lng: 77.59,
          updated_at: 'Just now',
          status: 'Relaxing at home',
        },
        quote,
        created_at: now,
        updated_at: now,
      };
      memoryMembers.push(newRecord);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(newRecord)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT /api/members/:id
  if (pathname.startsWith('/api/members/') && req.method === 'PUT') {
    try {
      const id = pathname.replace('/api/members/', '');
      const data = await parseJsonBody(req);
      const now = new Date().toISOString();

      if (data.mobile_number !== undefined) {
        const cleanMobile = String(data.mobile_number).trim();
        if (cleanMobile === '2000') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Mobile number "2000" is reserved for Master Admin login.' }));
          return;
        }

        // Check for collision with another member
        if (isDbConnected && pool) {
          const [conflict] = await pool.query('SELECT id FROM members WHERE TRIM(mobile_number) = ? AND id != ?', [cleanMobile, id]);
          if (conflict.length > 0) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Mobile number "${cleanMobile}" is already registered to another member.` }));
            return;
          }
        } else {
          const conflict = memoryMembers.find((m) => String(m.mobile_number).trim() === cleanMobile && m.id !== id);
          if (conflict) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Mobile number "${cleanMobile}" is already registered to another member.` }));
            return;
          }
        }
      }

      if (isDbConnected && pool) {
        const [existing] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Member not found' }));
          return;
        }
        const curr = existing[0];
        const tagsJson = data.tags !== undefined ? JSON.stringify(data.tags) : curr.tags;
        const checklistJson = data.checklist !== undefined ? JSON.stringify(data.checklist) : curr.checklist;
        const locationJson = data.location !== undefined ? JSON.stringify(data.location) : curr.location;

        await pool.query(
          `UPDATE members SET
             name = ?, mobile_number = ?, caricature_key = ?, image_url = ?, role = ?, bio = ?, tags = ?,
             room_title = ?, room_desc = ?, room_status = ?, room_notes = ?, checklist = ?, location = ?, quote = ?, updated_at = ?
           WHERE id = ?`,
          [
            data.name !== undefined ? data.name : curr.name,
            data.mobile_number !== undefined ? String(data.mobile_number).trim() : curr.mobile_number,
            data.caricature_key !== undefined ? data.caricature_key : curr.caricature_key,
            data.image_url !== undefined ? data.image_url : curr.image_url,
            data.role !== undefined ? data.role : curr.role,
            data.bio !== undefined ? data.bio : curr.bio,
            tagsJson,
            data.room_title !== undefined ? data.room_title : curr.room_title,
            data.room_desc !== undefined ? data.room_desc : curr.room_desc,
            data.room_status !== undefined ? data.room_status : curr.room_status,
            data.room_notes !== undefined ? data.room_notes : curr.room_notes,
            checklistJson,
            locationJson,
            data.quote !== undefined ? data.quote : curr.quote,
            now,
            id,
          ]
        );
        const [updatedRows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(formatRow(updatedRows[0])));
        return;
      }

      const idx = memoryMembers.findIndex((m) => m.id === id);
      if (idx === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Member not found' }));
        return;
      }
      const curr = memoryMembers[idx];
      const cleanUpdates = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) cleanUpdates[k] = v;
      }
      memoryMembers[idx] = {
        ...curr,
        ...cleanUpdates,
        tags: data.tags !== undefined ? data.tags : curr.tags,
        checklist: data.checklist !== undefined ? data.checklist : curr.checklist,
        location: data.location !== undefined ? data.location : curr.location,
        updated_at: now,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(memoryMembers[idx])));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/members (Clear all members)
  if (pathname === '/api/members' && req.method === 'DELETE') {
    try {
      if (isDbConnected && pool) {
        await pool.query('DELETE FROM members');
      }
      memoryMembers = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'All family members removed from database.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/members/:id
  if (pathname.startsWith('/api/members/') && req.method === 'DELETE') {
    try {
      const id = pathname.replace('/api/members/', '');

      if (isDbConnected && pool) {
        await pool.query('DELETE FROM members WHERE id = ?', [id]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, deletedId: id, message: 'Member deleted successfully.' }));
        return;
      }

      memoryMembers = memoryMembers.filter((m) => m.id !== id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const { mobile_number } = await parseJsonBody(req);
      const cleanPhone = String(mobile_number || '').trim();

      if (!cleanPhone) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please enter a mobile number.' }));
        return;
      }

      // Admin Login
      if (cleanPhone === '2000') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          role: 'admin',
          name: 'Admin',
          mobile_number: '2000',
          message: 'Welcome Admin!',
        }));
        return;
      }

      // Member Login
      let matched = null;
      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM members WHERE TRIM(mobile_number) = ?', [cleanPhone]);
        if (rows.length > 0) matched = rows[0];
      } else {
        matched = memoryMembers.find((m) => String(m.mobile_number).trim() === cleanPhone);
      }

      if (matched) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          role: 'member',
          name: matched.name,
          mobile_number: matched.mobile_number,
          memberId: matched.id,
          member: formatRow(matched),
          message: `Welcome back, ${matched.name}!`,
        }));
        return;
      }

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Mobile number not found. Enter "2000" for Admin or your registered member mobile number.',
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/gallery
  if (pathname === '/api/gallery' && req.method === 'GET') {
    try {
      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM gallery ORDER BY created_at DESC');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(memoryGallery));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/gallery
  if (pathname === '/api/gallery' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      if (!data.image_data) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image data is required.' }));
        return;
      }
      const id = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();
      const title = (data.title || 'Family Memory').trim();
      const uploaded_by = (data.uploaded_by || 'Family Member').trim();
      const uploaded_by_id = data.uploaded_by_id || null;

      if (isDbConnected && pool) {
        await pool.query(
          `INSERT INTO gallery (id, image_data, title, uploaded_by, uploaded_by_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, data.image_data, title, uploaded_by, uploaded_by_id, now]
        );
        const [rows] = await pool.query('SELECT * FROM gallery WHERE id = ?', [id]);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows[0]));
        return;
      }

      const item = { id, image_data: data.image_data, title, uploaded_by, uploaded_by_id, created_at: now };
      memoryGallery.unshift(item);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/gallery/:id
  if (pathname.startsWith('/api/gallery/') && req.method === 'DELETE') {
    try {
      const id = pathname.replace('/api/gallery/', '');
      if (isDbConnected && pool) {
        await pool.query('DELETE FROM gallery WHERE id = ?', [id]);
      } else {
        memoryGallery = memoryGallery.filter((i) => i.id !== id);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/reset
  if (pathname === '/api/reset' && req.method === 'POST') {
    try {
      if (isDbConnected && pool) {
        await pool.query('DELETE FROM members');
      }
      memoryMembers = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 6. Static File Serving (SPA Fallback with Directory Traversal Protection)
  const resolvedDist = path.resolve(DIST_PATH);
  const safeRelative = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
  const targetFile = safeRelative === '' ? 'index.html' : safeRelative;
  const staticFile = path.resolve(resolvedDist, targetFile);

  // Strictly block path traversal attempts outside dist directory
  if (!staticFile.startsWith(resolvedDist)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Access outside web root is denied.');
    return;
  }

  if (fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
    const ext = path.extname(staticFile).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(staticFile).pipe(res);
  } else if (fs.existsSync(path.join(resolvedDist, 'index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(resolvedDist, 'index.html')).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🏡 Family Home Server running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to MySQL database at ${DB_HOST}:${DB_PORT} (DB: ${DB_NAME})`);
});
