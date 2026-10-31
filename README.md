# 🏡 Family Home - Full-Stack React + TypeScript & MySQL

A private, collaborative family dashboard and mobile application built with **React 18**, **TypeScript**, **Vite**, **Capacitor (Android APK)**, and **Node.js** backed by **MySQL**.

---

## 📖 Documentation
* **[Software Requirements Specification (SRS)](./docs/SRS.md)** — Complete module-wise requirements, RBAC matrix, and technical specs.
* **[MySQL Database Schema](./server/schema.sql)** — Database tables, constraints, and default family seed data.

---

## ✨ Features & Modules

* **Passwordless Mobile Login**: Secure access via registered mobile numbers with Admin master code (`2000`).
* **Interactive Home Layout**: Visual cartoon home interface with clickable rooms for each family member.
* **Personal Room Sanctuaries**: Each member can manage their bio, daily status, personal scratchpad notes, and interactive to-do checklist.
* **Live Family Geolocation Map**: Real-time family member locations rendered with caricature pins using the Geolocation API.
* **Family Photo Memory Gallery**: Upload, browse, and manage shared family memories with lightbox previews.
* **Safe Member Management**: Full CRUD operations for family members with safety guards (minimum 1 member constraint).
* **Cross-Platform Delivery**: Runs on web browsers (desktop and mobile) and compiles to a native Android APK (`FamilyHome.apk`).
* **Offline-First Resilience**: Transparent fallback to local browser cache whenever the backend or network is offline.

---

## 📁 Project Directory Structure

```
home project--/
├── docs/
│   └── SRS.md                    <-- Software Requirements Specification (Full Requirements)
│
├── server/                       <-- Backend API Server Layer
│   ├── server.js                 <-- Node.js REST API with mysql2 connection pool
│   ├── schema.sql                <-- MySQL schema & initial seed data
│   ├── .env                      <-- Active environment variables
│   ├── .env.development          <-- Local developer machine configuration
│   └── .env.production           <-- Live cloud configuration template
│
├── src/                          <-- Frontend TypeScript Application
│   ├── main.tsx                  <-- React DOM mount point
│   ├── App.tsx                   <-- Root routing & authentication state
│   ├── types/                    <-- TypeScript interfaces (FamilyMember, AuthUser, Gallery)
│   ├── services/api.ts           <-- REST API client with local cache fallback
│   └── components/               <-- UI Modules (Home, Rooms, Map, Gallery, Modals)
│
├── android/                      <-- Capacitor Android Native Project
├── start_dev.bat                 <-- 1-Click local development launcher
├── build_apk.bat                 <-- 1-Click Android APK build pipeline
├── push_to_github.bat            <-- 1-Click Git commit & push script
└── README.md                     <-- Project documentation overview
```

---

## 🚀 Quick Start (Local Developer Machine)

1. Double-click **`start_dev.bat`** to start:
   * **Node.js API Server:** `http://localhost:3000`
   * **Vite Web Frontend:** `http://localhost:5173`
2. To compile the Android APK:
   * Double-click **`build_apk.bat`** (generates `FamilyHome.apk`).
