# PostgreSQL Migration Guide

## Overview
The Athlete Monitoring System has been migrated from SQLite to PostgreSQL for better scalability, concurrency, and production readiness.

## Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 16+ 
- npm or yarn

## Setup Instructions

### 1. Install PostgreSQL (if not already installed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### 2. Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE athlete_monitoring;
CREATE USER athlete_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE athlete_monitoring TO athlete_user;
\q
```

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=athlete_monitoring
DB_USER=athlete_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-random-string
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Server

```bash
npm run dev
```

The server will automatically:
- Connect to PostgreSQL
- Create all required tables
- Insert sample data (if database is empty)

## Key Changes from SQLite

### Code Changes:
1. **Connection Pool**: Using `pg.Pool` for connection pooling
2. **Async Queries**: All database queries are now async/await
3. **Parameterized Queries**: Using `$1, $2, $3` instead of `?`
4. **Transactions**: Using `BEGIN/COMMIT/ROLLBACK` for atomic operations
5. **Auto-increment**: Using `SERIAL` instead of `INTEGER PRIMARY KEY AUTOINCREMENT`
6. **RETURNING clause**: Getting inserted/updated rows directly

### Benefits:
- ✅ Better concurrency handling
- ✅ Connection pooling for performance
- ✅ ACID compliance with proper transactions
- ✅ Scalable for production use
- ✅ Better data types and constraints
- ✅ Advanced querying capabilities

## Default Credentials

After setup, you can login with:
- **Medical Staff**: medis@test.com / password123
- **Coach**: pelatih@test.com / password123

## Troubleshooting

### Connection Errors
- Ensure PostgreSQL service is running
- Check DB credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### Permission Errors
- Grant permissions: `GRANT ALL ON SCHEMA public TO athlete_user;`

### Port Already in Use
- Change PORT in `.env` or stop other services using port 5432

## Production Deployment

For production:
1. Use strong passwords and JWT secrets
2. Set `NODE_ENV=production`
3. Configure connection pool size based on expected load
4. Enable SSL for database connections
5. Set up database backups
6. Monitor connection pool usage
7. Use environment variables for all sensitive data
