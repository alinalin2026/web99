# Attridge Academy of Irish Dance — Website

A beautiful, responsive website for Attridge Academy of Irish Dance in Cork, Ireland. Built with React 19, Tailwind CSS 4, and TypeScript.

## Project Overview

This is a one-page website celebrating 68 years of Irish dance heritage (founded 1958). The design uses a "Reliquary" aesthetic—a sacred artefact holding precious cultural tradition—with two distinct registers:

1. **The Artefact** (hero, annals, ethos) — slow, ceremonial, mystical
2. **The Desk** (classes, timetable, book) — plain, fast, functional

## Quick Start

### Prerequisites
- Node.js 18+ or pnpm 10+
- npm or pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install
# or
npm install

# Start development server
pnpm dev
# or
npm run dev
```

The site will be available at `http://localhost:3000`

### Production Build

```bash
# Build for production
pnpm build
# or
npm run build

# Preview production build
pnpm preview
# or
npm preview
```

## Deployment

### Option 1: Static Hosting (Recommended)

The built files are in the `dist/public/` directory. Deploy these files to any static hosting service:

- **Vercel**: `vercel deploy dist/public`
- **Netlify**: Drag and drop `dist/public` folder
- **AWS S3**: Upload `dist/public` contents
- **GitHub Pages**: Configure to serve from `dist/public`

### Option 2: Node.js Server

The project includes a Node.js server for serving the site:

```bash
# Build
pnpm build

# Start server
NODE_ENV=production node dist/index.js
```

The server will run on port 3000 (or `$PORT` environment variable).

## Project Structure

```
client/
  ├── public/              # Static assets (favicon, robots.txt)
  ├── src/
  │   ├── pages/          # Page components
  │   ├── components/     # Reusable UI components
  │   ├── contexts/       # React contexts (Theme)
  │   ├── hooks/          # Custom React hooks
  │   ├── lib/            # Utility functions
  │   ├── App.tsx         # Main app component
  │   ├── main.tsx        # React entry point
  │   └── index.css       # Global styles & design tokens
  └── index.html          # HTML template

server/
  └── index.ts            # Express server for production

dist/
  ├── public/             # Built static files (deploy these)
  └── index.js            # Compiled server

package.json             # Dependencies and scripts
tsconfig.json            # TypeScript configuration
vite.config.ts           # Vite build configuration
```

## Key Features

- **Responsive Design**: Mobile-first, works on all screen sizes
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized bundle size, fast load times
- **Dark Theme**: Beautiful dark aesthetic with gold accents
- **Scroll Animations**: Smooth reveal animations as you scroll
- **Typography**: Premium fonts (Cormorant Garamond, Source Serif 4)

## Customization

### Colors & Theme

Edit `client/src/index.css` to customize the color palette:

```css
:root {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.85 0.005 65);
  --primary: var(--color-blue-700);
  --accent: oklch(0.967 0.001 286.375);
  /* ... more colors ... */
}
```

### Fonts

Fonts are loaded in `client/index.html`. To change fonts, update the Google Fonts import and the font-family declarations in `client/src/index.css`.

### Images

Images are stored in `/manus-storage/` URLs. To replace them:

1. Upload your images to your hosting service
2. Update the image URLs in `client/src/pages/Home.tsx`

Current images:
- `attridge-hero-background.png` — Hero section background
- `attridge-logo-enhanced.png` — Academy seal/logo
- `attridge-dancers-group.png` — Children's classes image
- `attridge-cultural-moment.png` — Adults' classes image
- `attridge-tradition-detail.png` — Schools programme image

## Scripts

```bash
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm preview       # Preview production build
pnpm check         # Type check with TypeScript
pnpm format        # Format code with Prettier
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Contact

- **Phone**: 086 355 7288
- **Email**: info@attridgeacademy.ie
- **Location**: Cork, Ireland

## License

MIT

## Notes for Server Upload

1. **Extract the zip file** on your server
2. **Install dependencies**: `pnpm install`
3. **Build the project**: `pnpm build`
4. **Deploy static files**: Copy contents of `dist/public/` to your web server root
5. **Or run Node server**: `NODE_ENV=production node dist/index.js`

For static hosting (recommended), only the `dist/public/` folder is needed on your server. All other files are for development/building only.

---

Built with ❤️ for Attridge Academy of Irish Dance
