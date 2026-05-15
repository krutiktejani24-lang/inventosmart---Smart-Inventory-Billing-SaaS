# InventoSmart — GST Inventory & Billing SaaS

## Project Structure

```
smart-inventory-saas/
├── backend/          → Node.js + Express + Prisma (REST API)
├── frontend/         → React 18 + Vite + TailwindCSS
└── mobile/           → Flutter 3 + Riverpod (Android/iOS)
```

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env    # Fill in your values
npm install
npx prisma migrate dev
npm run dev
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Mobile
```bash
cd mobile
flutter pub get
flutter run
```
