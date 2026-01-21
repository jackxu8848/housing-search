# Fix GitHub Pages 404 Error

The issue is that GitHub Pages is serving the raw repository files instead of the built files from GitHub Actions.

## Quick Fix Steps

### 1. Check GitHub Pages Settings

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Deploy from a branch** → Change to **GitHub Actions**
   
   OR if GitHub Actions is already selected:
   - Make sure **None** is not selected
   - The deployment should say "github-pages" environment

### 2. Verify GitHub Actions Workflow

1. Go to **Actions** tab in your repository
2. Check if the "Deploy to GitHub Pages" workflow has run
3. If it shows errors, check the logs
4. If it hasn't run, make a commit and push to trigger it:

```bash
git add .
git commit -m "Trigger deployment"
git push origin main
```

### 3. Check Required Secret

Make sure you've set the `VITE_API_URL` secret:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `VITE_API_URL` = your Render backend URL (e.g., `https://your-app.onrender.com`)

### 4. Verify Frontend Build

The frontend needs an `index.html` in the frontend directory. Run:

```bash
cd frontend
npm install
npm run build
```

This should create a `dist` folder with the built files.

### 5. If Still Not Working

If GitHub Pages is still showing 404:

1. **Delete the root `index.html`** - It might be interfering:
   ```bash
   git rm index.html
   git commit -m "Remove root index.html to avoid conflicts"
   git push origin main
   ```

2. **Check the workflow logs** - In the Actions tab, click on the latest workflow run and check:
   - Did the build succeed?
   - Did the artifact upload succeed?
   - Did the deployment succeed?

3. **Manually trigger deployment**:
   - In the Actions tab, click on "Deploy to GitHub Pages"
   - Click "Run workflow" → "Run workflow"

## Expected Behavior

After the workflow runs successfully:
- The built files should be in `frontend/dist/`
- GitHub Pages should serve from the artifact, not from the repository
- The site should work at `https://housegooddeal.shop`

## Troubleshooting

**If you see `/src/main.jsx` 404:**
- GitHub Pages is serving the wrong source (repository files instead of built files)
- Solution: Switch GitHub Pages source to "GitHub Actions"

**If the workflow fails:**
- Check that `VITE_API_URL` secret is set
- Check that frontend dependencies install correctly
- Check the build logs for specific errors

**If deployment succeeds but site doesn't work:**
- Wait a few minutes for DNS/CDN propagation
- Clear browser cache
- Check browser console for API errors (might need CORS fix on backend)

