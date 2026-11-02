-- Family Home App - MySQL Database Schema (Multi-Tenant v0.2)
-- Works on both Local MySQL (Developer Machine) and Cloud MySQL (Live)

CREATE DATABASE IF NOT EXISTS family_home_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_home_db;

-- 1. Homes Table (Multi-Tenant Tier)
CREATE TABLE IF NOT EXISTS homes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at VARCHAR(64),
  updated_at VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Members Table (Scoped to Home)
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) PRIMARY KEY,
  home_id VARCHAR(64) NOT NULL DEFAULT 'default_home',
  name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(32) NOT NULL,
  caricature_key VARCHAR(64) NOT NULL DEFAULT 'boy',
  image_url LONGTEXT,
  role VARCHAR(255) DEFAULT 'Family Member',
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
  UNIQUE KEY uq_member_mobile (mobile_number),
  INDEX idx_member_home (home_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Gallery Table (Scoped to Home)
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(64) PRIMARY KEY,
  home_id VARCHAR(64) NOT NULL DEFAULT 'default_home',
  image_data LONGTEXT NOT NULL,
  title VARCHAR(255) DEFAULT 'Family Memory',
  uploaded_by VARCHAR(255) DEFAULT 'Family Member',
  uploaded_by_id VARCHAR(64) DEFAULT NULL,
  created_at VARCHAR(64),
  INDEX idx_gallery_home (home_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
