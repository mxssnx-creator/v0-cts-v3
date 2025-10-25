# Deployment Guide for Vercel

## Database Setup

This application requires a PostgreSQL database. **SQLite does not work on Vercel** due to the serverless architecture.

### Using Neon (Recommended)

1. Create a free account at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Vercel environment variables:
   \`\`\`
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   \`\`\`

### Database Schema

The application will automatically create tables on first run. The schema includes:
- `exchange_connections` - Exchange API connections
- `pseudo_positions` - Simulated trading positions
- `real_positions` - Actual exchange positions
- `system_settings` - Application configuration
- `logs` - System logging
- `errors` - Error tracking

### Environment Variables

Required in Vercel:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `NODE_ENV` - Set to `production`

### Deployment Steps

1. Push code to GitHub
2. Import project in Vercel
3. Add `DATABASE_URL` environment variable
4. Deploy

### Local Development

For local development, you can use SQLite:
\`\`\`bash
npm run dev
\`\`\`

The app will use SQLite locally and Neon in production.

---

## Self-Hosted Installation

### Quick Install (One Command)

Install CTS v3 on your own server with a single command:

**Using curl:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

**Using wget:**
\`\`\`bash
wget -qO- https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

This will automatically:
- Download the repository
- Detect your OS (Ubuntu 24/22, Debian, CentOS, etc.)
- Install all dependencies
- Configure remote PostgreSQL database
- Set up systemd services
- Start the application

### Supported Operating Systems

- Ubuntu 24.04 LTS (recommended)
- Ubuntu 22.04 LTS
- Debian 11/12
- CentOS/RHEL 8/9
- Other Linux distributions (generic support)

### Manual Installation

For detailed installation instructions, see [INSTALL.md](INSTALL.md).

**Quick steps:**
\`\`\`bash
# Download
git clone https://github.com/yourusername/cts-v3.git
cd cts-v3

# Install (automated)
./scripts/install-continuous.sh

# Or install (interactive)
./scripts/install.sh
\`\`\`

### Predefined Configuration

The quick installer uses these predefined settings:
- **Database:** PostgreSQL @ 149.33.11.224:5432/ctsv3
- **Port:** 3000
- **Default Password:** 00998877

Access after installation: `http://localhost:3000`

### Management Commands

After installation, use these commands:
\`\`\`bash
./start-cts.sh    # Start services
./stop-cts.sh     # Stop services
./status-cts.sh   # Check status
\`\`\`

For complete documentation, see [INSTALL.md](INSTALL.md).

---

## Vercel Deployment

### Using Neon (Recommended)

1. Create a free account at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Vercel environment variables:
   \`\`\`
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   \`\`\`

### Database Schema

The application will automatically create tables on first run. The schema includes:
- `exchange_connections` - Exchange API connections
- `pseudo_positions` - Simulated trading positions
- `real_positions` - Actual exchange positions
- `system_settings` - Application configuration
- `logs` - System logging
- `errors` - Error tracking

### Environment Variables

Required in Vercel:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `NODE_ENV` - Set to `production`

### Deployment Steps

1. Push code to GitHub
2. Import project in Vercel
3. Add `DATABASE_URL` environment variable
4. Deploy

### Local Development

For local development, you can use SQLite:
\`\`\`bash
npm run dev
\`\`\`

The app will use SQLite locally and Neon in production.
