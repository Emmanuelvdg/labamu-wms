# AWS Deployment Guide for Labamu WMS

This guide describes how to deploy the Labamu WMS application on an AWS EC2 instance. It assumes a "manual" deployment approach which is suitable for testing, staging, and simple production environments.

## 1. Prerequisites

*   **AWS Account**: Access to the AWS Management Console.
*   **EC2 Instance**:
    *   **OS**: Ubuntu Server 22.04 LTS (recommended)
    *   **Type**: t3.medium or larger (needs at least 4GB RAM for building/running Node + DBs)
    *   **Storage**: 20GB+ gp3 EBS volume
*   **Security Group Rules**:
    *   Allow SSH (Port 22) from your IP.
    *   Allow HTTP (Port 80) from Anywhere (0.0.0.0/0).
    *   Allow HTTPS (Port 443) from Anywhere (0.0.0.0/0) (if setting up SSL).
*   **Domain Name** (Optional but recommended): Pointed to the EC2 Public IP.

## 2. Server Setup

SSH into your new EC2 instance:
```bash
ssh -i /path/to/key.pem ubuntu@<your-ec2-ip>
```

### 2.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential
```

### 2.2 Install Node.js (via NVM)
We will install Node.js v18 LTS or v20 LTS.
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
npm install -g npm@latest turbo pm2
```

### 2.3 Install Docker (for Database)
We will use Docker to run PostgreSQL and Redis, matching the development environment.
```bash
# Add Docker's official GPG key:
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Check it runs
sudo docker run hello-world

# Allow running docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

### 2.4 Install Nginx
Nginx will act as a reverse proxy, directing traffic from port 80 to your application.
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 3. Application Deployment

### 3.1 Transfer Files
Zip your local project root (excluding `node_modules`, `.next`, `dist`, `.git` to save space) and upload it to the server.

**From your local machine:**
```bash
# Zip the folder
zip -r labamu-ims.zip . -x "node_modules/*" ".next/*" "dist/*" ".git/*"

# Upload via SCP
scp -i /path/to/key.pem labamu-ims.zip ubuntu@<your-ec2-ip>:~/
```

**On the EC2 server:**
```bash
unzip labamu-ims.zip -d labamu-ims
cd labamu-ims
```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Configure Environment Variables
Create a production `.env` file. You can copy the example or create a new one.

```bash
# Copy example
cp .env.example .env

# Edit the file
nano .env
```

**Critical Variables to Update:**
*   `DATABASE_URL`: `postgresql://labamu:password@localhost:5432/labamu_ims?schema=public` (If using the docker-compose setup below)
*   `REDIS_URL`: `redis://localhost:6379`
*   `API_URL`: `http://<your-domain-or-ip>/api` (For the frontend to reach the backend via Nginx)
*   `NEXT_PUBLIC_API_URL`: Same as above.
*   `JWT_SECRET`: Set a secure random string.

### 3.4 Start Databases
Use the existing `docker-compose.yml` to start Postgres and Redis.

```bash
docker compose up -d
```

### 3.5 Database Migration
Apply the database schema.
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3.6 Build Application
Build both the frontend and backend.
```bash
# Build all apps via Turbo
npm run build
```

## 4. Process Management (PM2)

Use PM2 to keep your applications running in the background.

```bash
# Start Backend (NestJS)
pm2 start apps/api/dist/main.js --name "api" --interpreter node

# Start Frontend (Next.js)
cd apps/web
pm2 start npm --name "web" -- start -- -p 3000
cd ../..

# Save process list to restart on reboot
pm2 save
pm2 startup
# (Run the command output by pm2 startup)
```

## 5. Nginx Configuration

Configure Nginx to route traffic.

**Create config file:**
```bash
sudo nano /etc/nginx/sites-available/labamu
```

**Paste the following:**
(Replace `your-domain.com` with your domain or Public IP)

```nginx
server {
    listen 80;
    server_name your-domain.com; # Or your Public IP

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:3001; # NestJS API Port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Remove /api prefix if your backend doesn't expect it (Labamu backend handles /api prefix globally? Check main.ts)
        # If your NestJS global prefix is 'api', keep the path as is.
    }

    # Frontend Proxy
    location / {
        proxy_pass http://localhost:3000; # Next.js Port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/labamu /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default # Remove default config
sudo nginx -t # Test config
sudo systemctl restart nginx
```

## 6. Verification

1.  Open your browser and navigate to `http://<your-ip>`.
2.  You should see the Labamu WMS login page.
3.  Open Developer Tools (F12) -> Network tab.
4.  Try to login using the default admin credentials (if seeded).
5.  Verify requests to `/api/auth/login` are successful (200 OK or 201 Created).

## 7. Troubleshooting

*   **502 Bad Gateway**:
    *   Check if PM2 processes are running: `pm2 status`
    *   Check logs: `pm2 logs api` or `pm2 logs web`
*   **Database Connection Errors**:
    *   Ensure Docker containers are running: `docker ps`
    *   Check `DATABASE_URL` in `.env`.
*   **"API URL" Issues**:
    *   If frontend says "Network Error", ensure `NEXT_PUBLIC_API_URL` is set correctly in `.env` **before building** the frontend. Next.js inlines public env vars at build time. If you changed it, you must run `npm run build` again.
