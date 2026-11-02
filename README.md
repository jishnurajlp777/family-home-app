# 🏡 Family Home - Full-Stack React + TypeScript & MySQL

A private, collaborative family dashboard and mobile application built with **React 18**, **TypeScript**, **Vite**, **Capacitor (Android APK)**, and **Node.js** backed by **MySQL**.

---

## 📖 Documentation & Architecture
* **[Software Requirements Specification (SRS)](./docs/SRS.md)** — Complete module-wise requirements, RBAC matrix, and technical specs.
* **[SRS Version History](./docs/)** — Versioned specifications (`docs/v0.1/`, `docs/v0.2/`).
* **[MySQL Database Schema](./server/schema.sql)** — Multi-tenant database tables, constraints, and indexes.

---

## ✨ Features & Architecture

* **Multi-Tenant Architecture**: Supports Super Admin platform console, isolated Home Administrator accounts, and registered family members.
* **Authentication**: Dedicated Home Admin login with email/password, member access via registered phone numbers, and Super Admin master access.
* **Home Profile Settings**: Household Administrators can update their Home / Family Name and change passwords under Profile Settings.
* **Interactive Home Layout**: Visual cartoon home interface with members overview.
* **Personal Room Sanctuaries**: Each member manages their bio, daily status, personal scratchpad notes, and interactive to-do checklist.
* **Live Family Geolocation Map**: Real-time family member locations rendered with caricature pins using the Geolocation API.
* **Family Photo Memory Gallery**: Upload, browse, and manage shared family memories with lightbox previews.
* **Safe Member Management**: Full CRUD operations for family members scoped strictly to their respective home.
* **Cross-Platform Delivery**: Runs on web browsers (desktop and mobile) and compiles to a native Android APK (`releases/v1.0.0/FamilyHome.apk`).
* **Offline-First Resilience**: Transparent fallback to local storage cache whenever the backend database or network is offline.

---

## 📁 Project Directory Structure

```
home project--/
├── docs/                         <-- SRS Documents & Version History
│   ├── SRS.md                    <-- Current active Software Requirements Specification
│   ├── v0.1/SRS_v0.1.md          <-- Archived Version 0.1
│   └── v0.2/SRS_v0.2.md          <-- Archived Version 0.2
│
├── server/                       <-- Backend API Server Layer (Node.js + MySQL)
│   ├── server.js                 <-- REST API with session tokens, RBAC & persistence
│   ├── schema.sql                <-- Multi-tenant schema (homes, members, gallery)
│   ├── .env                      <-- Active environment variables
│   ├── .env.development          <-- Local developer configuration
│   └── .env.production           <-- Live cloud configuration
│
├── src/                          <-- Frontend TypeScript Application (React 18 + Vite)
│   ├── main.tsx                  <-- React DOM entry point
│   ├── App.tsx                   <-- Root routing, state & tenant session management
│   ├── types/
│   │   └── member.ts             <-- Core TypeScript interfaces & contracts
│   ├── services/
│   │   └── api.ts                <-- REST API client with Bearer tokens & offline fallback
│   └── components/               <-- UI Modules
│       ├── HomePage.tsx          <-- Main household dashboard
│       ├── MemberPage.tsx        <-- Member room sanctuary & checklist
│       ├── LoginScreen.tsx       <-- Universal 3-tab login & home registration
│       ├── HomeSettingsModal.tsx <-- Home profile & password change settings
│       ├── SuperAdminDashboard.tsx <-- Multi-tenant administration portal
│       ├── AddMemberModal.tsx    <-- Add family member modal
│       ├── EditProfileModal.tsx  <-- Edit member details modal
│       ├── FamilyGallery.tsx     <-- Photo memories gallery
│       ├── MembersMap.tsx        <-- Family live GPS radar map
│       ├── CartoonHome.tsx       <-- Interactive animated cartoon home illustration
│       ├── Caricature.tsx        <-- SVG avatar rendering
│       └── Toast.tsx             <-- Notification banner
│
├── android/                      <-- Capacitor Android Native Project
├── releases/                     <-- Packaged Release Binaries
│   └── v1.0.0/FamilyHome.apk     <-- Compiled native Android APK
├── scripts/                      <-- Utility & Deployment Automation Scripts
│   ├── build_apk.bat             <-- Android APK build pipeline
│   ├── push_to_github.bat        <-- Git commit & push helper
│   ├── login_github.bat          <-- GitHub CLI login helper
│   ├── start_server.bat          <-- Standalone backend server launcher
│   ├── start_public_live_tunnel.bat <-- Localtunnel worldwide test URL generator
│   └── setup_android_sdk.ps1     <-- Android SDK setup automation
│
├── start_dev.bat                 <-- 1-Click local development launcher (API + Vite)
├── index.html                    <-- Web entry HTML
├── vite.config.ts                <-- Vite build & reverse-proxy configuration
├── capacitor.config.ts           <-- Capacitor mobile configuration
├── tsconfig.json                 <-- TypeScript compiler configuration
└── package.json                  <-- NPM dependencies & build scripts
```

---

## 🚀 Quick Start (Local Developer Machine)

1. Double-click **`start_dev.bat`** to launch:
   * **Node.js API Server:** `http://localhost:3000`
   * **Vite Web Frontend:** `http://localhost:5173`
2. To compile the Android APK:
   * Run **`scripts/build_apk.bat`** (or `npm run cap:sync`).
