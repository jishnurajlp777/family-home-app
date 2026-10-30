/**
 * Family Home Interface - Backend Server (Node.js + SQLite)
 * Uses native node:sqlite DatabaseSync (Node 22+) in ES Module mode
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'family.db');
const DIST_PATH = path.join(__dirname, '..', 'dist');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    caricature_key TEXT NOT NULL,
    image_url TEXT,
    mobile_number TEXT,
    role TEXT,
    bio TEXT,
    tags TEXT,
    room_title TEXT,
    room_desc TEXT,
    room_status TEXT,
    room_notes TEXT,
    checklist TEXT,
    location TEXT,
    quote TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id TEXT PRIMARY KEY,
    image_data TEXT NOT NULL,
    title TEXT,
    uploaded_by TEXT,
    created_at TEXT
  );
`);

try { db.exec('ALTER TABLE members ADD COLUMN image_url TEXT;'); } catch {}
try { db.exec('ALTER TABLE members ADD COLUMN mobile_number TEXT;'); } catch {}
try { db.exec('ALTER TABLE members ADD COLUMN room_notes TEXT;'); } catch {}
try { db.exec('ALTER TABLE members ADD COLUMN checklist TEXT;'); } catch {}
try { db.exec('ALTER TABLE members ADD COLUMN location TEXT;'); } catch {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      image_data TEXT NOT NULL,
      title TEXT,
      uploaded_by TEXT,
      created_at TEXT
    );
  `);
} catch {}

const DEFAULT_MEMBERS = [
  {
    id: "mem_jishnu",
    name: "Jishnu",
    mobile_number: "9876543210",
    caricature_key: "jishnu",
    role: "Tech Explorer",
    bio: "Curious tech explorer, loves coding cool tools, gaming, and late night coffee brews.",
    tags: JSON.stringify(["💻 Tech Lover", "☕ Coffee Fan", "🎮 Gamer"]),
    room_title: "Jishnu's Tech Den",
    room_desc: "Dual-monitor setup with warm ambient strip lighting, mechanical keyboards, and a comfy beanbag.",
    room_status: "Currently compiling code and listening to lo-fi beats.",
    quote: "Keep creating, keep questioning, and never stop building awesome things!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mem_ashna",
    name: "Ashna",
    mobile_number: "9876543211",
    caricature_key: "ashna",
    role: "Creative Artist",
    bio: "Creative mind, loves painting, cozy playlists, sweet treats, and family weekend trips.",
    tags: JSON.stringify(["🎨 Creative Artist", "🎵 Music Lover", "🧁 Baker"]),
    room_title: "Ashna's Art Haven",
    room_desc: "Sunlit room with fairy lights, watercolor sketches pinned on walls, and potted succulents.",
    room_status: "Sketching new designs and organizing pastel paints.",
    quote: "Add a splash of color to everyday moments.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mem_raju",
    name: "Raju",
    mobile_number: "9876543212",
    caricature_key: "raju",
    role: "Family Pillar & Reader",
    bio: "The family pillar! Enjoys morning newspaper walkabouts, gardening, and classic stories.",
    tags: JSON.stringify(["🌿 Green Thumb", "📰 Avid Reader", "🛠️ Master Fixer"]),
    room_title: "Raju's Study & Garden Porch",
    room_desc: "Comfortable rocking chair and vintage bookshelf overlooking the green front yard.",
    room_status: "Pruning the jasmine plants and tuning into evening radio.",
    quote: "Patience and hard work always bear the sweetest fruits.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mem_lalitha",
    name: "Lalitha",
    mobile_number: "9876543213",
    caricature_key: "lalitha",
    role: "Heart of Home & Chef",
    bio: "The warm heart of the home. Master of delicious feasts, kindness, and keeping everyone connected.",
    tags: JSON.stringify(["🍲 Master Chef", "🌸 Joy Spreader", "❤️ Heart of Home"]),
    room_title: "Lalitha's Cozy Sanctuary",
    room_desc: "Filled with family photo albums, soft handcrafted cushions, and aroma of sweet cardamom.",
    room_status: "Making evening snacks and sharing laughter on the phone.",
    quote: "A happy family is an earlier heaven.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Seed default members if table is empty
const countResult = db.prepare('SELECT COUNT(*) AS total FROM members').get();
if (countResult.total === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO members (id, name, mobile_number, caricature_key, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of DEFAULT_MEMBERS) {
    insertStmt.run(m.id, m.name, m.mobile_number, m.caricature_key, m.role, m.bio, m.tags, m.room_title, m.room_desc, m.room_status, m.quote, m.created_at, m.updated_at);
  }
  console.log('🌱 SQLite initialized with 4 default members.');
} else {
  // Ensure default members have mobile numbers populated
  try {
    db.prepare("UPDATE members SET mobile_number = '9876543210' WHERE id = 'mem_jishnu' AND (mobile_number IS NULL OR mobile_number = '')").run();
    db.prepare("UPDATE members SET mobile_number = '9876543211' WHERE id = 'mem_ashna' AND (mobile_number IS NULL OR mobile_number = '')").run();
    db.prepare("UPDATE members SET mobile_number = '9876543212' WHERE id = 'mem_raju' AND (mobile_number IS NULL OR mobile_number = '')").run();
    db.prepare("UPDATE members SET mobile_number = '9876543213' WHERE id = 'mem_lalitha' AND (mobile_number IS NULL OR mobile_number = '')").run();
  } catch {}
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
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
    tags = JSON.parse(row.tags || '[]');
  } catch (e) {
    tags = [];
  }
  let checklist = [];
  try {
    checklist = JSON.parse(row.checklist || '[]');
  } catch (e) {
    checklist = [];
  }
  let location = null;
  try {
    location = row.location ? JSON.parse(row.location) : null;
  } catch (e) {
    location = null;
  }
  return { ...row, tags, checklist, location };
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // GET /api/members
  if (pathname === '/api/members' && req.method === 'GET') {
    try {
      const rows = db.prepare('SELECT * FROM members ORDER BY created_at ASC').all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows.map(formatRow)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/members/:id
  if (pathname.startsWith('/api/members/') && req.method === 'GET') {
    const id = pathname.replace('/api/members/', '');
    const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!row) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Member not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(formatRow(row)));
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

      db.prepare(`
        INSERT INTO members (id, name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, mobile_number, caricature_key, image_url, role, bio, tags, room_title, room_desc, room_status, quote, now, now);

      const created = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(created)));
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
      const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
      if (!existing) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Member not found' }));
        return;
      }
      const data = await parseJsonBody(req);
      const now = new Date().toISOString();
      const tagsJson = data.tags ? JSON.stringify(data.tags) : existing.tags;
      const checklistJson = data.checklist !== undefined ? JSON.stringify(data.checklist) : existing.checklist;
      const locationJson = data.location !== undefined ? JSON.stringify(data.location) : existing.location;

      db.prepare(`
        UPDATE members SET
          name = ?, mobile_number = ?, caricature_key = ?, image_url = ?, role = ?, bio = ?, tags = ?,
          room_title = ?, room_desc = ?, room_status = ?, room_notes = ?, checklist = ?, location = ?, quote = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.name ?? existing.name,
        data.mobile_number !== undefined ? String(data.mobile_number).trim() : existing.mobile_number,
        data.caricature_key ?? existing.caricature_key,
        data.image_url !== undefined ? data.image_url : existing.image_url,
        data.role ?? existing.role,
        data.bio ?? existing.bio,
        tagsJson,
        data.room_title ?? existing.room_title,
        data.room_desc ?? existing.room_desc,
        data.room_status ?? existing.room_status,
        data.room_notes !== undefined ? data.room_notes : existing.room_notes,
        checklistJson,
        locationJson,
        data.quote ?? existing.quote,
        now,
        id
      );

      const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatRow(updated)));
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

      // 1. Admin login with mobile number 2000
      if (cleanPhone === '2000') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          role: 'admin',
          name: 'Admin',
          mobile_number: '2000',
          message: 'Welcome Admin!'
        }));
        return;
      }

      // 2. Member login by mobile number
      const row = db.prepare('SELECT * FROM members WHERE TRIM(mobile_number) = ? OR mobile_number = ?').get(cleanPhone, cleanPhone);
      if (row) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          role: 'member',
          name: row.name,
          mobile_number: row.mobile_number,
          memberId: row.id,
          member: formatRow(row),
          message: `Welcome back, ${row.name}!`
        }));
        return;
      }

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Mobile number not found. Enter "2000" for Admin or your registered member mobile number.'
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
      const rows = db.prepare('SELECT * FROM gallery ORDER BY created_at DESC').all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/gallery (Add images only)
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

      db.prepare(`
        INSERT INTO gallery (id, image_data, title, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, data.image_data, title, uploaded_by, now);

      const created = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(created));
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
      db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
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
      const countRow = db.prepare('SELECT COUNT(*) AS total FROM members').get();
      if (countRow.total <= 1) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Cannot delete: SQLite database requires at least 1 family record.' }));
        return;
      }

      const existing = db.prepare('SELECT name FROM members WHERE id = ?').get(id);
      const memberName = existing ? existing.name : 'Member';

      const result = db.prepare('DELETE FROM members WHERE id = ?').run(id);
      console.log(`🗑️ Deleted ${id} (${memberName}) from SQLite database. Changes: ${result.changes}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        deletedId: id,
        message: `Database Success: Member "${memberName}" removed successfully from database.`
      }));
    } catch (err) {
      console.error('Delete error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/reset
  if (pathname === '/api/reset' && req.method === 'POST') {
    db.exec('DELETE FROM members');
    const insertStmt = db.prepare(`
      INSERT INTO members (id, name, caricature_key, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of DEFAULT_MEMBERS) {
      insertStmt.run(m.id, m.name, m.caricature_key, m.role, m.bio, m.tags, m.room_title, m.room_desc, m.room_status, m.quote, m.created_at, m.updated_at);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Static File Serving (from ../dist if built, otherwise ../index.html)
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
      '.ico': 'image/x-icon'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(staticFile).pipe(res);
  } else if (fs.existsSync(path.join(DIST_PATH, 'index.html'))) {
    // Single Page Application (SPA) fallback
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(DIST_PATH, 'index.html')).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🏡 Family Home Server Running on http://localhost:${PORT}`);
  console.log(`💾 Database: SQLite (${DB_PATH})`);
});
