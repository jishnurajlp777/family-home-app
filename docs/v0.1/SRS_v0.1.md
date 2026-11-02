# 🏡 Family Home App — Software Requirements Specification (SRS)
## Version 0.1 (Single-Tenant Baseline)

**Document Version:** 0.1.0 (Archived Baseline)  
**Project Name:** Family Home App (Web Application & Android APK)  
**Last Updated:** October 2026  
**Status:** Archived Baseline  

---

## 1. Executive Summary & Objectives

### 1.1 Purpose
The **Family Home App** is a private, family-centric collaborative platform designed to keep household members connected. It combines real-time status updates, personal room management, interactive to-do checklists, live location sharing, and shared photo galleries in a secure, intuitive visual interface.

### 1.2 Core Design Principles
* **Privacy by Design:** Zero public discoverability; access restricted strictly to registered family mobile numbers.
* **Master Admin Control:** One master administrative user authenticated via phone number `2000`. No initial default members; records are added dynamically by the Admin.
* **Real-Time Cross-Device Synchronization:** Updates to member details, statuses, checklists, or memories reflect simultaneously across all active client apps.
* **Offline-First Resilience:** Instant loading via local client storage caching, even during complete internet dropouts.
* **Cross-Platform Delivery:** Unified experience across web browsers and native Android APK with native back-button exit confirmation.

---

## 2. User Roles & Permission Matrix (RBAC)

| Feature / Action | Admin (`2000`) | Family Member (Registered Phone) |
| :--- | :---: | :---: |
| Built-in Default User | ✅ Yes (Mobile: `2000`) | ❌ No (Added by Admin) |
| View Home Dashboard & Member Cards | ✅ Full Access | ✅ Full Access |
| View All Members' GPS Location on Home Map | ✅ Full Access | ✅ Full Access |
| Update Personal Live GPS Location | ✅ Yes | ✅ Yes (Own Location) |
| View Personal Room Details | ✅ Any Member | 🔒 Own Room Only |
| Edit Bio, Room Notes & Personal Checklist | ✅ Any Member | 🔒 Own Room Only |
| Add New Family Members | ✅ Yes | ❌ No |
| Delete Family Members | ✅ Yes | ❌ No |
| Upload Photos to Family Gallery | ✅ Yes | ✅ Yes |
| Delete Family Gallery Photos | ✅ Yes | ✅ Yes (Own uploads) |
| In-App API / Database Settings | ✅ Yes | ✅ Yes |

---

## 3. Module-Wise Functional Requirements

### Module 1: Authentication & Session Management
* **REQ-1.1 (Master Admin Account):** The system provides one built-in master Admin user accessible by typing phone number `2000`.
* **REQ-1.2 (Dynamic Family Member Login):** Family members log in using their registered mobile phone numbers (assigned by Admin during creation). No hardcoded default member accounts exist.
* **REQ-1.3 (Persistent Login Session):** Authentication tokens/user records remain saved in local client storage across app closures. Reopening the app or returning to the browser bypasses the login screen directly into the Home Dashboard.
* **REQ-1.4 (Explicit Logout):** Clears authentication credentials from local storage and routes the user back to the login interface.

### Module 2: Home Dashboard & House Layout
* **REQ-2.1 (Active User Indicator & Header):** Clean header displaying the "Our Family Home" brand and active user identity pill (👑 Admin or 👤 Member Name + Phone) alongside the Logout action.
* **REQ-2.2 (Interactive Cartoon Home):** Visual representation of the household with dynamic member statistics and animated interactivity.
* **REQ-2.3 (Member Grid & Empty State):**
  * Displays member cards with caricatures, role tags, and room status, with a unified "Tap to open profile" prompt for all user types.
  * When no family members are yet registered, shows a clean empty state card inviting the Admin to add the first family member.

### Module 3: Personal Room & Profile Management (`MemberPage`)
* **REQ-3.1 (Focused Two-Tab Layout):** Profile view is strictly focused on:
  * Tab 1: **Personal Story & About** (Bio, role, quote, registered mobile number).
  * Tab 2: **My Room Sanctuary** (Room description, daily status, personal notepad, and to-do checklist).
  * *(Location tab is removed from the profile view, as GPS tracking is centralized on the Home Page)*.
* **REQ-3.2 (Single Arrow Navigation):** Back to Home button displays a clean single arrow icon (`Back to Home`).
* **REQ-3.3 (Room Checklist / Tasks):** Interactive checklist allowing members to add tasks, toggle completion states, and delete items.

### Module 4: Live Family Geolocation & Central Map (`MembersMap`)
* **REQ-4.1 (Universal Location Visibility):** Every logged-in user (Admin and family members) has full access to view all members' reported locations directly on the Home Page Google Location Tile.
* **REQ-4.2 (Interactive Google Maps Integration):** Embedded live Google Maps view with selectable quick-pins for each family member.
* **REQ-4.3 (One-Click "Update My Location"):** Prominent button directly on the map tile that queries device GPS (`navigator.geolocation`) and immediately broadcasts the updated coordinates to the database.

### Module 5: Real-Time Cross-Device Synchronization
* **REQ-5.1 (Instant Data Sync):** Background synchronization loop running at 2.5-second intervals automatically polls the backend API and synchronizes `localStorage` storage events.
* **REQ-5.2 (Immediate UI Reflection):** When any family member updates their name, mobile number, room status, notes, or checklist on any device, the change reflects simultaneously on all other users' screens without requiring a manual page refresh.
* **REQ-5.3 (Active Session Re-alignment):** If an Admin or member changes an active user's details, the active session in that user's app updates dynamically.

### Module 6: Mobile App Lifecycle & Redirection
* **REQ-6.1 (Hardware Back Button Handling):** In the Android APK (via `@capacitor/app`), pressing the physical/system back button on child screens (modals, profile view) navigates back to the Home Dashboard.
* **REQ-6.2 (Exit Confirmation Popup):** Pressing the back button on the Home Dashboard triggers a confirmation dialog:
  * *"Do you want to close the app? Your login session will be kept safe when you reopen."*
  * Options: **[Cancel]** and **[Close App]**.
* **REQ-6.3 (Clean Application Exit):** Clicking **[Close App]** invokes native exit (`CapApp.exitApp()`).

### Module 7: Family Administration & Member CRUD
* **REQ-7.1 (Add Member):** Admin registers new family members with Name, Mobile Number, Role, Room details, and Caricature avatar.
* **REQ-7.2 (Edit Member):** Admin can modify any profile; members can modify their own details.
* **REQ-7.3 (Zero-Member Tolerance):** The system permits deleting all members (down to 0 members), with Admin `2000` remaining as the administrative custodian.
* **REQ-7.4 (Identity & Uniqueness Integrity):** The database enforces a `UNIQUE` constraint on `mobile_number`. Backend APIs strictly reject registrations attempting to use phone `2000` (reserved for Admin) or numbers already claimed by existing members.

### Module 8: Family Photo Memory Gallery (`FamilyGallery`)
* **REQ-8.1 (Photo Uploads):** Allows uploading family images with memory captions and dual attribution (`uploaded_by` display name and durable `uploaded_by_id`).
* **REQ-8.2 (Lightbox View):** Responsive gallery grid with modal viewer for full-resolution inspection.
* **REQ-8.3 (Ownership & Deletion Rules):** Admins can delete any photo; members can delete their own uploaded photos even if their display name is later edited.

---

## 4. Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT LAYER (FRONTEND)              │
│  - Web: React 18 + TypeScript + Vite + Tailwind CSS    │
│  - Mobile: Capacitor 8.6 Android (Java/Gradle APK)     │
│  - App Lifecycle: @capacitor/app Back Button & Exit    │
│  - Real-Time Engine: 2.5s Active Sync & Storage Events │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / HTTP)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND API LAYER                    │
│  - Runtime: Node.js (v20+ ES Modules)                  │
│  - Server: Native HTTP + mysql2 Connection Pooling     │
│  - Security: Path Traversal Protection & 15MB DoS Cap  │
│  - Resiliency: Safe Mode In-Memory Fallback            │
└───────────────────────────┬────────────────────────────┘
                            │ TLS / SSL Port 3306 or 4000
                            ▼
┌────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                       │
│  - Engine: MySQL 8.0 / TiDB Cloud Serverless           │
│  - Character Set: utf8mb4 (Full Emoji & Unicode)       │
│  - Packet Size: 64MB max_allowed_packet                │
│  - Tables: members (dynamic, unique phone), gallery    │
└────────────────────────────────────────────────────────┘
```

---

## 5. Non-Functional Requirements (NFR)

1. **Local-First Staging:** All modifications and feature iterations are tested and validated strictly on the local developer environment before any production/remote push.
2. **Session Durability:** Closing or terminating the mobile app does not invalidate the user's login state.
3. **Data Integrity:** Strict input sanitization, database unique constraints, and prevention of administrative credential collisions.
4. **API & File Security:** Strict containment checks preventing static file traversal attacks outside web roots, and 15MB bounded request stream limits against DoS memory exhaustion.
