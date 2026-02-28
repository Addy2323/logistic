# MHEMA Logistics Hosting Guide

This guide provides step-by-step instructions for hosting the MHEMA Logistics project on a Linux VPS (Ubuntu 22.04/24.04).

## 1. Server Preparation

Connect to your server via SSH and update the system:

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install Nginx & PM2
```bash
sudo apt install -y nginx
sudo npm install -g pm2
```

---

## 2. Database Setup

Switch to the postgres user and create the database:

```bash
sudo -i -u postgres
psql
```

Inside the PostgreSQL prompt:
```sql
CREATE DATABASE mhema_db;
CREATE USER mhema_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mhema_db TO mhema_user;
\q
exit
```

---

## 3. Backend Deployment

Clone your repository (or upload the files) to `/var/www/mhemalogistics`:

```bash
sudo mkdir -p /var/www/mhemalogistics
sudo chown $USER:$USER /var/www/mhemalogistics
cd /var/www/mhemalogistics/server
```

### Configure Environment
Create a `.env` file:
```bash
nano .env
```
Add the following (update with your actual values):
```env
DATABASE_URL="postgresql://mhema_user:your_secure_password@localhost:5432/mhema_db"
JWT_SECRET="your_random_secret_key"
PORT=5000
NODE_ENV=production
FRONTEND_URL="https://mhemalogistics.co.tz"
```

### Install and Start
```bash
npm install
mkdir -p uploads/avatars
npx prisma generate
npx prisma db push
pm2 start src/index.js --name "mhema-backend"
pm2 save
```

---

## 4. Frontend Deployment

Navigate to the root directory:
```bash
cd /var/www/mhemalogistics
```

### Configure Frontend Environment
Create a `.env` file in the root:
```bash
nano .env
```
Add:
```env
VITE_API_URL="https://mhemalogistics.co.tz/api"
```

### Build the Project
```bash
npm install
npm run build
```
This will create a `dist` folder.

---

## 5. Nginx Configuration

Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/mhemalogistics
```

Paste the following (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name mhemalogistics.co.tz;

    # Frontend Static Files
    location / {
        root /var/www/mhemalogistics/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io Support
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mhemalogistics /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. SSL Setup (HTTPS)

Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mhemalogistics.co.tz
```

Follow the prompts to enable HTTPS.

---

## 7. Maintenance Commands

- **Check Backend Logs**: `pm2 logs mhema-backend`
- **Restart Backend**: `pm2 restart mhema-backend`
- **Check Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
