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

// 2. Default Seed Data
const DEFAULT_MEMBERS = [
  {
    id: 'mem_jishnu',
    name: 'Jishnu',
    mobile_number: '9876543210',
    caricature_key: 'jishnu',
    role: 'Tech Explorer',
    bio: 'Curious tech explorer, loves coding cool tools, gaming, and late night coffee brews.',
    tags: JSON.stringify(['💻 Tech Lover', '☕ Coffee Fan', '🎮 Gamer']),
    room_title: "Jishnu's Tech Den",
    room_desc: 'Dual-monitor setup with warm ambient strip lighting, mechanical keyboards, and a comfy beanbag.',
    room_status: 'Currently compiling code and listening to lo-fi beats.',
    quote: 'Keep creating, keep questioning, and never stop building awesome things!',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mem_ashna',
    name: 'Ashna',
    mobile_number: '9876543211',
    caricature_key: 'ashna',
    role: 'Creative Artist',
    bio: 'Creative mind, loves painting, cozy playlists, sweet treats, and family weekend trips.',
    tags: JSON.stringify(['🎨 Creative Artist', '🎵 Music Lover', '🧁 Baker']),
    room_title: "Ashna's Art Haven",
    room_desc: 'Sunlit room with fairy lights, watercolor sketches pinned on walls, and potted succulents.',
    room_status: 'Sketching new designs and organizing pastel paints.',
    quote: 'Add a splash of color to everyday moments.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mem_raju',
    name: 'Raju',
    mobile_number: '9876543212',
    caricature_key: 'raju',
    role: 'Family Pillar & Reader',
    bio: 'The family pillar! Enjoys morning newspaper walkabouts, gardening, and classic stories.',
    tags: JSON.stringify(['🌿 Green Thumb', '📰 Avid Reader', '🛠️ Master Fixer']),
    room_title: "Raju's Study & Garden Porch",
    room_desc: 'Comfortable rocking chair and vintage bookshelf overlooking the green front yard.',
    room_status: 'Pruning the jasmine plants and tuning into evening radio.',
    quote: 'Patience and hard work always bear the sweetest fruits.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mem_lalitha',
    name: 'Lalitha',
    mobile_number: '9876543213',
    caricature_key: 'lalitha',
    role: 'Heart of Home & Chef',
    bio: 'The warm heart of the home. Master of delicious feasts, kindness, and keeping everyone connected.',
    tags: JSON.stringify(['🍲 Master Chef', '🌸 Joy Spreader', '❤️ Heart of Home']),
    room_title: "Lalitha's Cozy Sanctuary",
    room_desc: 'Filled with family photo albums, soft handcrafted cushions, and aroma of sweet cardamom.',
    room_status: 'Making evening snacks and sharing laughter on the phone.',
    quote: 'A happy family is an earlier heaven.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Fallback in-memory cache if MySQL is offline
let memoryMembers = [...DEFAULT_MEMBERS];
let memoryGallery = [];

// 3. MySQL Pool Management
let pool = null;
let isDbConnected = false;

async function initMySQL() {
  try {
    // 1. Connect without database first to ensure DB exists
    const rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.end();

    // 2. Create pooled connection
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
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id VARCHAR(64) PRIMARY KEY,
        image_data LONGTEXT NOT NULL,
        title VARCHAR(255) DEFAULT 'Family Memory',
        uploaded_by VARCHAR(255) DEFAULT 'Family Member',
        created_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Seed if empty
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM members');
    if (rows[0].total === 0) {
      for (const m of DEFAULT_MEMBERS) {
        await pool.query(
          `INSERT INTO members (id, name, mobile_number, caricature_key, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.id, m.name, m.mobile_number, m.caricature_key, m.role, m.bio, m.tags, m.room_title, m.room_desc, m.room_status, m.quote, m.created_at, m.updated_at]
        );
      }
      console.log('🌱 MySQL database initialized with 4 default family members.');
    }

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

// 4. Helper Parsers
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
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
      const id = 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();
      const caricature_key = data.caricature_key || 'boy';
      const role = data.role || 'Cherished Family Member';
      const bio = data.bio || `${role}. Always bringing fresh energy and happiness to our family home!`;
      const tags = JSON.stringify(data.tags || [`🌟 ${role.slice(0, 20)}`, '🏡 Family Member']);
      const room_title = data.room_title || `${data.name}'s Cozy Corner`;
      const room_desc = data.room_desc || 'A freshly prepared cozy room with warm lighting.';
      const room_status = data.room_status || 'Settling happily into the family home!';
      const quote = data.quote || 'Home is where love resides and memories blossom.';
      const image_url = data.image_url || null;
      const mobile_number = String(data.mobile_number).trim();

      if (isDbConnected && pool) {
        await pool.query(
          `INSERT INTO members (id, name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, quote, now, now]
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
        tags,
        room_title,
        room_desc,
        room_status,
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
            data.name ?? curr.name,
            data.mobile_number !== undefined ? String(data.mobile_number).trim() : curr.mobile_number,
            data.caricature_key ?? curr.caricature_key,
            data.image_url !== undefined ? data.image_url : curr.image_url,
            data.role ?? curr.role,
            data.bio ?? curr.bio,
            tagsJson,
            data.room_title ?? curr.room_title,
            data.room_desc ?? curr.room_desc,
            data.room_status ?? curr.room_status,
            data.room_notes !== undefined ? data.room_notes : curr.room_notes,
            checklistJson,
            locationJson,
            data.quote ?? curr.quote,
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
      memoryMembers[idx] = {
        ...memoryMembers[idx],
        ...data,
        tags: data.tags !== undefined ? JSON.stringify(data.tags) : memoryMembers[idx].tags,
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

  // DELETE /api/members/:id
  if (pathname.startsWith('/api/members/') && req.method === 'DELETE') {
    try {
      const id = pathname.replace('/api/members/', '');

      if (isDbConnected && pool) {
        const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM members');
        if (countRows[0].total <= 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot delete: Database requires at least 1 family record.' }));
          return;
        }
        await pool.query('DELETE FROM members WHERE id = ?', [id]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, deletedId: id, message: 'Member deleted successfully.' }));
        return;
      }

      if (memoryMembers.length <= 1) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Cannot delete: Database requires at least 1 family record.' }));
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

      if (isDbConnected && pool) {
        await pool.query(
          `INSERT INTO gallery (id, image_data, title, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, data.image_data, title, uploaded_by, now]
        );
        const [rows] = await pool.query('SELECT * FROM gallery WHERE id = ?', [id]);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows[0]));
        return;
      }

      const item = { id, image_data: data.image_data, title, uploaded_by, created_at: now };
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
        for (const m of DEFAULT_MEMBERS) {
          await pool.query(
            `INSERT INTO members (id, name, mobile_number, caricature_key, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [m.id, m.name, m.mobile_number, m.caricature_key, m.role, m.bio, m.tags, m.room_title, m.room_desc, m.room_status, m.quote, m.created_at, m.updated_at]
          );
        }
      }
      memoryMembers = [...DEFAULT_MEMBERS];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 6. Static File Serving (SPA Fallback)
  let staticFile = path.join(DIST_PATH, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(staticFile) || !fs.statSync(staticFile).isFile()) {
    staticFile = path.join(__dirname, '..', pathname === '/' ? 'index.html' : pathname);
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
  } else if (fs.existsSync(path.join(DIST_PATH, 'index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(DIST_PATH, 'index.html')).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🏡 Family Home Server running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to MySQL database at ${DB_HOST}:${DB_PORT} (DB: ${DB_NAME})`);
});
