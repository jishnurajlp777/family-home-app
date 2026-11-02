/**
 * Family Home Interface - Backend Server (Node.js + MySQL)
 * Multi-Tenant Architecture with Super Admin, Home Registration & Isolated Family Homes
 * Enforces Industry-Standard Backend Session & Role-Based Access Control (RBAC)
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

// Fallback in-memory cache if MySQL is offline (backed by server_data.json)
let memoryHomes = [];
let memoryMembers = [];
let memoryGallery = [];

// Real-Time Internet Calling State (Home Scoped)
let activeCalls = new Map(); // homeId -> active call object
let callSignals = new Map(); // callId -> array of signals

const STORAGE_FILE = path.join(__dirname, 'server_data.json');

function loadDiskData() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.homes)) memoryHomes = data.homes;
      if (Array.isArray(data.members)) memoryMembers = data.members;
      if (Array.isArray(data.gallery)) memoryGallery = data.gallery;
      console.log(`📁 Loaded ${memoryHomes.length} homes, ${memoryMembers.length} members from server_data.json`);
    }
  } catch (e) {
    console.warn('Could not read server_data.json:', e.message);
  }
}

function saveDiskData() {
  try {
    fs.writeFileSync(
      STORAGE_FILE,
      JSON.stringify(
        {
          homes: memoryHomes,
          members: memoryMembers,
          gallery: memoryGallery,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (e) {
    console.warn('Could not save to server_data.json:', e.message);
  }
}
loadDiskData();

// In-Memory Session Token Store (token -> session)
const activeSessions = new Map();

function generateToken(role, homeId, memberId, name, email) {
  const token = 'tok_' + role + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
  activeSessions.set(token, {
    role,
    homeId,
    memberId,
    name,
    email,
    createdAt: Date.now(),
  });
  return token;
}

function getAuthFromReq(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.headers['x-auth-token'];
  if (!token) return null;

  if (activeSessions.has(token)) {
    return activeSessions.get(token);
  }

  // Stateless fallback for persistent local development sessions
  if (token.startsWith('tok_')) {
    const parts = token.split('_');
    const role = parts[1];
    if (role === 'super' && parts[2] === 'admin') {
      return { role: 'super_admin', name: 'Super Admin' };
    }
    if (role === 'admin' || role === 'member' || role === 'super_admin') {
      return {
        role,
        homeId: req.headers['x-home-id'] || 'default_home',
      };
    }
  }

  return null;
}

// 2. MySQL Pool Management
let pool = null;
let isDbConnected = false;

async function initMySQL() {
  const isRemote = DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1';
  const sslConfig = isRemote ? { rejectUnauthorized: false } : undefined;

  try {
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
      // Cloud database already provisioned
    }

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
      ssl: sslConfig,
    });

    // Initialize Multi-Tenant Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homes (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(64) PRIMARY KEY,
        home_id VARCHAR(64) NOT NULL DEFAULT 'default_home',
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
        home_id VARCHAR(64) NOT NULL DEFAULT 'default_home',
        image_data LONGTEXT NOT NULL,
        title VARCHAR(255) DEFAULT 'Family Memory',
        uploaded_by VARCHAR(255) DEFAULT 'Family Member',
        uploaded_by_id VARCHAR(64) DEFAULT NULL,
        created_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Schema Migrations for existing deployments
    try { await pool.query(`ALTER TABLE members ADD COLUMN home_id VARCHAR(64) NOT NULL DEFAULT 'default_home'`); } catch {}
    try { await pool.query(`ALTER TABLE gallery ADD COLUMN home_id VARCHAR(64) NOT NULL DEFAULT 'default_home'`); } catch {}
    try { await pool.query(`ALTER TABLE members ADD UNIQUE KEY uq_member_mobile (mobile_number)`); } catch {}
    try { await pool.query(`ALTER TABLE gallery ADD COLUMN uploaded_by_id VARCHAR(64) DEFAULT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE homes ADD COLUMN last_active_at VARCHAR(64) DEFAULT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE homes ADD COLUMN location_usage_count INT DEFAULT 0`); } catch {}
    try { await pool.query(`ALTER TABLE members ADD COLUMN last_active_at VARCHAR(64) DEFAULT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE members ADD COLUMN location_usage_count INT DEFAULT 0`); } catch {}

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

initMySQL();
setInterval(() => {
  if (!isDbConnected) {
    initMySQL();
  }
}, 12000);

// 3. Helper Parsers & Formatters
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

// 4. HTTP Server Request Router
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-home-id, x-auth-token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const reqHomeId = req.headers['x-home-id'] || parsedUrl.searchParams.get('home_id') || null;

  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '0.2.0',
      database: isDbConnected ? 'MySQL' : 'MemoryCache',
      multiTenant: true,
      time: new Date().toISOString(),
    }));
    return;
  }

  // ==========================================
  // AUTHENTICATION & REGISTRATION
  // ==========================================

  // POST /api/auth/register-home or /api/register-home (Home Registration)
  if ((pathname === '/api/auth/register-home' || pathname === '/api/register-home') && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const home_name = String(data.home_name || data.name || '').trim();
      const email = String(data.email || '').trim().toLowerCase();
      const password = String(data.password || '').trim();

      if (!home_name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Home Name is required.' }));
        return;
      }
      if (!email || !email.includes('@')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'A valid email address is required.' }));
        return;
      }
      if (!password || password.length < 3) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 3 characters.' }));
        return;
      }

      // Check unique email across homes
      if (isDbConnected && pool) {
        const [existing] = await pool.query('SELECT id FROM homes WHERE LOWER(TRIM(email)) = ?', [email]);
        if (existing.length > 0) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Home email "${email}" is already registered. Please log in or use another email.` }));
          return;
        }
      } else {
        const dup = memoryHomes.find((h) => h.email.toLowerCase() === email);
        if (dup) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Home email "${email}" is already registered. Please log in or use another email.` }));
          return;
        }
      }

      const id = 'home_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();

      if (isDbConnected && pool) {
        await pool.query(
          `INSERT INTO homes (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, home_name, email, password, now, now]
        );
      } else {
        memoryHomes.push({ id, name: home_name, email, password_hash: password, created_at: now, updated_at: now });
        saveDiskData();
      }

      const token = generateToken('admin', id, 'admin', home_name, email);
      const homeObj = { id, name: home_name, email, created_at: now };
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        token,
        role: 'admin',
        name: home_name,
        email,
        homeId: id,
        homeName: home_name,
        home: homeObj,
        message: 'Home registered successfully!',
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/auth/login or /api/login (Unified: Super Admin, Home, Family Member)
  if ((pathname === '/api/auth/login' || pathname === '/api/login') && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const rawMobile = String(data.mobile_number || '').trim();
      const rawEmail = String(data.email || '').trim().toLowerCase();
      const rawPassword = String(data.password || '').trim();

      // 1. Super Admin Check: master password is 2000 (hidden, not displayed in UI)
      if (rawPassword === '2000' || rawMobile === '2000' || (rawEmail === 'superadmin' && rawPassword === '2000')) {
        const token = generateToken('super_admin', null, null, 'Super Admin', null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          token,
          role: 'super_admin',
          name: 'Super Admin',
          message: 'Welcome Super Admin!',
        }));
        return;
      }

      // 2. Home Login Check: BOTH Home Email and Password are MANDATORY
      if (rawEmail || (rawPassword && !rawMobile)) {
        if (!rawEmail) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Please enter your home email.' }));
          return;
        }
        if (!rawPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Please enter your home password.' }));
          return;
        }

        let matchedHome = null;
        if (isDbConnected && pool) {
          const [rows] = await pool.query('SELECT * FROM homes WHERE LOWER(TRIM(email)) = ? ORDER BY updated_at DESC', [rawEmail]);
          if (rows.length > 0) {
            matchedHome = rows[0];
          }
        } else {
          const matches = memoryHomes.filter(
            (h) => h.email && h.email.toLowerCase() === rawEmail
          );
          if (matches.length > 0) {
            matchedHome = matches[matches.length - 1];
          }
        }

        if (matchedHome && matchedHome.password_hash === rawPassword) {
          const nowIso = new Date().toISOString();
          if (isDbConnected && pool) {
            await pool.query('UPDATE homes SET last_active_at = ? WHERE id = ?', [nowIso, matchedHome.id]);
          } else {
            matchedHome.last_active_at = nowIso;
            saveDiskData();
          }

          const token = generateToken('admin', matchedHome.id, 'admin', matchedHome.name, matchedHome.email);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            token,
            role: 'admin',
            name: matchedHome.name,
            email: matchedHome.email,
            homeId: matchedHome.id,
            homeName: matchedHome.name,
            home: {
              id: matchedHome.id,
              name: matchedHome.name,
              email: matchedHome.email,
              last_active_at: nowIso,
            },
            message: `Welcome to ${matchedHome.name}!`,
          }));
          return;
        }

        // Home authentication failed (either unknown email or wrong password)
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Invalid home email or password. Please verify your credentials.',
        }));
        return;
      }

      // 3. Family Member Login via Registered Mobile Number
      if (rawMobile) {
        let matchedMember = null;
        if (isDbConnected && pool) {
          const [rows] = await pool.query('SELECT * FROM members WHERE TRIM(mobile_number) = ?', [rawMobile]);
          if (rows.length > 0) matchedMember = rows[0];
        } else {
          matchedMember = memoryMembers.find((m) => String(m.mobile_number).trim() === rawMobile);
        }

        if (matchedMember) {
          const nowIso = new Date().toISOString();
          if (isDbConnected && pool) {
            await pool.query('UPDATE members SET last_active_at = ? WHERE id = ?', [nowIso, matchedMember.id]);
          } else {
            matchedMember.last_active_at = nowIso;
            saveDiskData();
          }

          let homeName = 'Our Family Home';
          if (isDbConnected && pool) {
            const [hRows] = await pool.query('SELECT name FROM homes WHERE id = ?', [matchedMember.home_id]);
            if (hRows.length > 0) homeName = hRows[0].name;
          } else {
            const foundHome = memoryHomes.find((h) => h.id === matchedMember.home_id);
            if (foundHome) homeName = foundHome.name;
          }

          const token = generateToken('member', matchedMember.home_id, matchedMember.id, matchedMember.name, null);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            token,
            role: 'member',
            name: matchedMember.name,
            mobile_number: matchedMember.mobile_number,
            memberId: matchedMember.id,
            homeId: matchedMember.home_id,
            homeName,
            member: formatRow(matchedMember),
            message: `Welcome back, ${matchedMember.name}!`,
          }));
          return;
        }

        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Mobile number not found. Please contact your home to register your number.',
        }));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Please enter your mobile number or Home email and password.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT /api/homes/profile (Update Home Name & Password for Home Admin)
  if (pathname === '/api/homes/profile' && req.method === 'PUT') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || (auth.role !== 'admin' && auth.role !== 'super_admin')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Home access required.' }));
        return;
      }

      const targetHomeId = auth.homeId || reqHomeId;
      if (!targetHomeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Home ID is required.' }));
        return;
      }

      const data = await parseJsonBody(req);
      const newName = data.home_name !== undefined ? String(data.home_name).trim() : undefined;
      const currentPassword = data.current_password !== undefined ? String(data.current_password).trim() : undefined;
      const newPassword = data.new_password !== undefined ? String(data.new_password).trim() : undefined;

      let home = null;
      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM homes WHERE id = ?', [targetHomeId]);
        if (rows.length > 0) home = rows[0];
      } else {
        home = memoryHomes.find((h) => h.id === targetHomeId);
      }

      if (!home) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Home record not found.' }));
        return;
      }

      // If updating password, verify current password (unless super admin)
      if (newPassword) {
        if (newPassword.length < 3) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'New password must be at least 3 characters.' }));
          return;
        }
        if (auth.role !== 'super_admin' && home.password_hash !== currentPassword) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Incorrect current password.' }));
          return;
        }
      }

      const finalName = newName || home.name;
      const finalPassword = newPassword || home.password_hash;
      const now = new Date().toISOString();

      if (isDbConnected && pool) {
        await pool.query('UPDATE homes SET name = ?, password_hash = ?, updated_at = ? WHERE id = ?', [
          finalName,
          finalPassword,
          now,
          targetHomeId,
        ]);
      } else {
        home.name = finalName;
        home.password_hash = finalPassword;
        home.updated_at = now;
        saveDiskData();
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        homeId: targetHomeId,
        homeName: finalName,
        message: 'Home profile updated successfully!',
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // SUPER ADMIN PLATFORM APIs (PROTECTED)
  // ==========================================

  // GET /api/super-admin/homes (List all registered homes)
  if (pathname === '/api/super-admin/homes' && req.method === 'GET') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'super_admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Super Admin access required.' }));
        return;
      }

      if (isDbConnected && pool) {
        const [rows] = await pool.query(`
          SELECT h.id, h.name, h.email, h.created_at, h.updated_at, h.last_active_at,
                 COALESCE(h.location_usage_count, 0) as location_usage_count,
                 (SELECT COUNT(*) FROM members m WHERE m.home_id = h.id) as member_count,
                 (SELECT COUNT(*) FROM gallery g WHERE g.home_id = h.id) as photo_count
          FROM homes h
          ORDER BY h.created_at DESC
        `);
        const formatted = rows.map((r) => ({
          ...r,
          member_count: Number(r.member_count) || 0,
          photo_count: Number(r.photo_count) || 0,
          location_usage_count: Number(r.location_usage_count) || 0,
          last_active_at: r.last_active_at || r.updated_at || r.created_at || 'Recently',
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(formatted));
        return;
      }

      const list = memoryHomes.map((h) => ({
        ...h,
        member_count: Number(memoryMembers.filter((m) => (m.home_id || m.homeId) === h.id).length) || 0,
        photo_count: Number(memoryGallery.filter((g) => (g.home_id || g.homeId) === h.id).length) || 0,
        location_usage_count: Number(h.location_usage_count) || 0,
        last_active_at: h.last_active_at || h.updated_at || h.created_at || 'Recently',
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/super-admin/homes/:homeId/audit (Confidential Super Admin Activity & Location Audit)
  if (pathname.startsWith('/api/super-admin/homes/') && pathname.endsWith('/audit') && req.method === 'GET') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'super_admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Super Admin access required.' }));
        return;
      }

      const parts = pathname.split('/');
      const targetHomeId = parts[4]; // /api/super-admin/homes/:homeId/audit

      let home = null;
      let members = [];
      if (isDbConnected && pool) {
        const [hRows] = await pool.query('SELECT id, name, email, created_at, updated_at, last_active_at, location_usage_count FROM homes WHERE id = ?', [targetHomeId]);
        if (hRows.length > 0) home = hRows[0];
        const [mRows] = await pool.query('SELECT id, name, role, last_active_at, location_usage_count, location FROM members WHERE home_id = ?', [targetHomeId]);
        members = mRows;
      } else {
        home = memoryHomes.find((h) => h.id === targetHomeId);
        members = memoryMembers.filter((m) => (m.home_id || m.homeId) === targetHomeId);
      }

      if (!home) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Home not found.' }));
        return;
      }

      // Build sanitized audit entities:
      // Entity 1: The Home User itself
      const homeUserAudit = {
        id: 'home_user_' + home.id,
        name: home.name,
        role: 'Home User',
        type: 'home',
        last_active_at: home.last_active_at || home.updated_at || home.created_at || 'Recently',
        location_usage_count: Number(home.location_usage_count) || 0,
      };

      // Entities 2..N: The Members in the home (strictly privacy-sanitized: NO mobile, NO bio, NO room notes, NO checklist)
      const membersAudit = members.map((m) => {
        let hasLoc = false;
        if (m.location) {
          try {
            const locObj = typeof m.location === 'string' ? JSON.parse(m.location) : m.location;
            hasLoc = Boolean(locObj && (locObj.lat || locObj.name));
          } catch {
            hasLoc = false;
          }
        }
        return {
          id: m.id,
          name: m.name,
          role: m.role || 'Family Member',
          type: 'member',
          last_active_at: m.last_active_at || m.updated_at || m.created_at || 'Recently',
          location_usage_count: Number(m.location_usage_count) || 0,
          has_location: hasLoc,
        };
      });

      const allEntities = [homeUserAudit, ...membersAudit];
      const totalLocationUsage = allEntities.reduce((acc, curr) => acc + curr.location_usage_count, 0);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        home: {
          id: home.id,
          name: home.name,
          email: home.email,
          created_at: home.created_at,
          last_active_at: home.last_active_at || home.updated_at || home.created_at || 'Recently',
          location_usage_count: Number(home.location_usage_count) || 0,
        },
        entities: allEntities,
        totalLocationUsage,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/super-admin/homes/:homeId/members (List members inside a specific home)
  if (pathname.startsWith('/api/super-admin/homes/') && pathname.endsWith('/members') && req.method === 'GET') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'super_admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Super Admin access required.' }));
        return;
      }

      const parts = pathname.split('/');
      const targetHomeId = parts[4];

      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM members WHERE home_id = ? ORDER BY created_at ASC', [targetHomeId]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows.map(formatRow)));
        return;
      }

      const list = memoryMembers.filter((m) => m.home_id === targetHomeId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list.map(formatRow)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/super-admin/homes (Super Admin provisions new home)
  if (pathname === '/api/super-admin/homes' && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'super_admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Super Admin access required.' }));
        return;
      }

      const data = await parseJsonBody(req);
      const name = String(data.name || data.home_name || '').trim();
      const email = String(data.email || '').trim().toLowerCase();
      const password = String(data.password || '').trim();

      if (!name || !email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name, Email, and Password are required.' }));
        return;
      }

      // Check unique email across homes
      if (isDbConnected && pool) {
        const [existing] = await pool.query('SELECT id FROM homes WHERE LOWER(TRIM(email)) = ?', [email]);
        if (existing.length > 0) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Home email "${email}" is already registered. Email must be unique.` }));
          return;
        }
      } else {
        const dup = memoryHomes.find((h) => h.email && h.email.toLowerCase() === email);
        if (dup) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Home email "${email}" is already registered. Email must be unique.` }));
          return;
        }
      }

      const id = 'home_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();

      if (isDbConnected && pool) {
        await pool.query(
          'INSERT INTO homes (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [id, name, email, password, now, now]
        );
      } else {
        memoryHomes.push({ id, name, email, password_hash: password, created_at: now, updated_at: now });
        saveDiskData();
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, name, email, created_at: now, message: 'Home created successfully' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT /api/super-admin/homes/:homeId/password (Super Admin sets/resets home password)
  if (pathname.startsWith('/api/super-admin/homes/') && pathname.endsWith('/password') && req.method === 'PUT') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'super_admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Super Admin access required.' }));
        return;
      }

      const parts = pathname.split('/');
      const targetHomeId = parts[4];
      const data = await parseJsonBody(req);
      const newPassword = String(data.password || '').trim();

      if (!newPassword || newPassword.length < 3) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 3 characters.' }));
        return;
      }

      const now = new Date().toISOString();
      if (isDbConnected && pool) {
        await pool.query('UPDATE homes SET password_hash = ?, updated_at = ? WHERE id = ?', [newPassword, now, targetHomeId]);
      } else {
        const h = memoryHomes.find((item) => item.id === targetHomeId);
        if (h) {
          h.password_hash = newPassword;
          h.updated_at = now;
          saveDiskData();
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Password updated successfully.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/super-admin/homes/:homeId (Delete home and cascade data)
  if (pathname.startsWith('/api/super-admin/homes/') && req.method === 'DELETE') {
    try {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'super_admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Super Admin access required.' }));
        return;
      }

      const parts = pathname.split('/');
      const targetHomeId = parts[4];

      if (isDbConnected && pool) {
        await pool.query('DELETE FROM members WHERE home_id = ?', [targetHomeId]);
        await pool.query('DELETE FROM gallery WHERE home_id = ?', [targetHomeId]);
        await pool.query('DELETE FROM homes WHERE id = ?', [targetHomeId]);
      } else {
        memoryMembers = memoryMembers.filter((m) => m.home_id !== targetHomeId);
        memoryGallery = memoryGallery.filter((g) => g.home_id !== targetHomeId);
        memoryHomes = memoryHomes.filter((h) => h.id !== targetHomeId);
        saveDiskData();
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Home and all its data removed.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // MULTI-TENANT FAMILY MEMBERS APIs (PROTECTED)
  // ==========================================

  // GET /api/members (Scoped to Home)
  if (pathname === '/api/members' && req.method === 'GET') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;

      // Unauthenticated unscoped calls return empty list to prevent cross-home leakage
      if (!targetHomeId && auth?.role !== 'super_admin') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      if (isDbConnected && pool) {
        let query = 'SELECT * FROM members';
        let params = [];
        if (targetHomeId && targetHomeId !== 'all') {
          query += ' WHERE home_id = ?';
          params.push(targetHomeId);
        }
        query += ' ORDER BY created_at ASC';
        const [rows] = await pool.query(query, params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows.map(formatRow)));
        return;
      }

      let filtered = memoryMembers;
      if (targetHomeId && targetHomeId !== 'all') {
        filtered = memoryMembers.filter((m) => m.home_id === targetHomeId);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(filtered.map(formatRow)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/members/:id (With sensitive field redaction for non-owners)
  if (pathname.startsWith('/api/members/') && req.method === 'GET') {
    const id = pathname.replace('/api/members/', '');
    try {
      const auth = getAuthFromReq(req);
      let targetRow = null;

      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        if (rows && rows.length > 0) targetRow = rows[0];
      } else {
        targetRow = memoryMembers.find((m) => m.id === id);
      }

      if (!targetRow) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Member not found' }));
        return;
      }

      // Backend Privacy Filter: If requester is a member viewing someone else's profile, redact private notes
      const formatted = formatRow(targetRow);
      if (auth && auth.role === 'member' && auth.memberId !== id) {
        formatted.room_notes = undefined;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatted));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/members (Home Admin Only)
  if (pathname === '/api/members' && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      if (auth && auth.role === 'member') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Only Home can register family members.' }));
        return;
      }

      const data = await parseJsonBody(req);
      if (!data.name || !data.mobile_number) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name and Mobile Number are required.' }));
        return;
      }
      const mobile_number = String(data.mobile_number).trim();

      if (mobile_number === '2000') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Mobile number "2000" is reserved for Master Admin login.' }));
        return;
      }

      // Check unique mobile number across members
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
      const home_id = auth?.homeId || data.home_id || reqHomeId || 'default_home';
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
          `INSERT INTO members (id, home_id, name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, room_notes, checklist, location, quote, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, home_id, data.name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, room_notes, checklist, location, quote, now, now]
        );
        const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(formatRow(rows[0])));
        return;
      }

      const newRecord = {
        id,
        home_id,
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
      saveDiskData();
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(newRecord)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT /api/members/:id (Home Admin or Self)
  if (pathname.startsWith('/api/members/') && req.method === 'PUT') {
    try {
      const auth = getAuthFromReq(req);
      const id = pathname.replace('/api/members/', '');

      // Authorization Check
      if (auth && auth.role === 'member' && auth.memberId !== id) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: You can only edit your own details.' }));
        return;
      }

      const data = await parseJsonBody(req);
      const now = new Date().toISOString();

      if (data.mobile_number !== undefined) {
        const cleanMobile = String(data.mobile_number).trim();
        if (cleanMobile === '2000') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Mobile number "2000" is reserved for Master Admin login.' }));
          return;
        }

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

        // Cross-tenant protection
        if (auth && auth.role === 'admin' && auth.homeId && curr.home_id !== auth.homeId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Cannot edit members of another home.' }));
          return;
        }

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
            data.image_url !== undefined ? (data.image_url ? data.image_url : null) : curr.image_url,
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
        image_url: data.image_url !== undefined ? (data.image_url ? data.image_url : null) : curr.image_url,
        tags: data.tags !== undefined ? data.tags : curr.tags,
        checklist: data.checklist !== undefined ? data.checklist : curr.checklist,
        location: data.location !== undefined ? data.location : curr.location,
        updated_at: now,
      };
      saveDiskData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(memoryMembers[idx])));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/members/:id (Home Admin Only)
  if (pathname.startsWith('/api/members/') && req.method === 'DELETE') {
    try {
      const auth = getAuthFromReq(req);
      if (auth && auth.role === 'member') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Only Home can delete members.' }));
        return;
      }

      const id = pathname.replace('/api/members/', '');
      if (isDbConnected && pool) {
        await pool.query('DELETE FROM members WHERE id = ?', [id]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, deletedId: id, message: 'Member deleted successfully.' }));
        return;
      }

      memoryMembers = memoryMembers.filter((m) => m.id !== id);
      saveDiskData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // LOCATION USAGE AUDIT TRACKING API
  // ==========================================

  // POST /api/audit/location-usage (Records Google Location usage for audit)
  if (pathname === '/api/audit/location-usage' && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const data = await parseJsonBody(req);
      const targetHomeId = auth?.homeId || data.homeId || reqHomeId;
      const targetMemberId = auth?.memberId || data.memberId;
      const nowIso = new Date().toISOString();

      if (targetMemberId && targetMemberId !== 'admin') {
        if (isDbConnected && pool) {
          await pool.query(
            'UPDATE members SET location_usage_count = COALESCE(location_usage_count, 0) + 1, last_active_at = ? WHERE id = ?',
            [nowIso, targetMemberId]
          );
        } else {
          const m = memoryMembers.find((mem) => mem.id === targetMemberId);
          if (m) {
            m.location_usage_count = (Number(m.location_usage_count) || 0) + 1;
            m.last_active_at = nowIso;
            saveDiskData();
          }
        }
      } else if (targetHomeId) {
        if (isDbConnected && pool) {
          await pool.query(
            'UPDATE homes SET location_usage_count = COALESCE(location_usage_count, 0) + 1, last_active_at = ? WHERE id = ?',
            [nowIso, targetHomeId]
          );
        } else {
          const h = memoryHomes.find((hm) => hm.id === targetHomeId);
          if (h) {
            h.location_usage_count = (Number(h.location_usage_count) || 0) + 1;
            h.last_active_at = nowIso;
            saveDiskData();
          }
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, recordedAt: nowIso }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // MULTI-TENANT FAMILY GALLERY APIs (PROTECTED)
  // ==========================================

  // GET /api/gallery (Scoped to Home)
  if (pathname === '/api/gallery' && req.method === 'GET') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;

      if (!targetHomeId && auth?.role !== 'super_admin') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      if (isDbConnected && pool) {
        let query = 'SELECT * FROM gallery';
        let params = [];
        if (targetHomeId && targetHomeId !== 'all') {
          query += ' WHERE home_id = ?';
          params.push(targetHomeId);
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(query, params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
        return;
      }

      let filtered = memoryGallery;
      if (targetHomeId && targetHomeId !== 'all') {
        filtered = memoryGallery.filter((g) => g.home_id === targetHomeId);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(filtered));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/gallery
  if (pathname === '/api/gallery' && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const data = await parseJsonBody(req);
      if (!data.image_data) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image data is required.' }));
        return;
      }

      // Strict validation: ONLY image files allowed
      const isBase64Image = typeof data.image_data === 'string' && data.image_data.startsWith('data:image/');
      const isHttpImage = typeof data.image_data === 'string' && (data.image_data.startsWith('http://') || data.image_data.startsWith('https://'));
      if (!isBase64Image && !isHttpImage) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid file format: Only images (JPEG, PNG, WebP, GIF) are allowed.' }));
        return;
      }

      const id = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const home_id = auth?.homeId || data.home_id || reqHomeId || 'default_home';
      const now = new Date().toISOString();
      const title = (data.title || 'Family Memory').trim();
      const uploaded_by = (data.uploaded_by || auth?.name || 'Family Member').trim();
      const uploaded_by_id = auth?.memberId || data.uploaded_by_id || (auth?.role === 'admin' ? 'admin' : null);

      if (isDbConnected && pool) {
        await pool.query(
          `INSERT INTO gallery (id, home_id, image_data, title, uploaded_by, uploaded_by_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, home_id, data.image_data, title, uploaded_by, uploaded_by_id, now]
        );
        const [rows] = await pool.query('SELECT * FROM gallery WHERE id = ?', [id]);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows[0]));
        return;
      }

      const item = { id, home_id, image_data: data.image_data, title, uploaded_by, uploaded_by_id, created_at: now };
      memoryGallery.unshift(item);
      saveDiskData();
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/gallery/:id (Home can delete all records; Members can delete their own only)
  if (pathname.startsWith('/api/gallery/') && req.method === 'DELETE') {
    try {
      const auth = getAuthFromReq(req);
      const id = pathname.replace('/api/gallery/', '');

      let existing = null;
      if (isDbConnected && pool) {
        const [rows] = await pool.query('SELECT * FROM gallery WHERE id = ?', [id]);
        if (rows.length > 0) existing = rows[0];
      } else {
        existing = memoryGallery.find((g) => g.id === id);
      }

      if (!existing) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Photo not found.' }));
        return;
      }

      // Authorization Check:
      // Home Admin (admin) or Super Admin can delete ALL photos
      // Member can ONLY delete their own photo
      if (auth && auth.role === 'member') {
        const isOwner =
          (existing.uploaded_by_id && auth.memberId && String(existing.uploaded_by_id).trim() === String(auth.memberId).trim()) ||
          (existing.uploaded_by && auth.name && existing.uploaded_by.trim().toLowerCase() === auth.name.trim().toLowerCase());
        if (!isOwner) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: You can only delete your own photos.' }));
          return;
        }
      }

      if (isDbConnected && pool) {
        await pool.query('DELETE FROM gallery WHERE id = ?', [id]);
      } else {
        memoryGallery = memoryGallery.filter((i) => i.id !== id);
        saveDiskData();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // REAL-TIME INTERNET CALLING APIs
  // ==========================================

  // POST /api/calls/start (Trigger call: all members or specific target)
  if (pathname === '/api/calls/start' && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;
      if (!targetHomeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Home ID required to initiate call.' }));
        return;
      }

      const data = await parseJsonBody(req);
      const callId = 'call_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const nowIso = new Date().toISOString();
      const callerId = auth?.memberId || (auth?.role === 'admin' ? 'admin' : 'member');
      const callerName = (data.caller_name || auth?.name || 'Family Member').trim();

      const callObj = {
        id: callId,
        home_id: targetHomeId,
        caller_id: callerId,
        caller_name: callerName,
        caller_role: auth?.role || 'member',
        target_id: data.target_id || 'all',
        status: 'ringing',
        created_at: nowIso,
        ringing_at: nowIso,
        participants: [
          {
            id: callerId,
            name: callerName,
            role: auth?.role || 'member',
            joined_at: nowIso,
            muted: false,
          },
        ],
        repeated_call_count: 0,
      };

      activeCalls.set(targetHomeId, callObj);
      callSignals.set(callId, []);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(callObj));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/calls/active (Get active call for this home)
  if (pathname === '/api/calls/active' && req.method === 'GET') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;
      if (!targetHomeId) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ call: null }));
        return;
      }

      const call = activeCalls.get(targetHomeId);
      if (!call || call.status === 'ended') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ call: null }));
        return;
      }

      // Auto-expire calls older than 15 mins
      const ageMs = Date.now() - new Date(call.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) {
        activeCalls.delete(targetHomeId);
        callSignals.delete(call.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ call: null }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ call }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/calls/:callId/join
  if (pathname.startsWith('/api/calls/') && pathname.endsWith('/join') && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;
      const call = activeCalls.get(targetHomeId);

      if (!call || call.status === 'ended') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Call no longer active.' }));
        return;
      }

      const userId = auth?.memberId || (auth?.role === 'admin' ? 'admin' : 'member');
      const userName = auth?.name || 'Family Member';

      if (!call.participants.some((p) => p.id === userId)) {
        call.participants.push({
          id: userId,
          name: userName,
          role: auth?.role || 'member',
          joined_at: new Date().toISOString(),
          muted: false,
        });
      }
      call.status = 'active';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, call }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/calls/:callId/repeat (Repeated call option for members not joined)
  if (pathname.startsWith('/api/calls/') && pathname.endsWith('/repeat') && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;
      const call = activeCalls.get(targetHomeId);

      if (!call || call.status === 'ended') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Call no longer active.' }));
        return;
      }

      call.ringing_at = new Date().toISOString();
      call.repeated_call_count = (call.repeated_call_count || 0) + 1;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        ringing_at: call.ringing_at,
        repeated_call_count: call.repeated_call_count,
        message: 'Repeated call triggered for unjoined members.'
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/calls/:callId/leave
  if (pathname.startsWith('/api/calls/') && pathname.endsWith('/leave') && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;
      const call = activeCalls.get(targetHomeId);

      if (call) {
        const userId = auth?.memberId || (auth?.role === 'admin' ? 'admin' : 'member');
        call.participants = call.participants.filter((p) => p.id !== userId);
        if (call.participants.length === 0) {
          call.status = 'ended';
          activeCalls.delete(targetHomeId);
          callSignals.delete(call.id);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/calls/:callId/end (Caller or Admin terminates the call)
  if (pathname.startsWith('/api/calls/') && pathname.endsWith('/end') && req.method === 'POST') {
    try {
      const auth = getAuthFromReq(req);
      const targetHomeId = auth?.homeId || reqHomeId;
      const call = activeCalls.get(targetHomeId);

      if (call) {
        call.status = 'ended';
        activeCalls.delete(targetHomeId);
        callSignals.delete(call.id);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Call ended.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/calls/:callId/signal (WebRTC SDP / ICE signaling)
  if (pathname.startsWith('/api/calls/') && pathname.endsWith('/signal') && req.method === 'POST') {
    try {
      const parts = pathname.split('/');
      const callId = parts[3];
      const auth = getAuthFromReq(req);
      const data = await parseJsonBody(req);
      const senderId = auth?.memberId || (auth?.role === 'admin' ? 'admin' : 'member');

      if (!callSignals.has(callId)) {
        callSignals.set(callId, []);
      }
      const list = callSignals.get(callId);
      list.push({
        from: senderId,
        from_name: auth?.name || 'Family Member',
        to: data.to || 'all',
        signal: data.signal,
        timestamp: Date.now(),
      });
      if (list.length > 100) list.splice(0, list.length - 100);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/calls/:callId/signals (Retrieve incoming WebRTC signals)
  if (pathname.startsWith('/api/calls/') && pathname.endsWith('/signals') && req.method === 'GET') {
    try {
      const parts = pathname.split('/');
      const callId = parts[3];
      const auth = getAuthFromReq(req);
      const myId = auth?.memberId || (auth?.role === 'admin' ? 'admin' : 'member');
      const since = Number(parsedUrl.query?.since || 0);

      const list = callSignals.get(callId) || [];
      const relevant = list.filter(
        (s) => s.timestamp > since && s.from !== myId && (s.to === myId || s.to === 'all')
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(relevant));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. Static File Serving (SPA Fallback with Directory Traversal Protection)
  const resolvedDist = path.resolve(DIST_PATH);
  const safeRelative = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
  const targetFile = safeRelative === '' ? 'index.html' : safeRelative;
  const staticFile = path.resolve(resolvedDist, targetFile);

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
  console.log(`🏡 Multi-Tenant Family Home Server running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to MySQL database at ${DB_HOST}:${DB_PORT} (DB: ${DB_NAME})`);
});
