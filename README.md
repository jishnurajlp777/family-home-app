# 🏡 Family Home - Full-Stack React + TypeScript & SQLite

A modern, scalable multi-page application built with **React**, **TypeScript**, **Vite**, and **Node.js** with built-in native **SQLite** (`server/family.db`).

---

## ✨ Features & Architecture

* **Multi-Page Experience**: Selecting a family member from the dropdown or quick-tap avatars opens their **dedicated profile page** with full URL hash routing (`#member/:id`) and browser Back/Forward button support.
* **Modern Aesthetic**:
  - Interactive cartoon home illustration with chimney smoke and ambient floating animations.
  - Member showcase cards with personalized color themes matching each caricature style.
  - Interactive tabs: **About & Highlights**, **My Room Sanctuary**, and **Family Motto**.
  - Quick-switch family strip at the bottom of each member's page.
* **Strict Type Safety (`src/types/member.ts`)**: Strongly typed data contracts for all family members, inputs, and avatars.
* **Decoupled Service Layer (`src/services/api.ts`)**: Communicates with the SQLite server (`family.db`) with automatic `localStorage` offline fallback.
* **1-Click Modal Manager**: Add new family members, edit existing details, delete records, export the entire database as a JSON file, or restore seeds.

---

## 📁 Project Directory Structure

```
E:\my ai projects\family\
├── package.json              <-- Scripts, dependencies & metadata
├── tsconfig.json             <-- TypeScript strict compiler configuration
├── vite.config.ts            <-- Vite configuration with API proxy
├── index.html                <-- HTML entry point
├── start_dev.bat             <-- 1-Click development launcher
├── start_server.bat          <-- 1-Click production SQLite server launcher
├── README.md                 <-- Full documentation
│
├── server/                   <-- Backend Server Layer
│   ├── server.js             <-- REST API (Node.js native node:sqlite DatabaseSync)
│   └── family.db             <-- Persistent SQLite database file
│
└── src/                      <-- Frontend TypeScript Application
    ├── main.tsx              <-- React 18 DOM mount point
    ├── App.tsx               <-- Root app & URL hash router (Home vs Member page)
    ├── index.css             <-- Animations (smoke puff, float, pageSlideIn, wiggle)
    │
    ├── types/
    │   └── member.ts         <-- FamilyMember, CaricatureType, Input types
    │
    ├── services/
    │   └── api.ts            <-- FamilyService (SQLite REST API + localStorage)
    │
    └── components/
        ├── HomePage.tsx      <-- Front page with Cartoon Home, Dropdown & Avatar bubbles
        ├── MemberPage.tsx    <-- Dedicated full member page with hero banner & tabs
        ├── CartoonHome.tsx   <-- Cartoon house illustration with smoke animation
        ├── Caricature.tsx    <-- Dynamic SVG avatar renderer for all caricatures
        ├── ManageModal.tsx   <-- Unified modal (Add, Edit, Delete, Export JSON, Reset)
        └── Toast.tsx         <-- Notification toast feedback
```

---

## 🚀 How to Run the App

### Option A: 1-Click Dev Mode (Recommended)
Double-click [`start_dev.bat`](file:///E:/my%20ai%20projects/family/start_dev.bat) to launch both the SQLite backend (port 3000) and the hot-reloading Vite frontend (port 5173).

### Option B: From the Terminal
```bash
# 1. Start SQLite Backend
node server/server.js

# 2. In another terminal, start Vite frontend
npm run dev
```

### Option C: Production Build
```bash
npm run build
```
*(Verified: `tsc && vite build` compiles with **0 errors**).*
