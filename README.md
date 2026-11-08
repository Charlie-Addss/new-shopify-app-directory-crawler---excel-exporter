# Shopify App Directory Crawler & Excel Exporter

A full-stack web scraping, verification, and analytics dashboard for the Shopify App Store. Built with React 19, TypeScript, Tailwind CSS, Express, Cheerio, and ExcelJS.

Inspired by modern SEO and analytics suites (such as Semrush and Ahrefs), this tool provides real-time directory crawling, multi-tier data extraction, live analytics dashboards, company/developer grouping, and multi-sheet Excel/CSV exporting.

---

## Tech Stack Overview

### 1. Frontend
- **Framework:** React 19 (`react`, `react-dom`)
- **Language:** TypeScript 5.8+ (`typescript`)
- **Build Tool & Bundler:** Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Styling:** Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`, `autoprefixer`)
- **Typography:** Google Font **Montserrat** (300 to 800 weights)
- **Icons:** Lucide React (`lucide-react`)
- **Data Visualization:** Recharts (`recharts`) for responsive category breakdowns, rating distributions, and KPI metrics
- **UI Architecture:** Semrush & Ahrefs-inspired light theme with tabbed navigation (Monitor, Developers, Records, Errors, Documentation, and User Analytics Dashboard)

### 2. Backend & Server
- **Runtime:** Node.js (v18+)
- **Server Framework:** Express 4 (`express`)
- **TypeScript Runner:** TSX (`tsx`) for hot-reloading server execution
- **Full-Stack Integration:** Single-port dev server (port 3000) mounting Vite middlewares into Express in development and serving production static assets in production
- **Persistence:** File-backed JSON data store (`data/records.json`, `data/state.json`, `data/errors.json`, `data/events.json`)

### 3. Crawler & Scraping Engine
- **HTML & DOM Parsing:** Cheerio (`cheerio`)
- **Structured Data:** Schema.org JSON-LD extraction (`<script type="application/ld+json">`) for high-fidelity app name, rating, brand, and category extraction
- **Resilience & Fallback Architecture:**
  - Multi-tier directory discovery supporting live SASI directory, Internet Archive snapshot mirror, and curated Top-Reviewed Shopify catalog
  - Cloudflare HTTP 520/5xx origin error detection and graceful fallback
  - Direct live verification against the official Shopify App Store (`https://apps.shopify.com/<slug>`)
- **Crawl Governance:** Strictly manual start (never auto-starts on load or refresh), pause/resume, checkpointing, exponential rate-limit backoff (HTTP 429), and batch concurrency controls

### 4. Export & Reporting Engine
- **Excel Generation:** ExcelJS (`exceljs`) generating styled multi-sheet `.xlsx` workbooks with formatted headers, auto-fit column widths, and status styling
- **CSV Streams:** RFC-4180-compliant CSV exports for App Directory, Consolidated Developers, and Crawl Errors

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `yarn` or `pnpm` or `bun`

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd shopify-app-crawler

# Install dependencies
npm install
```

### Running Locally
```bash
# Start full-stack development server on http://localhost:3000
npm run dev
```

### Building for Production
```bash
# Build the client bundle
npm run build

# Start production server
npm start
```

---

## Deploying to GitHub

To push this codebase to your own GitHub repository:

1. **Create a new empty repository on GitHub**:
   - Go to [github.com/new](https://github.com/new).
   - Enter a repository name (e.g., `shopify-app-crawler`).
   - Do not initialize with a README or `.gitignore` (as they are already provided here).
   - Click **Create repository**.

2. **Add Remote & Push**:
   In your terminal inside this project directory, run:
   ```bash
   # Add your GitHub repository as origin
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPOSITORY>.git

   # Set primary branch to main
   git branch -M main

   # Push code to GitHub
   git push -u origin main
   ```

3. **Deploying the Application**:
   Since this application includes an Express backend crawler and API routes (`/api/*`), deploy it on any Node.js hosting service:
   - **Render / Railway / Fly.io / Heroku**: Connect your GitHub repository, set build command to `npm install && npm run build`, and start command to `npm start`.
   - **Docker / Cloud Run**: Build a container with Node.js 18+ exposing port 3000.
