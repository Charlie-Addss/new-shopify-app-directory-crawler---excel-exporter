import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { crawler } from './server/crawler';
import { storage } from './server/storage';
import {
  generateExcelWorkbook,
  generateCsvExport,
  generateErrorsCsv,
  generateDevelopersCsv,
} from './server/excel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Dev server binds to port 3000 (supporting CLI --port argument or PORT env var)
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : null;
  const port = portFromArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  // CORS and permissive headers for iframe environments
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parser
  app.use(express.json());

  // Safety: Ensure crawler is strictly idle on server boot
  if (!crawler.isCrawlActive()) {
    storage.ensureIdleState();
  }

  // ==========================================
  // API Routes
  // ==========================================

  // Live crawl status and current configuration
  app.get('/api/crawl/status', (req, res) => {
    const state = storage.getState();
    // Safety check: if crawler background worker is not actively running, ensure status is strictly idle
    if (!crawler.isCrawlActive() && state.stats.status === 'running') {
      storage.ensureIdleState();
    }
    const freshState = storage.getState();
    res.json({
      stats: freshState.stats,
      config: freshState.config,
      totalSavedRecords: storage.getAllRecords().length,
      errorsCount: storage.getErrors().length,
      recentEvents: storage.getEvents(50),
      topCategories: storage.getTopCategories(5),
    });
  });

  // Dedicated endpoint for crawler events
  app.get('/api/crawl/events', (req, res) => {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    res.json({ events: storage.getEvents(limit) });
  });

  // Dedicated endpoint for category analytics
  app.get('/api/crawl/categories', (req, res) => {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 5;
    res.json({ topCategories: storage.getTopCategories(limit) });
  });

  // User Analytics Dashboard endpoint (Semrush/Ahrefs-style pre-aggregated metrics)
  app.get('/api/analytics/overview', (req, res) => {
    try {
      const category = req.query.category ? String(req.query.category) : undefined;
      const secondaryCategory = req.query.secondaryCategory ? String(req.query.secondaryCategory) : undefined;
      const ratingBand = req.query.ratingBand ? String(req.query.ratingBand) : undefined;
      const developer = req.query.developer ? String(req.query.developer) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const analytics = storage.getDashboardAnalytics({
        category,
        secondaryCategory,
        ratingBand,
        developer,
        status,
        search,
      });

      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compute dashboard analytics: ' + err.message });
    }
  });

  // Update crawler configuration
  app.post('/api/crawl/config', (req, res) => {
    try {
      const config = req.body || {};
      storage.updateConfig(config);
      res.json({ success: true, config: storage.getState().config });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Start crawl
  app.post('/api/crawl/start', async (req, res) => {
    try {
      const config = req.body || {};
      const stats = await crawler.startCrawl(config);
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Pause crawl
  app.post('/api/crawl/pause', (req, res) => {
    try {
      const stats = crawler.pauseCrawl();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Resume crawl
  app.post('/api/crawl/resume', async (req, res) => {
    try {
      const stats = await crawler.resumeCrawl();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Stop crawl
  app.post('/api/crawl/stop', (req, res) => {
    try {
      const stats = crawler.stopCrawl();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Retry failed apps
  app.post('/api/crawl/retry-failed', async (req, res) => {
    try {
      const result = await crawler.retryFailedApps();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Reset crawl data
  app.post('/api/crawl/reset', (req, res) => {
    try {
      crawler.stopCrawl();
      storage.resetAll();
      res.json({ success: true, message: 'All crawl data and state reset.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Get records with search, filter, pagination, and sorting
  app.get('/api/crawl/records', (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const ratingBand = req.query.ratingBand ? String(req.query.ratingBand) : undefined;
    const developer = req.query.developer ? String(req.query.developer) : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const sortBy = req.query.sortBy as any;
    const sortDir = req.query.sortDir as any;

    const data = storage.getRecords({ search, status, category, ratingBand, developer, page, limit, sortBy, sortDir });

    // Also get unique categories list for filter dropdown
    const all = storage.getAllRecords();
    const categoriesSet = new Set<string>();
    for (const r of all) {
      if (r.primaryCategory && r.primaryCategory !== '-') categoriesSet.add(r.primaryCategory);
    }

    res.json({
      ...data,
      availableCategories: Array.from(categoriesSet).sort(),
    });
  });

  // Get single record
  app.get('/api/crawl/records/:id', (req, res) => {
    const record = storage.getRecord(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  });

  // Get grouped developers (companies with multiple apps consolidated)
  app.get('/api/crawl/developers', (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const multiOnly = req.query.multiOnly === 'true';
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const sortBy = req.query.sortBy as any;
    const sortDir = req.query.sortDir as any;

    const data = storage.getGroupedDevelopers({
      search,
      multiOnly,
      page,
      limit,
      sortBy,
      sortDir,
    });

    res.json(data);
  });

  // Get errors log
  app.get('/api/crawl/errors', (req, res) => {
    res.json({ errors: storage.getErrors() });
  });

  // Developers CSV download
  app.get('/api/export/developers-csv', (req, res) => {
    try {
      const multiOnly = req.query.multiOnly === 'true';
      const csv = generateDevelopersCsv(multiOnly);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Grouped_Shopify_Developers.csv"'
      );
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate Developers CSV: ' + err.message });
    }
  });

  // Excel download
  app.get('/api/export/excel', async (req, res) => {
    try {
      const verifiedOnly = req.query.verifiedOnly === 'true';
      const buffer = await generateExcelWorkbook(verifiedOnly);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Shopify_Apps_Top_Reviewed_Directory.xlsx"'
      );
      res.send(buffer);
    } catch (err: any) {
      console.error('Error generating Excel export:', err);
      res.status(500).json({ error: 'Failed to generate Excel file: ' + err.message });
    }
  });

  // CSV download
  app.get('/api/export/csv', (req, res) => {
    try {
      const verifiedOnly = req.query.verifiedOnly === 'true';
      const csv = generateCsvExport(verifiedOnly);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Shopify_Apps_Top_Reviewed_Directory.csv"'
      );
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate CSV: ' + err.message });
    }
  });

  // Errors CSV download
  app.get('/api/export/errors-csv', (req, res) => {
    try {
      const csv = generateErrorsCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Crawl_Errors.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate Errors CSV: ' + err.message });
    }
  });

  // ==========================================
  // Vite Middleware / Static Serving
  // ==========================================
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
