# Production Deployment Guide

This guide will help you deploy the Smart Real Estate Search application to production.

## Architecture

- **Frontend**: Deployed to GitHub Pages (static files)
- **Backend**: Deployed to a Node.js hosting service (Railway, Render, etc.)

## Step 1: Deploy Backend

### Option A: Railway (Recommended - Free tier available)

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add the `backend` folder as the root directory
5. Add environment variables:
   - `REPLIERS_API_KEY`: Your Repliers API key
   - `PORT`: Will be set automatically by Railway
6. Railway will automatically deploy and give you a URL like: `https://your-app.railway.app`
7. Copy this URL - you'll need it for the frontend

### Option B: Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add environment variables:
   - `REPLIERS_API_KEY`: Your Repliers API key
6. Deploy and copy the URL

### Option C: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variable: `heroku config:set REPLIERS_API_KEY=your_key`
5. Deploy: `git subtree push --prefix backend heroku main`

## Step 2: Configure Frontend

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add a new secret:
   - **Name**: `VITE_API_URL`
   - **Value**: Your backend URL (e.g., `https://your-app.railway.app`)

## Step 3: Configure GitHub Pages

1. Go to **Settings** → **Pages**
2. Under "Source", select:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
3. Click "Save"

## Step 4: Configure Custom Domain

1. In your domain registrar (where you bought `housegooddeal.shop`), add DNS records:
   - **Type**: CNAME
   - **Name**: @ (or www)
   - **Value**: `your-username.github.io`

2. GitHub Pages will automatically detect the CNAME file in your repo

3. Wait for DNS propagation (can take up to 24 hours)

## Step 5: Test Deployment

1. Push your changes to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Check the Actions tab to see deployment status
4. Visit your domain: `https://housegooddeal.shop`

## Troubleshooting

### Frontend can't connect to backend
- Check that `VITE_API_URL` secret is set correctly in GitHub
- Verify backend is running and accessible
- Check browser console for CORS errors

### Backend not working
- Check environment variables are set correctly
- Verify `REPLIERS_API_KEY` is valid
- Check backend logs in your hosting service

### Domain not working
- Verify DNS records are correct
- Wait for DNS propagation (up to 24 hours)
- Check CNAME file exists in repository root

## Environment Variables

### Backend (.env)
```
REPLIERS_API_KEY=your_api_key_here
PORT=3001
```

### Frontend (GitHub Secrets)
```
VITE_API_URL=https://your-backend-url.railway.app
```

## Manual Build (if needed)

```bash
# Build frontend
cd frontend
npm install
npm run build

# The dist folder contains the production build
# This is automatically done by GitHub Actions
```

