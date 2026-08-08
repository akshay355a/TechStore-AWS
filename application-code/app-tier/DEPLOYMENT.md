# TechStore App-Tier Deployment Guide

This guide provides clear, step-by-step instructions for running and deploying the **TechStore Backend (App-Tier)** in both **Local Development** (Windows/Linux) and **AWS EC2 Production** environments.

---

## Architecture Overview

The App-Tier dynamically adapts based on `NODE_ENV`:

| Environment | Mode | Credential Source | Database Connection | Process Manager |
|---|---|---|---|---|
| **Local Dev** | `NODE_ENV=development` | `.env` file | Local MySQL (No SSL) | `node` / Nodemon |
| **AWS Production** | `NODE_ENV=production` | AWS Secrets Manager | Amazon RDS MySQL (with SSL) | PM2 |

---

## 1. Local Deployment (Windows & Linux)

### **Prerequisites**
- **Node.js**: v20.0.0 or higher (`node -v`)
- **MySQL Server**: MySQL 8.0/8.4 LTS or Docker MySQL container

---

### **Step-by-Step Local Setup**

#### **Step 1: Clone Repository & Navigate to App-Tier**
```bash
cd application-code/app-tier
```

#### **Step 2: Initialize Local MySQL Database**
Apply the schema to create the `ecommerce` database and its tables (`users`, `products`, `orders`, `order_items`):

- **Linux / Mac**:
  ```bash
  mysql -u root -p < ../database/schema.sql
  ```
- **Windows (PowerShell)**:
  ```powershell
  Get-Content "..\database\schema.sql" | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
  ```

---

#### **Step 3: Environment Configuration**
Copy the environment template and configure your local database credentials:

```bash
cp .env.example .env
```

Open `.env` in a text editor and update:
```ini
NODE_ENV=development

# Database Credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourLocalMySQLPassword
DB_NAME=ecommerce
DB_PORT=3306

# App Config
JWT_SECRET=dev-secret-key-change-me
PORT=4000

# Admin & Product Seed Defaults
ADMIN_EMAIL=admin@techstore.com
ADMIN_PASSWORD=Admin123
ADMIN_NAME=Administrator
```

---

#### **Step 4: Install Dependencies**
```bash
npm install
```

---

#### **Step 5: Seed Admin User & Product Catalog**
Populate local database with the default admin account and initial product items:

```bash
npm run dev:seed
```
*(Runs both admin and product seeders in one command. It is idempotent — safe to re-run anytime).*

---

#### **Step 6: Start Backend Server**
```bash
npm run dev
```

The Express API will start on **`http://localhost:4000`**. Test health endpoint:
```bash
curl http://localhost:4000/health
# Output: {"status":"healthy","timestamp":"..."}
```

---

## 2. AWS EC2 Production Deployment

### **Prerequisites & IAM Permissions**
1. **EC2 Instance**: Amazon Linux 2023 in a private subnet.
2. **IAM Instance Profile**: Attached to EC2 with permission to read secrets:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "secretsmanager:GetSecretValue",
         "Resource": [
           "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:cloudinv/database-*",
           "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:cloudinv/admin-*"
         ]
       }
     ]
   }
   ```

---

### **Step-by-Step Production Setup**

#### **Step 1: Install Node.js 20, PM2, and Download RDS CA Bundle**
SSH into your EC2 App-Tier instance and run:

```bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Amazon RDS CA Bundle
sudo mkdir -p /etc/pki/rds
sudo curl --fail --silent --show-error \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  --output /etc/pki/rds/global-bundle.pem
sudo chmod 0644 /etc/pki/rds/global-bundle.pem
```

---

#### **Step 2: Configure AWS Secrets Manager**
Create two secrets in the same AWS Region as your EC2 instances:

1. **`cloudinv/database`**:
   ```json
   {
     "host": "your-rds-endpoint.rds.amazonaws.com",
     "username": "admin",
     "password": "your-db-password",
     "database": "ecommerce",
     "port": 3306,
     "JWT_SECRET": "a-long-random-jwt-signing-secret"
   }
   ```
   > [!IMPORTANT]
   > Ensure `"database"` is set to `"ecommerce"` (do NOT set it to system database `"mysql"`).

2. **`cloudinv/admin`**:
   ```json
   {
     "email": "admin@techstore.com",
     "password": "StrongProductionPassword123!",
     "name": "Administrator"
   }
   ```

---

#### **Step 3: Apply Database Schema to RDS**
Run schema initialization against your RDS endpoint:

```bash
mysql -h your-rds-endpoint.rds.amazonaws.com -u admin -p \
  --ssl-ca=/etc/pki/rds/global-bundle.pem < ../database/schema.sql
```

---

#### **Step 4: Deploy & Seed App-Tier**

```bash
cd /home/ec2-user/app-tier

# Fix permissions if cloned as root
sudo chown -R ec2-user:ec2-user /home/ec2-user/app-tier

# Install production dependencies only
npm ci --omit=dev

# Seed Admin User & Product Catalog into RDS
NODE_ENV=production RDS_CA_BUNDLE_PATH=/etc/pki/rds/global-bundle.pem node scripts/seed-admin.js
NODE_ENV=production RDS_CA_BUNDLE_PATH=/etc/pki/rds/global-bundle.pem node scripts/seed-products.js
```

---

#### **Step 5: Start Application with PM2**

```bash
export NODE_ENV=production
export RDS_CA_BUNDLE_PATH=/etc/pki/rds/global-bundle.pem

npm run start:pm2
pm2 save
pm2 startup
```

---

## 3. NPM Script Reference

| Script | Environment | Description |
|---|---|---|
| `npm run dev` | Development | Starts Express backend using `.env` values |
| `npm run dev:seed` | Development | Seeds both Admin user and Product catalog into local MySQL |
| `npm run dev:seed:admin` | Development | Seeds only Admin user into local MySQL |
| `npm run dev:seed:products` | Development | Seeds only Product catalog into local MySQL |
| `npm run seed:admin` | Production | Seeds Admin user from AWS Secrets Manager (`cloudinv/admin`) |
| `npm run seed:products` | Production | Seeds Product catalog from AWS Secrets Manager (`cloudinv/database`) |
| `npm run start:pm2` | Production | Launches process using PM2 via `ecosystem.config.js` |

---

## 4. Troubleshooting & FAQ

### **Q: Port `4000` is already in use (`EADDRINUSE`)**
To kill any lingering background Node server processes on port 4000:
```bash
# Linux
fuser -k -9 4000/tcp

# Windows (PowerShell)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force
```

### **Q: Error `Table 'mysql.products' doesn't exist`**
Your AWS Secret `cloudinv/database` is configured with `"database": "mysql"`.  
Go to **AWS Secrets Manager → cloudinv/database → Edit** and update `"database"` value to `"ecommerce"`, then restart the server.

### **Q: Permission Denied on EC2 (`EACCES: permission denied, mkdir ...`)**
Ensure directory ownership belongs to `ec2-user`:
```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/app-tier
```
