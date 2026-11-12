-- Family Home App - Enterprise MySQL Database Schema (Multi-Tenant v1.0)
-- Production Grade: Foreign Keys, Cascade Deletes, Scoped Compound Keys & Secure Hashing

CREATE DATABASE IF NOT EXISTS family_home_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_home_db;

-- 1. Homes Table (Multi-Tenant Tier)
CREATE TABLE IF NOT EXISTS homes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  noticeboard TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  location_usage_count INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Members Table (Scoped to Home with Cascade Delete and Scoped Phone Index)
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) PRIMARY KEY,
  home_id VARCHAR(64) NOT NULL DEFAULT 'default_home',
  name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(32) NOT NULL,
  pin_hash VARCHAR(255) DEFAULT NULL,
  caricature_key VARCHAR(64) NOT NULL DEFAULT 'boy',
  image_url TEXT,
  role VARCHAR(255) DEFAULT 'Family Member',
  family_role VARCHAR(64) DEFAULT 'Member',
  bio TEXT,
  tags JSON,
  room_title VARCHAR(255),
  room_desc TEXT,
  room_status TEXT,
  room_notes TEXT,
  checklist JSON,
  location JSON,
  quote TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  location_usage_count INT DEFAULT 0,
  CONSTRAINT fk_members_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_home_mobile (home_id, mobile_number),
  INDEX idx_member_home (home_id),
  INDEX idx_member_mobile (mobile_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Gallery Table (Scoped to Home with Disk-backed URL references)
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(64) PRIMARY KEY,
  home_id VARCHAR(64) NOT NULL DEFAULT 'default_home',
  image_data TEXT NOT NULL,
  title VARCHAR(255) DEFAULT 'Family Memory',
  uploaded_by VARCHAR(255) DEFAULT 'Family Member',
  uploaded_by_id VARCHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
  INDEX idx_gallery_home (home_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
