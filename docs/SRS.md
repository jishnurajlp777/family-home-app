# 🏡 Family Home App — Software Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Project Name:** Family Home App (Web Application & Android APK)  
**Last Updated:** October 2026  
**Status:** Approved & Implemented  

---

## 1. Executive Summary & Objectives

### 1.1 Purpose
The **Family Home App** is a private, family-centric collaborative platform designed to keep household members connected. It combines real-time status updates, personal room management, interactive to-do checklists, live location sharing, and shared photo galleries in a secure, intuitive visual interface.

### 1.2 Core Design Principles
* **Privacy by Design:** Zero public discoverability; access restricted strictly to registered family mobile numbers.
* **Simplicity:** Passwordless login using recognized mobile phone numbers.
* **Offline-First Resilience:** Instant loading via local client storage caching, even during complete internet dropouts.
* **Cross-Platform Delivery:** Identical unified experience across web browsers (Desktop/Mobile) and native Android APK.

---

## 2. User Roles & Permission Matrix (RBAC)

| Feature / Action | Admin (`2000`) | Family Member (e.g., `9876543210`) |
| :--- | :---: | :---: |
| View Home Dashboard & Member Cards | ✅ Full Access | ✅ Full Access |
| View Personal Room Details | ✅ Any Member | 🔒 Own Room Only |
| Edit Bio, Room Notes & Personal Checklist | ✅ Any Member | 🔒 Own Room Only |
| Update Live GPS Location | ✅ Any Member | 🔒 Own Location Only |
| Add New Family Members | ✅ Yes | ❌ No |
| Delete Family Members | ✅ Yes *(Min 1 guard)* | ❌ No |
| Upload Photos to Family Gallery | ✅ Yes | ✅ Yes |
| Delete Family Gallery Photos | ✅ Yes | ✅ Yes *(Own uploads)* |
| Change Backend API / Server Settings | ✅ Yes | ✅ Yes |
| Reset Database / Export JSON Data | ✅ Yes | ❌ No |

---

## 3. Module-Wise Functional Requirements

### Module 1: Authentication & Access Control
* **REQ-1.1 (Mobile Login):** System authenticates users by verifying their 10-digit mobile number against the database.
* **REQ-1.2 (Master Admin Bypass):** Entering the code `2000` grants full administrative access.
* **REQ-1.3 (Session Persistence):** Active session persists in `localStorage` (`family_home_auth_user_v1`) to prevent re-login prompts on refresh.
* **REQ-1.4 (Logout):** Clears session data and routes user back to the login interface.

### Module 2: Home Dashboard & House Layout
* **REQ-2.1 (Active User Indicator):** Displays user identity pill (👑 Admin or 👤 Member Name + Phone) and database health status pill.
* **REQ-2.2 (Interactive Cartoon Home):** Visual representation of the household with interactive windows linking directly to each member's room.
* **REQ-2.3 (Member Grid):** Cards showing each family member with caricature avatars, role tags, and current room status.

### Module 3: Personal Room & Profile Management
* **REQ-3.1 (Profile Customization):** Modifiable name, avatar caricature, role title, bio, and quote.
* **REQ-3.2 (Room Status & Notes):** Real-time status snippet and a personal room notepad.
* **REQ-3.3 (Room Checklist / Tasks):** Interactive checklist allowing members to add tasks, toggle completion states, and delete items.

### Module 4: Live Family Geolocation & Map (`MembersMap`)
* **REQ-4.1 (Interactive Map):** Visual map rendering family member locations using custom caricature marker pins.
* **REQ-4.2 (Location Data):** Stores address, place label, coordinates (`lat`, `lng`), and last updated timestamp.
* **REQ-4.3 (Update Location):** One-click button utilizing the HTML5 Geolocation API (`navigator.geolocation`).

### Module 5: Family Photo Memory Gallery (`FamilyGallery`)
* **REQ-5.1 (Photo Uploads):** Allows uploading family images with memory captions and uploader attribution.
* **REQ-5.2 (Lightbox View):** Responsive gallery grid with modal viewer for full-resolution inspection.
* **REQ-5.3 (Deletion):** Allows removal of memories with immediate synchronization.

### Module 6: Family Administration & Member CRUD
* **REQ-6.1 (Add Member):** Form to register new members with validation against duplicate phone numbers.
* **REQ-6.2 (Edit Member):** Comprehensive modal to update member information.
* **REQ-6.3 (Safe Deletion Guard):** Minimum 1 member constraint prevents deleting the entire family record base.
* **REQ-6.4 (Data Backup & Reset):**
  * One-click JSON export of the entire database for local safekeeping.
  * One-click reset to factory defaults (4 default family members).

### Module 7: In-App Connection Settings (`DatabaseSettingsModal`)
* **REQ-7.1 (Health Diagnostics):** Probes `/api/health` to indicate if the backend and MySQL are reachable.
* **REQ-7.2 (API Endpoint Switcher):** Allows changing the API endpoint directly from the UI (useful when testing mobile APK against a local PC IP or cloud URL).

---

## 4. Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT LAYER (FRONTEND)              │
│  - Web: React 18 + TypeScript + Vite + Tailwind CSS    │
│  - Mobile: Capacitor 8.6 Android (Java/Gradle APK)     │
│  - Offline Cache: Browser LocalStorage / IndexedDB     │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / HTTP)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND API LAYER                    │
│  - Runtime: Node.js (v20+ ES Modules)                  │
│  - Server: Native HTTP + mysql2 Connection Pooling     │
│  - Resiliency: Safe Mode In-Memory Fallback            │
└───────────────────────────┬────────────────────────────┘
                            │ TLS / SSL Port 3306 or 4000
                            ▼
┌────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                       │
│  - Engine: MySQL 8.0 / TiDB Cloud Serverless           │
│  - Character Set: utf8mb4 (Full Emoji & Unicode)       │
│  - Schema: Auto-migrated via server/schema.sql         │
└────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema Specifications

### Table: `members`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(64) | PRIMARY KEY | Unique ID (e.g., `mem_jishnu`) |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `mobile_number` | VARCHAR(32) | NOT NULL | Authentication phone number |
| `caricature_key`| VARCHAR(64) | DEFAULT 'boy' | Avatar caricature identifier |
| `image_url` | LONGTEXT | NULL | Custom photo URL or data URI |
| `role` | VARCHAR(255) | DEFAULT 'Member' | Role title |
| `bio` | TEXT | NULL | Biography narrative |
| `tags` | JSON | NULL | Array of tag strings |
| `room_title` | VARCHAR(255) | NULL | Room headline |
| `room_desc` | TEXT | NULL | Room description |
| `room_status` | TEXT | NULL | Daily status message |
| `room_notes` | TEXT | NULL | Personal notepad content |
| `checklist` | JSON | NULL | Array of `{ id, text, completed }` |
| `location` | JSON | NULL | Object: `{ name, address, lat, lng, updated_at, status }` |
| `quote` | TEXT | NULL | Inspirational quote |
| `created_at` | VARCHAR(64) | NULL | ISO creation timestamp |
| `updated_at` | VARCHAR(64) | NULL | ISO last-modified timestamp |

### Table: `gallery`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(64) | PRIMARY KEY | Unique image identifier |
| `image_data` | LONGTEXT | NOT NULL | Image base64 string or asset URL |
| `title` | VARCHAR(255) | DEFAULT 'Memory' | Caption/title |
| `uploaded_by` | VARCHAR(255) | DEFAULT 'Family' | Name of uploader |
| `created_at` | VARCHAR(64) | NULL | ISO creation timestamp |

---

## 6. Non-Functional Requirements (NFR)

1. **Availability & Offline Resilience:** Zero crashing on network failure; automatic fallback to local cache.
2. **Performance:** Frontend initial bundle < 250 KB; mobile APK < 5 MB; API query times < 150ms.
3. **Security:** Secure credentials storage in `.env` (never committed to version control); encrypted TLS/SSL communication with cloud MySQL.
4. **Maintainability:** Full TypeScript type contracts across all models and API calls.
