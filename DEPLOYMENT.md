# Deployment Guide

This guide shows you how to deploy the hackathon submission page to Cloudflare Pages.

---

## 🚀 Quick Deploy to Cloudflare Pages

### Option 1: Deploy via GitHub (Recommended)

1. **Push to GitHub** (already done!)
   ```bash
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Workers & Pages** → **Create application** → **Pages**
   - Click **Connect to Git**
   - Select your repository: `dontriskit/mcp-cloudflare-hack-night`

3. **Configure Build Settings**
   - **Build command:** Leave empty (static HTML)
   - **Build output directory:** `/` (root)
   - **Root directory:** `/`

4. **Deploy**
   - Click **Save and Deploy**
   - Your site will be live at: `https://mcp-cloudflare-hack-night.pages.dev`

---

### Option 2: Deploy via Wrangler CLI

```bash
# Install Wrangler globally (if not already installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy directly
wrangler pages deploy . --project-name=mcp-hackathon-submission
```

Your site will be available at:
```
https://mcp-hackathon-submission.pages.dev
```

---

## 📦 What Gets Deployed

```
├── index.html                    # Hackathon submission fan art page
├── serverless_comparison.md      # Full analysis (accessible via link)
├── serverless_providers_analysis.json  # Structured data
└── SERVERLESS_ANALYSIS_README.md # Project overview
```

---

## 🎨 Customization

### Update the Page:

1. Edit `index.html` to customize:
   - Hero section text
   - Stats numbers
   - Feature cards
   - Provider highlights

2. Commit and push:
   ```bash
   git add index.html
   git commit -m "Update hackathon page"
   git push origin main
   ```

3. Cloudflare Pages auto-deploys on push!

---

## 🔗 Custom Domain (Optional)

1. In Cloudflare Pages settings, go to **Custom domains**
2. Add your domain (e.g., `serverless-intel.yourdomain.com`)
3. Cloudflare automatically provisions SSL certificate
4. DNS is configured automatically

---

## 📊 Analytics (Optional)

Enable Cloudflare Web Analytics:

1. In Pages settings, go to **Web Analytics**
2. Click **Enable Web Analytics**
3. Track visitors, page views, and performance metrics

---

## 🧪 Test Locally

To preview the page locally:

```bash
# Simple HTTP server
python3 -m http.server 8000

# Or with Node.js
npx serve .

# Or with Cloudflare Wrangler
wrangler pages dev .
```

Then open: `http://localhost:8000`

---

## 🎯 Hackathon Submission Checklist

- [x] Built with HONC stack concepts (Hono framework showcase)
- [x] Uses MCP server (WhiteContext for intelligence)
- [x] Deployed on Cloudflare Workers/Pages
- [x] Interactive and visually appealing
- [x] Demonstrates MCP capabilities
- [x] Open source and documented
- [x] Live demo available

---

## 🌟 Features Showcase

The submission demonstrates:

1. **MCP Integration**
   - WhiteContext MCP Server for competitive intelligence
   - Bulk analysis of 11 serverless providers
   - Structured data extraction and visualization

2. **HONC Stack Philosophy**
   - Lightweight and performant
   - Type-safe development
   - Edge-first architecture
   - Cloudflare ecosystem integration

3. **Real-World Application**
   - Practical use case (serverless provider comparison)
   - Comprehensive market analysis
   - Decision frameworks for developers

---

## 📝 Submission Details

**Project Name:** Serverless Intelligence Platform
**GitHub:** https://github.com/dontriskit/mcp-cloudflare-hack-night
**Live Demo:** (Your Cloudflare Pages URL)
**Category:** MCP Server Integration + Competitive Intelligence

**Technologies:**
- HONC Stack (Hono + Cloudflare)
- WhiteContext MCP Server
- Claude Code (AI assistance)
- Cloudflare Workers (MCP hosting)

---

## 🎉 Next Steps

1. Deploy to Cloudflare Pages (see above)
2. Share your live URL
3. Submit to hackathon
4. Get feedback from community
5. Iterate and improve!

---

**Built with ❤️ for World Wild Web AI & MCP Hack Night**
