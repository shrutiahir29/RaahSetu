# RAAHSETU - Production Deployment Guide

This guide provides step-by-step instructions to deploy **RAAHSETU** (AI-Powered Smart Traffic Management & Route Optimization for Nagpur) in production environments.

---

## 🏗️ Architecture Overview

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **Backend API**: Python 3.11 + FastAPI + SQLAlchemy + Uvicorn/Gunicorn (`backend/`)
- **ML Engine**: XGBoost Regressor + PyTorch/Scikit-Learn Time-Series Forecaster (`backend/app/ml/`)
- **Database**: SQLite (Default) or PostgreSQL (Production recommended)

---

## 🚀 Option 1: One-Click Docker Compose Deployment (Recommended)

Docker Compose bundles both the FastAPI backend server and Nginx frontend web server into containerized services.

### Step 1: Create `Dockerfile` in `backend/`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc g++ libgomp1 && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Step 2: Create `Dockerfile` in `frontend/`
```dockerfile
# Build Stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# Nginx Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Create `docker-compose.yml` in Root Directory
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./raahsetu.db
    restart: always

  frontend:
    build:
      context: ./frontend
      args:
        - VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

### Step 4: Run Containers
```bash
# Set your Google Maps API Key
export VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."

# Build and start services in background
docker compose up --build -d
```

Your application will be live at `http://your-server-ip/`.

---

## 🌐 Option 2: VPS / Cloud VM Deployment (AWS EC2 / DigitalOcean / GCP)

### Step 1: Server Setup (Ubuntu 22.04 LTS)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nodejs npm nginx git
```

### Step 2: Clone and Setup Backend
```bash
git clone https://github.com/your-username/RaahSetu.git /var/www/RaahSetu
cd /var/www/RaahSetu/backend

# Virtual Environment Setup
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Setup Systemd Service for FastAPI
Create `/etc/systemd/system/raahsetu-backend.service`:
```ini
[Unit]
Description=RAAHSETU FastAPI Backend Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/RaahSetu/backend
ExecStart=/var/www/RaahSetu/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable raahsetu-backend
sudo systemctl start raahsetu-backend
```

### Step 4: Build Frontend
```bash
cd /var/www/RaahSetu/frontend
npm install
VITE_GOOGLE_MAPS_API_KEY="AIzaSy..." npm run build
```

### Step 5: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/raahsetu`:
```nginx
server {
    listen 80;
    server_name your-domain.com; # Or your server IP

    # React Frontend
    location / {
        root /var/www/RaahSetu/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # FastAPI Backend Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable Nginx config & reload:
```bash
sudo ln -s /etc/nginx/sites-available/raahsetu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Secure with SSL (Certbot / Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## ☁️ Option 3: Free PaaS Deployment (Render + Vercel)

### Backend on Render (Render.com)
1. Sign up on [Render.com](https://render.com/).
2. Create a **New Web Service** pointing to your GitHub repo's `backend/` directory.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT`
5. Note your backend URL (e.g. `https://raahsetu-api.onrender.com`).

### Frontend on Vercel (Vercel.com)
1. Sign up on [Vercel.com](https://vercel.com/).
2. Import your GitHub repository, selecting the `frontend/` directory as the root.
3. Framework Preset: **Vite**.
4. Environment Variables:
   - `VITE_GOOGLE_MAPS_API_KEY`: Your Google Maps API Key.
   - `VITE_API_BASE_URL`: `https://raahsetu-api.onrender.com/api`
5. Click **Deploy**.

---

## 🔑 Post-Deployment Verification Checklist

- [ ] Open `https://your-domain.com/` and confirm Google Maps base layer loads cleanly.
- [ ] Test Level 1 (Commuter A $\rightarrow$ B): *Sitabuldi* $\rightarrow$ *MIHAN*.
- [ ] Test Level 2 (Planning Authority): Check City-Level Traffic Diversion Panel.
- [ ] Test Adaptive Signal Recommendations modal.
- [ ] Test Interactive What-If Simulator with `15%` diversion slider.
- [ ] Verify FastAPI docs at `https://your-domain.com/docs`.
