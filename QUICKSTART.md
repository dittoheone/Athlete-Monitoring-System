# Athlete Monitoring System - Quick Start Guide

## One-Command Startup

After initial setup, you can start both frontend and backend with a single command:

```bash
npm run dev
```

This will simultaneously start:
- **Backend server** on http://localhost:5000
- **Frontend app** on http://localhost:5173

## Initial Setup (First Time Only)

### 1. Install All Dependencies
```bash
npm run install:all
```

This installs dependencies for the root, backend, and frontend in one command.

### 2. Set Up PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
docker run --name athlete-db \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=athlete_monitoring \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Local Installation**
- **Windows/macOS**: Download from [postgresql.org](https://www.postgresql.org/download/)
- **Ubuntu/Debian**: `sudo apt install postgresql postgresql-contrib`

### 3. Configure Environment
Create a `.env` file in the `backend` folder:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=athlete_monitoring
DB_USER=postgres
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
NODE_ENV=development
PORT=5000
```

### 4. Start the Application
```bash
npm run dev
```

The database tables will be created automatically on first run, and sample data will be seeded.

## Default Login Credentials

**Medical Staff:**
- Email: `medis@test.com`
- Password: `password123`

**Coach:**
- Email: `pelatih@test.com`
- Password: `password123`

## Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend (development) |
| `npm run server` | Start only the backend server |
| `npm run client` | Start only the frontend app |
| `npm run install:all` | Install all dependencies (root + backend + frontend) |

## Stopping the Application

Press `Ctrl+C` in the terminal to stop both servers simultaneously.

## Troubleshooting

**Port already in use?**
- Backend (5000): Change `PORT` in `backend/.env`
- Frontend (5173): Add `"dev": { "port": 3000 }` to `frontend/vite.config.js`

**Database connection error?**
- Verify PostgreSQL is running: `docker ps` or `sudo systemctl status postgresql`
- Check credentials in `backend/.env`
- Ensure database exists: `psql -U postgres -c "\l"`

**Dependencies missing?**
- Run `npm run install:all` again
