# 🔐 Tasty Shared Auth

A modern authentication management platform with role-based access control and real-time code synchronization , developed for Tasty Commpany.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase credentials to .env

# Start development server
npm run dev
```

## ✨ Features

- 🔑 **Role-based Access Control**
  - Admin: Full system access
  - Manager: Group management
  - User: View and copy codes

- 🔒 **Enhanced Security**
  - Two-factor authentication
  - Real-time code rotation
  - Row-level security
  - Audit logging

- 👥 **Team Management**
  - Create and manage groups
  - Share access securely
  - Real-time updates

## 🛠️ Built With

- React 18 + TypeScript
- Vite
- Tailwind CSS + Radix UI
- Supabase
- React Router v6

## 📖 Environment Setup

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_KEY=your_service_key
```

## 🚀 Deployment


```bash
# Build the app
npm run build

# Preview build
npm run preview
```

The `dist` folder contains static files ready for any hosting platform.

## 📁 Project Overview

```
src/
├── app/           # Core app configuration
├── components/    # React components
├── contexts/      # Global state management
├── lib/          # Utilities and services
└── routes/       # Application routes
```

## 📝 Available Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # Code linting
```

## 🌟 Production Notes

- Enable HTTPS
- Configure CORS in Supabase
- Set up database backups
- Monitor performance

## 📄 Developer
Felimar Salon (imfelmardotdev)
