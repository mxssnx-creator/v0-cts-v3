import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { host, port, username, password, dbName, dbUser, dbPassword } = await request.json()

    if (!host || !username || !password) {
      return NextResponse.json({ error: "Missing required SSH credentials" }, { status: 400 })
    }

    const installScript = `
#!/bin/bash
set -e

echo "Installing PostgreSQL..."
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

echo "Starting PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo "Creating database and user..."
sudo -u postgres psql <<EOF
CREATE DATABASE ${dbName || "trading_system"};
CREATE USER ${dbUser || "trading_user"} WITH ENCRYPTED PASSWORD '${dbPassword || "changeme"}';
GRANT ALL PRIVILEGES ON DATABASE ${dbName || "trading_system"} TO ${dbUser || "trading_user"};
\\c ${dbName || "trading_system"}
GRANT ALL ON SCHEMA public TO ${dbUser || "trading_user"};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser || "trading_user"};
EOF

echo "Configuring remote access..."
PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
echo "listen_addresses = '*'" | sudo tee -a /etc/postgresql/$PG_VERSION/main/postgresql.conf
echo "host all all 0.0.0.0/0 md5" | sudo tee -a /etc/postgresql/$PG_VERSION/main/pg_hba.conf

echo "Restarting PostgreSQL..."
sudo systemctl restart postgresql

echo "Installation complete!"
`

    // Return the script for the user to run manually
    // In a real implementation, you would use SSH2 library to execute remotely
    return NextResponse.json({
      success: true,
      message: "Installation script generated. Please run this on your remote server.",
      script: installScript,
      connectionString: `postgresql://${dbUser || "trading_user"}:${dbPassword || "changeme"}@${host}:5432/${dbName || "trading_system"}`,
    })
  } catch (error) {
    console.error("[v0] Remote PostgreSQL installation failed:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Installation failed" }, { status: 500 })
  }
}
