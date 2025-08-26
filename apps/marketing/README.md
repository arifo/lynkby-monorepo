# Lynkby Marketing App

The marketing website for Lynkby, built with Next.js and deployed to Cloudflare Pages.

## 🎯 Purpose

This app serves as the main marketing website for `lynkby.com`, showcasing:
- Company information and value proposition
- Product features and benefits
- Demo profiles and examples
- Call-to-action pages for signups

## 🚀 Features

- **Static Export**: Lightning-fast performance with pre-built HTML
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **SEO Optimized**: Meta tags, canonical URLs, and structured content
- **Demo Integration**: Fetches live profile data from the worker API

## 🏗️ Architecture

- **Framework**: Next.js 14 with static export
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Deployment**: Cloudflare Pages
- **Data**: Fetches from worker's public API endpoint

## 📁 Structure

```
apps/marketing/
├── pages/           # Next.js pages
│   ├── index.tsx    # Homepage
│   └── demo.tsx     # Demo page
├── .dev.vars        # Local development environment variables
├── wrangler.toml    # Cloudflare Pages configuration
└── package.json     # Dependencies and scripts
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- Access to the worker API (for demo profiles)

### Setup

1. **Install dependencies**:
   ```bash
   cd apps/marketing
   pnpm install
   ```

2. **Environment variables**:
   ```bash
   # Copy and edit environment variables
   cp .dev.vars .env
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   # Opens at: http://localhost:3002
   ```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm deploy` - Deploy to Cloudflare Pages
- `pnpm deploy:dev` - Deploy to development environment
- `pnpm deploy:prod` - Deploy to production environment

## 🌐 Deployment

### Local Development
- **Port**: 3002
- **API**: Fetches from `http://localhost:8787` (worker)

### Production
- **Domain**: `lynkby.com`
- **API**: Fetches from `https://lynkby.com` (worker)

### Environment Variables

| Variable | Description | Local | Production |
|----------|-------------|-------|------------|
| `NEXT_PUBLIC_PUBLIC_API_BASE` | Worker API base URL | `http://localhost:8787` | `https://lynkby.com` |
| `NODE_ENV` | Environment mode | `development` | `production` |

## 📱 Pages

### Homepage (`/`)
- Hero section with value proposition
- Feature highlights
- Call-to-action buttons
- Footer with navigation

### Demo (`/demo`)
- Showcases user profiles
- Fetches live data from worker API
- Interactive profile cards
- Links to full profiles

## 🔗 Integration

### Worker API
The marketing app integrates with the worker's public API:
```
GET /api/public/page?username=testuser
```

### Cross-App Navigation
- Links to app: `app.lynkby.com`
- Links to user profiles: `/u/[username]`
- Links to web app: `web.lynkby.com`

## 🎨 Design System

### Colors
- **Primary**: Purple (`purple-600`)
- **Secondary**: Pink (`pink-600`)
- **Accent**: Blue (`blue-600`)
- **Neutral**: Gray scale

### Typography
- **Headings**: Bold, large scale
- **Body**: Medium weight, readable
- **Links**: Purple with hover effects

### Components
- **Buttons**: Gradient backgrounds, rounded corners
- **Cards**: White backgrounds, subtle shadows
- **Sections**: Alternating backgrounds for visual separation

## 🚀 Performance

- **Static Export**: Pre-built HTML for instant loading
- **Image Optimization**: Next.js image optimization
- **CSS**: Tailwind CSS with PurgeCSS for minimal bundle size
- **CDN**: Cloudflare's global edge network

## 🔍 SEO

- **Meta Tags**: Title, description, viewport
- **Canonical URLs**: Proper canonical links
- **Structured Data**: Semantic HTML structure
- **Performance**: Core Web Vitals optimization

## 📊 Analytics

- **Performance**: Core Web Vitals monitoring
- **User Behavior**: Page views and navigation
- **Conversion**: Signup and demo page engagement

## 🛡️ Security

- **HTTPS**: Enforced by Cloudflare
- **Headers**: Security headers via Cloudflare
- **CSP**: Content Security Policy
- **XSS Protection**: Built-in Next.js protection

## 🔄 Updates

### Content Updates
1. Edit the relevant page component
2. Test locally with `pnpm dev`
3. Deploy with `pnpm deploy:prod`

### Feature Updates
1. Add new pages to `pages/` directory
2. Update navigation in header/footer
3. Test and deploy

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)
- [Lynkby Project Overview](../../README.md)
