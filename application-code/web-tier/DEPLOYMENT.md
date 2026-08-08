# TechStore Web-Tier Deployment Guide

This guide provides clear, step-by-step instructions for running and deploying the **TechStore Frontend (Web-Tier)** in both **Local Development** (Windows/Linux) and **AWS EC2 Production** environments.

---

## Architecture Overview

The Web-Tier is built using **React 18** and operates differently per environment:

| Environment | Mode | Serving Mechanism | API Request Routing |
|---|---|---|---|
| **Local Dev** | Development | React Dev Server (`localhost:3000`) | CRA Proxy (`"proxy": "http://127.0.0.1:4000"`) |
| **AWS Production** | Production | Nginx serving static bundle (`build/`) | Nginx `proxy_pass` to Internal Load Balancer |

---

## 1. Local Development (Windows & Linux)

### **Prerequisites**
- **Node.js**: v20.0.0 or higher (`node -v`)
- **App-Tier**: Express backend running on `http://localhost:4000`

---

### **Step-by-Step Local Setup**

#### **Step 1: Navigate to Web-Tier**
```bash
cd application-code/web-tier
```

#### **Step 2: Install Dependencies**
```bash
npm install
```

#### **Step 3: Start React Development Server**
- **Linux / Mac**:
  ```bash
  npm start
  ```
- **Windows (PowerShell)** *(if host check warning occurs)*:
  ```powershell
  $env:DANGEROUSLY_DISABLE_HOST_CHECK="true"; npm start
  ```

The React app will open automatically at **`http://localhost:3000`**.

---

## 2. AWS EC2 Production Deployment

### **Prerequisites & Architecture**
1. **EC2 Instance**: Amazon Linux 2023 in a public subnet attached to the External ALB (or standalone).
2. **Internal ALB**: Internal Load Balancer routing API traffic to the App-Tier.

---

### **Step-by-Step Production Setup**

#### **Step 1: Install Node.js 20 & Nginx**
SSH into your EC2 Web-Tier instance:

```bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install Nginx
sudo dnf install -y nginx
sudo systemctl enable nginx
```

---

#### **Step 2: Set Directory Ownership**
Ensure `ec2-user` owns the directory:

```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/web-tier
```

---

#### **Step 3: Build Production Bundle**

```bash
cd /home/ec2-user/web-tier

# Install production dependencies
npm ci --omit=dev

# Build optimized production bundle
npm run build
```

This compiles React and copies all product images from `public/images/` into `build/images/`.

---

#### **Step 4: Configure Nginx**

Copy the production Nginx configuration:
```bash
sudo cp /home/ec2-user/nginx.conf /etc/nginx/nginx.conf
```

Edit `/etc/nginx/nginx.conf` and update the Internal Load Balancer DNS:
```bash
sudo nano /etc/nginx/nginx.conf
```

Ensure the server block matches:
```nginx
server {
    listen       80;
    listen       [::]:80;
    server_name  _;

    # Web-tier Health Check
    location /health {
        default_type text/html;
        return 200 "<!DOCTYPE html><p>Web Tier Health Check</p>\n";
    }

    # Serve React Static App & Product Images
    location / {
        root        /home/ec2-user/web-tier/build;
        index       index.html index.htm;
        try_files   $uri /index.html;
    }

    # Proxy API Requests to Internal Load Balancer
    location /api/ {
        proxy_pass  http://<Your-Internal-LoadBalancer-DNS>:80/;
    }
}
```

---

#### **Step 5: Test & Restart Nginx**

```bash
# Verify configuration syntax
sudo nginx -t

# Start or restart Nginx
sudo systemctl restart nginx
```

---

## 3. Verification & Testing

### **Health Check**
```bash
curl http://localhost/health
# Output: <!DOCTYPE html><p>Web Tier Health Check</p>
```

### **Static Product Images Check**
```bash
curl -I http://localhost/images/keyboard.png
# Output: HTTP/1.1 200 OK (Content-Type: image/png)
```

---

## 4. Troubleshooting & FAQ

### **Q: Product Images are not loading on EC2**
Make sure `npm run build` was executed on EC2. Nginx serves images directly from `/home/ec2-user/web-tier/build/images/`. Verify they exist:
```bash
ls -la /home/ec2-user/web-tier/build/images/
```

### **Q: `502 Bad Gateway` on `/api/` requests**
1. Check that the Internal Load Balancer DNS in `/etc/nginx/nginx.conf` is correct.
2. Verify that the App-Tier EC2 instance is running and healthy on port 4000.

### **Q: `npm install` permission denied on EC2**
Fix permissions by assigning directory ownership to `ec2-user`:
```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/web-tier
```
