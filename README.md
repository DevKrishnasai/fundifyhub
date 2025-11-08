# 🚀 FundifyHub

A comprehensive financial application built with modern technologies in a monorepo architecture. FundifyHub provides secure payment processing, real-time communications, background job processing, and a clean dashboard for financial data visualization.

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Setup for Docker Users](#-setup-for-docker-users)
- [Setup for Non-Docker Users](#-setup-for-non-docker-users)
- [General Commands](#-general-commands)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)

## 🎯 Project Overview

FundifyHub is a production-ready full-stack financial application that includes:

- **📱 Frontend**: Clean, minimal Next.js dashboard displaying financial data
- **🔗 API Backend**: RESTful API server with CORS-enabled endpoints and database integration
- **🌐 WebSocket Server**: Real-time communication capabilities for live updates
- **⚡ Job Worker**: Background processing for payments, notifications, and financial operations
- **🗄️ Database**: PostgreSQL with Prisma ORM for type-safe database access
- **🚀 Cache & Queue**: Redis for caching and reliable job queuing with BullMQ

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Modern utility-first CSS framework with shadcn/ui components
- **React Hook Form** - Performant form validation
- **Real-time Data** - Live dashboard with WebSocket integration

### Backend Services
- **Express.js** - Fast API server with CORS configuration
- **WebSocket** - Real-time bidirectional communication
- **BullMQ** - Redis-based job queue system for payment processing
- **Prisma ORM** - Type-safe database access with optimized logging
- **Centralized URLs** - Environment-based configuration for all services

### Database & Infrastructure
- **PostgreSQL 15** - Robust relational database
- **Redis 7** - In-memory data store for caching and queues
- **Docker** - Containerization for consistent environments

### Development Tools
- **Turbo** - High-performance monorepo build system with optimized caching
- **pnpm** - Fast, disk space efficient package manager with workspace support
- **ESLint & Prettier** - Code linting and formatting across all packages
- **TypeScript** - Static type checking with shared configurations
- **Enhanced Logging** - Colored console output with service-specific prefixes
- **Environment Management** - Centralized `.env` configuration for all services

## 🏗 Architecture
![WhatsApp Image 2025-09-23 at 15 41 56_05fa8a06](https://github.com/user-attachments/assets/e3770d3a-eb65-4b3f-b6f0-ccc7613ce4cb)

## 📋 Prerequisites (Windows)

### Required Software
- **Node.js**: Version 22 or higher
- **pnpm**: Version 10 or higher
- **Docker Desktop**: For Docker users only

### Install Prerequisites
1. **Node.js**: [Download Windows installer from nodejs.org](https://nodejs.org/)
2. **pnpm**: Open PowerShell as Administrator and run:
   ```powershell
   npm install -g pnpm@latest
   ```
3. **Docker Desktop** (Docker users only): [Download for Windows](https://www.docker.com/products/docker-desktop/)

### Verify Installation
```powershell
node --version    # Should be 22.x or higher
pnpm --version    # Should be 10.x or higher
docker --version  # For Docker users only
```

## � Setup for Docker Users

**Recommended approach** - Handles PostgreSQL and Redis automatically using Docker containers.

### Step 1: Clone Repository
```powershell
git clone https://github.com/DevKrishnasai/fundifyhub.git
cd fundifyhub
```

### Step 2: Install Dependencies
```powershell
pnpm install
```

### Step 3: Start Docker Services
```powershell
# Start PostgreSQL, Redis & RedisInsight containers
pnpm infra:up

# Verify containers are running
docker ps
```

### Step 4: Setup Environment
```powershell
# Copy environment template (uses Docker defaults)
Copy-Item .env.example .env
```

### Step 5: Setup Database
```powershell
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed with realistic sample data (recommended)
pnpm db:seed
```

**✅ Database will be seeded with sample data for testing**

### Step 6: Start Development
```powershell
# Start all services
pnpm dev
```

**✅ Your services are now running:**
- **Frontend Dashboard**: http://localhost:3000
- **API Backend**: http://localhost:3001/api/v1
- **WebSocket Server**: ws://localhost:3002
- **Redis Management UI**: http://localhost:5540 (RedisInsight)
- **Database UI**: Run `pnpm db:ui` to open Prisma Studio

---

## 🔧 Setup for Non-Docker Users

**Manual installation** - Install PostgreSQL and Redis directly on Windows.

### Step 1: Install PostgreSQL
1. Download [PostgreSQL 15+ for Windows](https://www.postgresql.org/download/windows/)
2. Run the installer with default settings
3. Remember the password you set for the `postgres` user
4. Ensure PostgreSQL service is running in Windows Services

### Step 2: Install Redis
1. Download [Redis for Windows](https://github.com/tporadowski/redis/releases)
2. Extract and install Redis
3. Start Redis server by running `redis-server.exe`

### Step 3: Install RedisInsight (Optional but Recommended)
RedisInsight provides a visual interface to manage Redis data, monitor performance, and debug BullMQ job queues.

**Option A: RedisInsight Desktop App (Recommended)**
1. Download [RedisInsight for Windows](https://redis.com/redis-enterprise/redis-insight/)
2. Run the installer and follow the setup wizard
3. Launch RedisInsight from Start Menu
4. Connect to your Redis instance:
   - **Host**: `localhost`
   - **Port**: `6379`
   - **Name**: `FundifyHub Redis`

**Option B: Redis CLI (Command Line)**
If you prefer command line, Redis CLI is included with Redis installation:
```powershell
# Test Redis connection
redis-cli ping  # Should return PONG

# View all keys
redis-cli keys "*"

# Monitor Redis activity
redis-cli monitor
```

**💡 Why RedisInsight is Helpful for FundifyHub:**
- **Job Queue Monitoring**: View BullMQ job queues, failed jobs, and processing statistics
- **Cache Management**: Monitor cached data from API responses and user sessions
- **Real-time Debugging**: Watch Redis operations as your application runs
- **Performance Insights**: Track memory usage and connection statistics

### Step 4: Create Database
```powershell
# Connect to PostgreSQL and create database
psql -U postgres -c "CREATE DATABASE fundifyhub;"
```

### Step 5: Clone and Install
```powershell
git clone https://github.com/DevKrishnasai/fundifyhub.git
cd fundifyhub
pnpm install
```

### Step 6: Configure Environment
```powershell
# Copy environment template
Copy-Item .env.example .env

# Edit .env file with your credentials:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/fundifyhub"
# REDIS_URL="redis://localhost:6379"
```

### Step 7: Setup Database
```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:seed  # Load realistic sample data
```

### Step 8: Start Development
```powershell
pnpm dev
```

**✅ Your services are now running:**
- **Frontend Dashboard**: http://localhost:3000
- **API Backend**: http://localhost:3001/api/v1
- **WebSocket Server**: ws://localhost:3002
- **Redis Management UI**: Launch RedisInsight app
- **Database UI**: Run `pnpm db:ui` to open Prisma Studio

---

## 🎮 General Commands

### Development Commands
```powershell
# Start all services in development mode
pnpm dev

# Start individual services
pnpm dev:frontend    # Next.js frontend only
pnpm dev:main        # Express API backend only
pnpm dev:sockets     # WebSocket server only  
pnpm dev:worker      # Background job worker only
```

### Database Commands
```powershell
pnpm db:generate     # Generate Prisma client from schema
pnpm db:migrate      # Run database migrations
pnpm db:seed         # Seed database with sample data
pnpm db:ui           # Open Prisma Studio (visual database browser)
pnpm db:reset        # Reset database schema and data
pnpm db:push         # Push schema changes without migrations
pnpm db:status       # Check migration status
pnpm db:deploy       # Deploy migrations (production)
```

### Docker Commands (Docker Users Only)
```powershell
pnpm infra:up        # Start PostgreSQL, Redis & RedisInsight containers
pnpm infra:down      # Stop containers
pnpm infra:logs      # View container logs
pnpm infra:reset     # Reset containers and data
```

### Build & Quality Commands
```powershell
pnpm build           # Build all packages
pnpm lint            # Run ESLint on all packages
pnpm format          # Format code with Prettier
pnpm format:check    # Check code formatting
```

## 📁 Project Structure

```
fundifyhub/
├── apps/                          # Applications
│   ├── frontend/                  # 📱 Next.js 15 dashboard (Port: 3000)
│   │   └── src/                  # 🎨 App router, components, contexts
│   ├── main-backend/             # 🔗 Express API server (Port: 3001)
│   │   └── src/                  # 📊 API routes, middleware, services
│   ├── live-sockets/             # 🌐 WebSocket server (Port: 3002)
│   └── job-worker/               # ⚡ Background job processor (BullMQ)
│       └── src/                  # � Email & WhatsApp workers
│
├── packages/                      # Shared packages
│   ├── logger/                   # 🎯 Logging utility
│   ├── prisma/                   # 🗄️ Database schema & client
│   │   ├── prisma/schema.prisma  # 📋 Database schema definition
│   │   └── prisma/seed.ts        # 🌱 Sample data seeding
│   ├── templates/                # 📨 Email & message templates
│   ├── types/                    # 🔷 Shared TypeScript types & constants
│   └── utils/                    # 🛠️ Shared utilities & queue client
│
├── infra/                        # Infrastructure
│   └── docker-compose.yml        # 🐳 PostgreSQL, Redis, RedisInsight
│
├── .env                          # 🔧 Centralized configuration
├── package.json                  # 📦 Root commands (db:*, dev:*, etc.)
├── turbo.json                    # 🚀 Monorepo build optimization
└── README.md                     # 📖 This enhanced guide
```

## 🔧 Environment Variables

### Default Configuration (.env)
```bash
# =============================================================================
# Application Configuration
# =============================================================================
NODE_ENV=development
LOG_LEVEL=info

# =============================================================================
# Database Configuration
# =============================================================================
DATABASE_URL="postgresql://user:pass@localhost:5432/fundifyhub"
SEED_USER_PASSWORD="Password123!"

# =============================================================================
# Redis Configuration  
# =============================================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL="redis://localhost:6379"

# =============================================================================
# Authentication & Security
# =============================================================================
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# =============================================================================
# Backend Services Configuration
# =============================================================================
# Main API Backend
API_PORT=3001
API_HOST=localhost

# CORS Configuration
FRONTEND_URL="http://localhost:3000"

# WebSocket Server
WS_PORT=3002

# =============================================================================
# Frontend Configuration (Next.js Public Variables)
# =============================================================================
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3002"
```

## 🔍 Troubleshooting (Windows)

### Common Issues

1. **Frontend Shows "Failed to fetch data from backend"**
   ```powershell
   # Check if backend is running and accessible
   curl.exe http://localhost:3001/api/v1/auth/health
   
   # Verify CORS configuration in main-backend/src/server.ts
   # Ensure .env has correct FRONTEND_URL and NEXT_PUBLIC_API_URL
   ```

2. **Database Connection Issues**
   ```powershell
   # For Docker users - check containers are running
   docker ps
   docker-compose -f infra/docker-compose.yml up -d

   # For manual setup - verify PostgreSQL service
   Get-Service postgresql*
   
   # Test database connection
   pnpm db:status
   ```

3. **Prisma Commands Not Working**
   ```powershell
   # Regenerate Prisma client
   pnpm db:generate
   
   # Check if .env DATABASE_URL is correct
   # For Docker: postgresql://user:pass@localhost:5432/fundifyhub
   # For manual: postgresql://postgres:YOUR_PASSWORD@localhost:5432/fundifyhub
   ```

4. **Port Already in Use**
   ```powershell
   # Check what's using the port
   netstat -ano | findstr :3001
   
   # Kill the process (replace PID with actual number)
   taskkill /PID 1234 /F
   ```

5. **No Colored Logs Visible**
   ```powershell
   # Set environment variables for color support
   $env:FORCE_COLOR="1"
   $env:COLORTERM="truecolor"
   
   # Then restart your applications
   pnpm dev
   ```

6. **Package Installation Issues**
   ```powershell
   # Clear cache and reinstall
   pnpm store prune
   Remove-Item -Recurse -Force node_modules
   pnpm install
   ```

### 🚀 **Quick Health Check**
```powershell
# Verify all services are working
curl.exe http://localhost:3001/api/v1/auth/health  # Backend health
curl.exe http://localhost:3000                     # Frontend (in browser)
redis-cli ping                                     # Redis connection
pnpm db:status                                     # Database status
```

### 📞 **Need Help?**
- Check the terminal logs for colored error messages
- Verify your `.env` file matches the template above
- Ensure all prerequisites are installed (Node.js 22+, pnpm 10+)
- For Docker users: make sure Docker Desktop is running

##  Contributing

For detailed coding guidelines and standards for this monorepo, please read [CONTRIBUTING.md](./CONTRIBUTING.md).

Key points for contributors and coding agents:
- All types and constants go in `@fundifyhub/types`
- Reusable utilities go in `@fundifyhub/utils`
- Follow TypeScript project reference structure
- Use `workspace:*` protocol for internal dependencies
- Run `pnpm build` to rebuild everything in correct order

