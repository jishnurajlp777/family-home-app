-- Family Home App - MySQL Database Schema
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
  UNIQUE KEY uq_member_mobile (mobile_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(64) PRIMARY KEY,
  image_data LONGTEXT NOT NULL,
  title VARCHAR(255) DEFAULT 'Family Memory',
  uploaded_by VARCHAR(255) DEFAULT 'Family Member',
  uploaded_by_id VARCHAR(64) DEFAULT NULL,
  created_at VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
