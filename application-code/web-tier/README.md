# TechStore Web Tier

Production React application tier for EC2 served via Nginx behind an external Application Load Balancer.  
Also supports local development on **Windows** and **Linux** without any AWS infrastructure.

> 📘 **Full Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed local and AWS production deployment instructions.

## Local Development (Windows / Linux)

### Prerequisites

- Node.js 20 or newer
- App-tier backend running on `http://localhost:4000`

### Quick Start

1. **Install dependencies**:

   ```sh
   npm install
   ```

2. **Start the React dev server**:

   ```sh
   npm start
   ```

   The React dev server starts on `http://localhost:3000` and automatically proxies `/api` requests to `localhost:4000`.

## Production Build

To build the static production bundle for Nginx deployment on EC2:

```sh
npm run build
```

This compiles all React components and bundles static images from `public/images/` to `build/images/`.
