-- Family Home App - MySQL Database Schema & Initial Seed
-- Works on both Local MySQL (Developer Machine) and Cloud MySQL (Live)

CREATE DATABASE IF NOT EXISTS family_home_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_home_db;

-- 1. Members Table
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

-- 2. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(64) PRIMARY KEY,
  image_data LONGTEXT NOT NULL,
  title VARCHAR(255) DEFAULT 'Family Memory',
  uploaded_by VARCHAR(255) DEFAULT 'Family Member',
  created_at VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed Default Family Members (if not existing)
INSERT IGNORE INTO members (id, name, mobile_number, caricature_key, role, bio, tags, room_title, room_desc, room_status, quote, created_at, updated_at)
VALUES
(
  'mem_jishnu',
  'Jishnu',
  '9876543210',
  'jishnu',
  'Tech Explorer',
  'Curious tech explorer, loves coding cool tools, gaming, and late night coffee brews.',
  '["💻 Tech Lover", "☕ Coffee Fan", "🎮 Gamer"]',
  'Jishnu\'s Tech Den',
  'Dual-monitor setup with warm ambient strip lighting, mechanical keyboards, and a comfy beanbag.',
  'Currently compiling code and listening to lo-fi beats.',
  'Keep creating, keep questioning, and never stop building awesome things!',
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
),
(
  'mem_ashna',
  'Ashna',
  '9876543211',
  'ashna',
  'Creative Artist',
  'Creative mind, loves painting, cozy playlists, sweet treats, and family weekend trips.',
  '["🎨 Creative Artist", "🎵 Music Lover", "🧁 Baker"]',
  'Ashna\'s Art Haven',
  'Sunlit room with fairy lights, watercolor sketches pinned on walls, and potted succulents.',
  'Sketching new designs and organizing pastel paints.',
  'Add a splash of color to everyday moments.',
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
),
(
  'mem_raju',
  'Raju',
  '9876543212',
  'raju',
  'Family Pillar & Reader',
  'The family pillar! Enjoys morning newspaper walkabouts, gardening, and classic stories.',
  '["🌿 Green Thumb", "📰 Avid Reader", "🛠️ Master Fixer"]',
  'Raju\'s Study & Garden Porch',
  'Comfortable rocking chair and vintage bookshelf overlooking the green front yard.',
  'Pruning the jasmine plants and tuning into evening radio.',
  'Patience and hard work always bear the sweetest fruits.',
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
),
(
  'mem_lalitha',
  'Lalitha',
  '9876543213',
  'lalitha',
  'Heart of Home & Chef',
  'The warm heart of the home. Master of delicious feasts, kindness, and keeping everyone connected.',
  '["🍲 Master Chef", "🌸 Joy Spreader", "❤️ Heart of Home"]',
  'Lalitha\'s Cozy Sanctuary',
  'Filled with family photo albums, soft handcrafted cushions, and aroma of sweet cardamom.',
  'Making evening snacks and sharing laughter on the phone.',
  'A happy family is an earlier heaven.',
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
);
