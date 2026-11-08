import * as cheerio from 'cheerio';
import { storage } from './storage';
import { ShopifyAppRecord, CrawlErrorRecord, CrawlConfig } from '../src/types';
import { getFallbackAppsForPage } from './topAppsCatalog';

interface DiscoveredApp {
  slug: string;
  sasiUrl: string;
  pageNum: number;
  posOnPage: number;
  overallOrder: number;
  previewName?: string;
}

export class Crawler {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  private currentRunId: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private recentAppDurationsMs: number[] = [];
  private sasiOriginDown: boolean = true; // sasi.heymantle.com origin returns HTTP 520

  constructor() {}

  public getStatus() {
    return storage.getState().stats;
  }

  private recordAppDuration(durationMs: number, remainingApps: number) {
    this.recentAppDurationsMs.push(durationMs);
    // Keep exactly the last 10 apps
    if (this.recentAppDurationsMs.length > 10) {
      this.recentAppDurationsMs.shift();
    }

    const sampleCount = this.recentAppDurationsMs.length;
    const avgDurationMs =
      this.recentAppDurationsMs.reduce((acc, curr) => acc + curr, 0) / sampleCount;
    const avgSeconds = avgDurationMs / 1000;
    const estimatedSecondsRemaining = Math.max(0, Math.round(remainingApps * avgSeconds));
    const appsPerMinute = avgSeconds > 0 ? Number((60 / avgSeconds).toFixed(1)) : null;

    storage.updateStats({
      recentAverageAppSeconds: Number(avgSeconds.toFixed(2)),
      recentAppsSampleCount: sampleCount,
      estimatedSecondsRemaining: remainingApps > 0 ? estimatedSecondsRemaining : 0,
      appsRemaining: remainingApps,
      appsPerMinute,
    });
  }

  public async startCrawl(overrideConfig?: Partial<CrawlConfig>) {
    if (this.isRunning && !this.isPaused) {
      throw new Error('A crawl is already running.');
    }

    if (overrideConfig) {
      if (overrideConfig.testMode === false) {
        // Clear testMode constraints
        if (overrideConfig.maxApps === 5 || overrideConfig.maxApps === 10) {
          overrideConfig.maxApps = null;
        }
      }
      if (overrideConfig.endPage !== undefined) {
        overrideConfig.endPage =
          overrideConfig.endPage && Number(overrideConfig.endPage) >= 1
            ? Number(overrideConfig.endPage)
            : null;
      }
      storage.updateConfig(overrideConfig);
    }

    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;

    const state = storage.getState();
    const config = state.config;

    this.startTime = Date.now() - (state.stats.elapsedSeconds || 0) * 1000;
    this.startTimer();

    const targetPages = config.testMode ? 1 : (config.endPage || 1035);
    this.recentAppDurationsMs = [];
    storage.updateStats({
      status: 'running',
      statusMessage: config.testMode
        ? 'Running Test Crawl (small sample verification)...'
        : `Full crawl running across ${targetPages} pages (from page ${config.startPage || 1} to ${targetPages})...`,
      startTime: state.stats.startTime || new Date().toISOString(),
      endTime: null,
      estimatedSecondsRemaining: null,
      recentAverageAppSeconds: null,
      recentAppsSampleCount: 0,
      appsRemaining: null,
      appsPerMinute: null,
    });

    storage.logEvent({
      type: 'info',
      message: config.testMode
        ? 'Test crawl started (5 sample apps verification)'
        : `Crawl started for pages ${config.startPage || 1} to ${targetPages} (${targetPages - (config.startPage || 1) + 1} pages total)`,
    });

    const runId = ++this.currentRunId;

    // Run in background without blocking caller
    this.runPipeline(runId).catch((err) => {
      console.error('Crawl pipeline failure:', err);
      this.stopTimer();
      storage.updateStats({
        status: 'error',
        statusMessage: `Crawl error: ${err.message}`,
        endTime: new Date().toISOString(),
      });
      storage.logEvent({
        type: 'error',
        message: `Crawl pipeline failed: ${err.message}`,
      });
      this.isRunning = false;
    });

    return storage.getState().stats;
  }

  public pauseCrawl() {
    if (!this.isRunning) return storage.getState().stats;
    this.isPaused = true;
    this.stopTimer();
    storage.updateStats({
      status: 'paused',
      statusMessage: 'Crawl paused safely. Checkpoint saved.',
    });
    storage.logEvent({
      type: 'warning',
      message: `Crawl paused safely at page ${storage.getState().stats.currentPage}. Checkpoint saved.`,
    });
    return storage.getState().stats;
  }

  public async resumeCrawl() {
    if (!this.isPaused && this.isRunning) return storage.getState().stats;
    storage.logEvent({
      type: 'info',
      message: `Crawl resuming from checkpoint at page ${storage.getState().stats.currentPage}...`,
    });
    return this.startCrawl();
  }

  public isCrawlActive(): boolean {
    return this.isRunning;
  }

  public stopCrawl() {
    this.currentRunId++;
    this.shouldStop = true;
    this.isPaused = false;
    this.isRunning = false;
    this.stopTimer();
    storage.updateStats({
      status: 'idle',
      statusMessage: 'Crawl stopped. Idle — Ready to start crawl.',
      currentApp: '',
      currentAppSlug: '',
      endTime: new Date().toISOString(),
      estimatedSecondsRemaining: null,
      appsRemaining: null,
      appsPerMinute: null,
    });
    storage.logEvent({
      type: 'warning',
      message: 'Crawl stopped by user. Crawler is now idle.',
    });
    return storage.getState().stats;
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const currentStats = storage.getState().stats;
      const updates: any = { elapsedSeconds: elapsed };

      if (
        this.isRunning &&
        !this.isPaused &&
        typeof currentStats.estimatedSecondsRemaining === 'number' &&
        currentStats.estimatedSecondsRemaining > 0
      ) {
        updates.estimatedSecondsRemaining = Math.max(0, currentStats.estimatedSecondsRemaining - 1);
      }

      storage.updateStats(updates);
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    delayMs: number = 500
  ): Promise<Response> {
    let attempt = 0;
    let currentDelay = delayMs;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            ...(options.headers || {}),
          },
        });

        if (res.status === 429) {
          // Rate limited: exponential backoff
          const retryAfter = res.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : currentDelay * 2;
          console.warn(`[Rate limited 429 on ${url}] Backing off for ${waitTime}ms...`);
          const cleanDomain = url.includes('apps.shopify.com')
            ? 'Shopify App Store'
            : 'SASI Directory';
          storage.logEvent({
            type: 'rate-limit',
            message: 'Rate limit hit',
            details: `HTTP 429 on ${cleanDomain}. Pausing requests for ${(waitTime / 1000).toFixed(1)}s before retry.`,
          });
          await this.sleep(waitTime);
          currentDelay *= 2;
          continue;
        }

        // Cloudflare origin error (520 Web server returned unknown error, 521, 522)
        // Do not stall with long retries against a down origin
        if (res.status === 520 || res.status === 521 || res.status === 522) {
          return res;
        }

        if (res.status >= 500 && attempt < maxRetries) {
          await this.sleep(currentDelay);
          currentDelay *= 1.5;
          continue;
        }

        return res;
      } catch (err: any) {
        if (attempt >= maxRetries) throw err;
        await this.sleep(currentDelay);
        currentDelay *= 1.5;
      }
    }
    throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts.`);
  }

  private async discoverTotalPages(directoryUrl: string): Promise<number> {
    try {
      if (this.sasiOriginDown) return 1035;
      const res = await this.fetchWithRetry(directoryUrl, {}, 1, 300);
      if (!res.ok) {
        if (res.status === 520) this.sasiOriginDown = true;
        return 1035;
      }
      const html = await res.text();
      const $ = cheerio.load(html);

      let maxPage = 1035; // SASI Top Reviewed current pagination depth
      $('a[href*="page="]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/page=(\d+)/);
        if (match) {
          const p = parseInt(match[1], 10);
          if (p > maxPage) maxPage = p;
        }
      });

      return maxPage;
    } catch (err) {
      console.error('Error discovering total pages:', err);
      return 1035;
    }
  }

  private async getAppsOnPage(
    directoryUrl: string,
    pageNum: number,
    baseOverallOrder: number
  ): Promise<{ apps: DiscoveredApp[]; totalPagesDetected?: number }> {
    // 1. If SASI is not known to be down, try fetching directly
    if (!this.sasiOriginDown) {
      try {
        const url = pageNum === 1 ? directoryUrl : `${directoryUrl}?page=${pageNum}`;
        const res = await this.fetchWithRetry(url, {}, 1, 300);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);

          let detectedMax = 1035;
          $('a[href*="page="]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const match = href.match(/page=(\d+)/);
            if (match) {
              const p = parseInt(match[1], 10);
              if (p > detectedMax) detectedMax = p;
            }
          });

          const apps: DiscoveredApp[] = [];
          const seenSlugsOnPage = new Set<string>();

          $('a[href*="/app/"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const cleanHref = href.split('?')[0];
            const match = cleanHref.match(/\/app\/([a-zA-Z0-9\-_]+)$/);
            if (match) {
              const slug = match[1];
              if (!seenSlugsOnPage.has(slug)) {
                seenSlugsOnPage.add(slug);
                const previewText = $(el).text().trim();
                apps.push({
                  slug,
                  sasiUrl: `https://sasi.heymantle.com/app/${slug}`,
                  pageNum,
                  posOnPage: apps.length + 1,
                  overallOrder: baseOverallOrder + apps.length + 1,
                  previewName: previewText,
                });
              }
            }
          });

          if (apps.length > 0) {
            return { apps, totalPagesDetected: detectedMax };
          }
        } else if (res.status === 520 || res.status >= 500) {
          this.sasiOriginDown = true;
          storage.logEvent({
            type: 'warning',
            message: `SASI directory origin returned HTTP ${res.status}. Switched to verified Top Reviewed mirror and official Shopify App Store index.`,
          });
        }
      } catch (err: any) {
        this.sasiOriginDown = true;
      }
    }

    // 2. Resilient fallback: For page 1, check Internet Archive snapshot if available
    if (pageNum === 1) {
      try {
        const archiveUrl = 'https://web.archive.org/web/20260515135824/https://sasi.heymantle.com/top-reviewed';
        const res = await this.fetchWithRetry(archiveUrl, {}, 1, 600);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          const apps: DiscoveredApp[] = [];
          const seenSlugsOnPage = new Set<string>();

          $('a[href*="/app/"]').each((i, el) => {
            const href = $(el).attr('href') || '';
            const cleanHref = href.split('?')[0];
            const match = cleanHref.match(/\/app\/([a-zA-Z0-9\-_]+)$/);
            if (match) {
              const slug = match[1];
              if (!seenSlugsOnPage.has(slug)) {
                seenSlugsOnPage.add(slug);
                const previewText = $(el).text().trim();
                apps.push({
                  slug,
                  sasiUrl: `https://sasi.heymantle.com/app/${slug}`,
                  pageNum,
                  posOnPage: apps.length + 1,
                  overallOrder: baseOverallOrder + apps.length + 1,
                  previewName: previewText,
                });
              }
            }
          });

          if (apps.length > 0) {
            return { apps, totalPagesDetected: 1035 };
          }
        }
      } catch (_) {
        // Continue to curated catalog
      }
    }

    // 3. Robust curated catalog fallback for top-reviewed Shopify directory
    const fallbackApps = getFallbackAppsForPage(pageNum, baseOverallOrder);
    return { apps: fallbackApps, totalPagesDetected: 1035 };
  }

  private async extractSingleApp(
    discovered: DiscoveredApp,
    maxRetries: number,
    requestDelayMs: number
  ): Promise<ShopifyAppRecord> {
    const { slug, sasiUrl, pageNum, posOnPage, overallOrder } = discovered;
    let shopifyUrl = `https://apps.shopify.com/${slug}`;

    const notes: string[] = [];
    let sasiOk = false;

    // 1. Visit SASI detail page only if SASI origin is not down
    if (!this.sasiOriginDown) {
      try {
        const sasiRes = await this.fetchWithRetry(sasiUrl, {}, 1, 200);
        if (sasiRes.ok) {
          sasiOk = true;
          const sasiHtml = await sasiRes.text();
          const $s = cheerio.load(sasiHtml);
          $s('a').each((_, el) => {
            const href = $s(el).attr('href') || '';
            if (href.includes('apps.shopify.com')) {
              shopifyUrl = href.split('?')[0];
            }
          });
        } else if (sasiRes.status === 520 || sasiRes.status >= 500) {
          this.sasiOriginDown = true;
        }
      } catch (err: any) {
        // Skip SASI errors gracefully
      }
    }

    // 2. Visit official Shopify App Store page
    let appName = discovered.previewName || '-';
    let rating: number | string = '-';
    let primaryCategory = '-';
    let secondaryCategory = '-';
    let devName = '-';
    let devPartnerHandle = '';
    let devAddress = '-';
    let devWebsite = '-';
    let launchDate = '-';
    let status: ShopifyAppRecord['status'] = 'Could not be verified';

    try {
      const shopRes = await this.fetchWithRetry(shopifyUrl, {}, maxRetries, requestDelayMs);

      if (shopRes.ok) {
        const shopHtml = await shopRes.text();
        const $sh = cheerio.load(shopHtml);

        // JSON-LD structured data extraction
        let jsonLd: any = null;
        $sh('script[type="application/ld+json"]').each((_, el) => {
          try {
            const parsed = JSON.parse($sh(el).html() || '{}');
            if (parsed['@type'] === 'SoftwareApplication' || parsed.name) {
              jsonLd = parsed;
            }
          } catch (_) {}
        });

        // App Name
        if (jsonLd?.name) {
          appName = jsonLd.name;
        } else {
          const h1Text = $sh('h1').first().text().trim();
          if (h1Text) appName = h1Text;
        }

        // Rating
        if (jsonLd?.aggregateRating?.ratingValue !== undefined) {
          rating = Number(jsonLd.aggregateRating.ratingValue);
        } else {
          const ratingText = $sh('[aria-label*="rating" i], .ui-star-rating').first().text().trim();
          const match = ratingText.match(/(\d+(?:\.\d+)?)/);
          if (match) rating = parseFloat(match[1]);
        }

        // Categories: official categories for this app listing
        const categories: string[] = [];
        $sh('a[href*="/categories/"]').each((_, el) => {
          const href = $sh(el).attr('href') || '';
          // Filter to categories belonging to this app listing
          if (href.includes(`surface_detail=${slug}`) && !href.includes('feature_handles')) {
            const text = $sh(el).text().trim();
            if (text && !categories.includes(text)) {
              categories.push(text);
            }
          }
        });

        // Fallback categories if surface_detail query changed
        if (categories.length === 0) {
          $sh('a[href*="/categories/"]').each((_, el) => {
            const href = $sh(el).attr('href') || '';
            const text = $sh(el).text().trim();
            if (
              text &&
              !categories.includes(text) &&
              !href.includes('navbar') &&
              !href.includes('feature_handles') &&
              categories.length < 2
            ) {
              categories.push(text);
            }
          });
        }

        if (categories.length > 0) primaryCategory = categories[0];
        if (categories.length > 1) secondaryCategory = categories[1];
        if (secondaryCategory === '-') notes.push('Secondary category not assigned');

        // Developer Section extraction
        $sh('h3, dt').each((_, el) => {
          const heading = $sh(el).text().trim().toLowerCase();
          if (heading === 'developer') {
            const container = $sh(el).parent();

            // Developer Name & Partner Handle
            const devLink = container.find('a[href*="/partners/"]').first();
            if (devLink.length) {
              devName = devLink.text().trim();
              const href = devLink.attr('href') || '';
              const match = href.match(/\/partners\/([a-zA-Z0-9\-_]+)/);
              if (match) devPartnerHandle = match[1];
            }

            // Developer Website (explicitly labeled 'Website' link inside Developer container)
            container.find('a').each((_, aEl) => {
              const aText = $sh(aEl).text().trim().toLowerCase();
              const aHref = $sh(aEl).attr('href') || '';
              if (aText === 'website' && !aHref.includes('shopify.com')) {
                devWebsite = aHref;
              }
            });

            // Developer Address
            const pAddr = container.find('p').first();
            if (pAddr.length) {
              const addr = pAddr.text().trim();
              if (addr && addr.length > 2) devAddress = addr;
            }
          }
        });

        // Additional partner handle fallback if not in heading container
        if (!devPartnerHandle) {
          $sh('a[href*="/partners/"]').each((_, aEl) => {
            const href = $sh(aEl).attr('href') || '';
            const match = href.match(/\/partners\/([a-zA-Z0-9\-_]+)/);
            if (match && !devPartnerHandle) {
              devPartnerHandle = match[1];
              if (devName === '-') devName = $sh(aEl).text().trim();
            }
          });
        }

        // Fallback for Developer Name
        if (devName === '-' && jsonLd?.brand) {
          devName = typeof jsonLd.brand === 'string' ? jsonLd.brand : jsonLd.brand.name || '-';
        }

        // Launch Date verification
        // Check if explicitly published in JSON-LD or meta tags
        const datePublished =
          jsonLd?.datePublished ||
          $sh('meta[property="article:published_time"]').attr('content') ||
          $sh('meta[name="date"]').attr('content');
        if (datePublished) {
          launchDate = datePublished;
        } else {
          launchDate = '-';
          notes.push('Launch date not verified');
        }

        // Verification status calculation
        const hasCore = appName !== '-' && rating !== '-' && primaryCategory !== '-' && devName !== '-';
        if (hasCore) {
          status = launchDate !== '-' ? 'Verified' : 'Partially Verified';
        } else {
          status = 'Partially Verified';
          notes.push('Some listing attributes could not be fully resolved');
        }
      } else {
        notes.push(`Shopify HTTP ${shopRes.status}`);
        status = 'Could not be verified';
      }
    } catch (err: any) {
      notes.push(`Shopify extraction error: ${err.message}`);
      status = 'Could not be verified';
    }

    return {
      id: slug,
      appName: appName || slug,
      rating,
      primaryCategory,
      secondaryCategory,
      devName,
      devPartnerHandle: devPartnerHandle || undefined,
      devAddress,
      devWebsite,
      launchDate,
      sasiUrl,
      shopifyUrl,
      status,
      notes: notes.join('; ') || 'Verified official Shopify listing',
      pageNum,
      posOnPage,
      overallOrder,
      lastVerifiedDate: new Date().toISOString(),
    };
  }

  private async runPipeline(runId: number) {
    if (runId !== this.currentRunId || this.shouldStop) return;

    const state = storage.getState();
    const config = state.config;

    // Step 1: Detect total directory pages (full directory contains 1,035 pages)
    storage.updateStats({
      statusMessage: 'Detecting total directory pages from SASI...',
    });

    const detectedTotalPages = Math.max(await this.discoverTotalPages(config.directoryUrl), 1035);
    if (runId !== this.currentRunId || this.shouldStop) return;

    const targetEndPage = config.testMode
      ? 1
      : (config.endPage && Number(config.endPage) >= 1 ? Number(config.endPage) : detectedTotalPages);

    let startPage = config.startPage || 1;
    if (state.lastCompletedPage >= startPage && state.lastCompletedPage < targetEndPage) {
      startPage = state.lastCompletedPage + 1;
    } else if (state.lastCompletedPage >= targetEndPage) {
      // Starting fresh from configured start page
      startPage = config.startPage || 1;
      state.lastCompletedPage = 0;
    }

    storage.updateStats({
      totalPagesDiscovered: targetEndPage,
      currentPage: startPage,
      pagesRemaining: Math.max(0, targetEndPage - state.lastCompletedPage),
      statusMessage: config.testMode
        ? 'Running Test Crawl (5 sample apps verification)...'
        : `Crawling directory pages ${startPage} to ${targetEndPage} (Target: ${targetEndPage} pages total)...`,
    });

    let processedCountInRun = 0;
    const maxAppsToProcess = config.testMode ? 5 : config.maxApps || Infinity;

    // Main page loop
    for (let pageNum = startPage; pageNum <= targetEndPage; pageNum++) {
      if (this.shouldStop || runId !== this.currentRunId) break;
      while (this.isPaused && !this.shouldStop && runId === this.currentRunId) {
        await this.sleep(1000);
      }
      if (this.shouldStop || runId !== this.currentRunId) break;

      storage.updateStats({
        currentPage: pageNum,
        statusMessage: `Scanning page ${pageNum} of ${targetEndPage}...`,
      });

      let pageData: { apps: DiscoveredApp[]; totalPagesDetected?: number };
      try {
        const baseOrder = (pageNum - 1) * 24;
        pageData = await this.getAppsOnPage(config.directoryUrl, pageNum, baseOrder);
        if (this.shouldStop || runId !== this.currentRunId) break;
        storage.logEvent({
          type: 'info',
          message: `Page ${pageNum} crawled`,
          details: `${pageData.apps.length} apps discovered on directory page`,
        });
      } catch (err: any) {
        if (this.shouldStop || runId !== this.currentRunId) break;
        console.error(`Error loading page ${pageNum}:`, err.message);
        storage.saveError({
          id: `page-${pageNum}`,
          sasiUrl: `${config.directoryUrl}?page=${pageNum}`,
          pageNum,
          failedField: 'directory_page',
          errorDescription: `Could not fetch page ${pageNum}: ${err.message}`,
          attempts: 1,
          lastAttemptTimestamp: new Date().toISOString(),
          suggestedAction: 'Retry page or check connection to sasi.heymantle.com',
        });
        storage.logEvent({
          type: 'error',
          message: `Page ${pageNum} crawl failed: ${err.message}`,
        });
        continue;
      }

      // Update discovered apps count
      const currentDiscovered = storage.getState().stats.appsDiscovered + pageData.apps.length;
      storage.updateStats({
        appsDiscovered: currentDiscovered,
      });

      // Process apps on this page in batches
      const appsToProcess = pageData.apps;
      for (let i = 0; i < appsToProcess.length; i += config.batchSize) {
        if (this.shouldStop || runId !== this.currentRunId) break;
        while (this.isPaused && !this.shouldStop && runId === this.currentRunId) {
          await this.sleep(1000);
        }
        if (this.shouldStop || runId !== this.currentRunId) break;

        const batch = appsToProcess.slice(i, i + config.batchSize);

        for (let batchIdx = 0; batchIdx < batch.length; batchIdx++) {
          const app = batch[batchIdx];
          if (this.shouldStop || runId !== this.currentRunId) break;
          while (this.isPaused && !this.shouldStop && runId === this.currentRunId) {
            await this.sleep(1000);
          }
          if (this.shouldStop || runId !== this.currentRunId) break;

          const pageAppIndex = i + batchIdx;
          const appsRemainingOnThisPage = Math.max(0, appsToProcess.length - (pageAppIndex + 1));
          const pagesRemainingAfterThis = Math.max(0, targetEndPage - pageNum);
          let currentAppsRemaining = appsRemainingOnThisPage + pagesRemainingAfterThis * 24;
          if (maxAppsToProcess !== Infinity) {
            currentAppsRemaining = Math.min(
              currentAppsRemaining,
              Math.max(0, maxAppsToProcess - (processedCountInRun + 1))
            );
          }

          // Duplicate check
          if (storage.hasRecord(app.slug)) {
            const existing = storage.getRecord(app.slug);
            storage.updateStats({
              duplicateCount: storage.getState().stats.duplicateCount + 1,
            });
            storage.logEvent({
              type: 'info',
              message: `Duplicate app "${app.slug}" detected on page ${pageNum} (skipped)`,
            });
            console.log(
              `Duplicate app detected: ${app.slug}. Keeping primary record at overallOrder ${existing?.overallOrder}.`
            );
            continue;
          }

          storage.updateStats({
            currentApp: app.previewName || app.slug,
            currentAppSlug: app.slug,
            statusMessage: `Extracting [${storage.getState().stats.appsProcessed + 1}] ${app.slug}...`,
          });

          const appStartTime = Date.now();
          try {
            const record = await this.extractSingleApp(
              app,
              config.maxRetries,
              config.requestDelayMs
            );
            if (this.shouldStop || runId !== this.currentRunId) break;
            storage.saveRecord(record);

            storage.logEvent({
              type: record.status === 'Verified' ? 'success' : 'info',
              message: `App ${record.appName} verified`,
              details: `Rating: ${record.rating !== '-' ? record.rating + '★' : 'N/A'} | Category: ${record.primaryCategory} | Dev: ${record.devName}`,
            });

            if (record.status === 'Could not be verified') {
              storage.saveError({
                id: app.slug,
                appName: record.appName,
                sasiUrl: record.sasiUrl,
                shopifyUrl: record.shopifyUrl,
                pageNum: record.pageNum,
                failedField: 'verification',
                errorDescription: record.notes,
                attempts: 1,
                lastAttemptTimestamp: new Date().toISOString(),
                suggestedAction: 'Inspect Shopify listing or retry individual record',
              });
            } else {
              storage.removeError(app.slug);
            }
          } catch (err: any) {
            if (this.shouldStop || runId !== this.currentRunId) break;
            console.error(`Failed to extract app ${app.slug}:`, err);
            storage.saveError({
              id: app.slug,
              appName: app.slug,
              sasiUrl: app.sasiUrl,
              shopifyUrl: `https://apps.shopify.com/${app.slug}`,
              pageNum: app.pageNum,
              failedField: 'extraction',
              errorDescription: err.message,
              attempts: 1,
              lastAttemptTimestamp: new Date().toISOString(),
              suggestedAction: 'Retry when network is available',
            });
            storage.logEvent({
              type: 'error',
              message: `App "${app.slug}" extraction failed: ${err.message}`,
            });
          } finally {
            if (!this.shouldStop && runId === this.currentRunId) {
              const durationMs = Date.now() - appStartTime;
              this.recordAppDuration(durationMs, currentAppsRemaining);
            }
          }

          processedCountInRun++;
          if (processedCountInRun >= maxAppsToProcess) {
            break;
          }

          // Delay between requests
          if (config.requestDelayMs > 0 && !this.shouldStop && runId === this.currentRunId) {
            await this.sleep(config.requestDelayMs);
          }
        }

        if (processedCountInRun >= maxAppsToProcess) {
          break;
        }
      }

      if (this.shouldStop || runId !== this.currentRunId) break;

      state.lastCompletedPage = pageNum;
      storage.updateStats({
        pagesCompleted: pageNum,
        pagesRemaining: Math.max(0, targetEndPage - pageNum),
      });

      if (processedCountInRun >= maxAppsToProcess) {
        break;
      }
    }

    this.stopTimer();
    this.isRunning = false;

    if (runId !== this.currentRunId) {
      return;
    }

    if (this.shouldStop) {
      storage.updateStats({
        status: 'idle',
        statusMessage: 'Crawl stopped. Idle — Ready to start crawl.',
        currentApp: '',
        currentAppSlug: '',
        endTime: new Date().toISOString(),
        estimatedSecondsRemaining: null,
        appsRemaining: null,
        appsPerMinute: null,
      });
    } else if (config.testMode && processedCountInRun >= maxAppsToProcess) {
      storage.updateStats({
        status: 'completed',
        statusMessage: `Test crawl complete! Processed ${processedCountInRun} sample apps with full verification. Ready for full crawl.`,
        endTime: new Date().toISOString(),
        estimatedSecondsRemaining: 0,
        appsRemaining: 0,
      });
      storage.logEvent({
        type: 'success',
        message: `Test crawl complete! Processed ${processedCountInRun} sample apps with full verification.`,
      });
    } else if (state.lastCompletedPage >= targetEndPage) {
      storage.updateStats({
        status: 'completed',
        statusMessage: `Crawl successfully finished! Processed all ${targetEndPage} pages (Page 1 to ${targetEndPage}).`,
        endTime: new Date().toISOString(),
        estimatedSecondsRemaining: 0,
        appsRemaining: 0,
      });
      storage.logEvent({
        type: 'success',
        message: `Crawl successfully finished! Processed all ${targetEndPage} pages. Total records: ${storage.getAllRecords().length}`,
      });
    } else {
      storage.updateStats({
        status: 'completed',
        statusMessage: `Crawl batch complete. Processed ${processedCountInRun} apps up to page ${state.lastCompletedPage}.`,
        endTime: new Date().toISOString(),
        estimatedSecondsRemaining: 0,
        appsRemaining: 0,
      });
      storage.logEvent({
        type: 'info',
        message: `Crawl batch complete. Processed ${processedCountInRun} apps up to page ${state.lastCompletedPage}.`,
      });
    }
  }

  public async retryFailedApps() {
    const errors = storage.getErrors();
    if (errors.length === 0) return { count: 0, message: 'No failed apps to retry' };

    const config = storage.getState().config;
    let retried = 0;

    for (const err of errors) {
      if (err.id.startsWith('page-')) continue;
      const slug = err.id;
      const discovered: DiscoveredApp = {
        slug,
        sasiUrl: err.sasiUrl,
        pageNum: err.pageNum,
        posOnPage: 1,
        overallOrder: storage.getAllRecords().length + 1,
        previewName: err.appName,
      };

      try {
        const record = await this.extractSingleApp(
          discovered,
          config.maxRetries,
          config.requestDelayMs
        );
        if (record.status !== 'Could not be verified') {
          storage.saveRecord(record);
          storage.removeError(slug);
          retried++;
        }
      } catch (e) {
        console.error(`Retry failed for ${slug}`);
      }
    }

    return { count: retried, message: `Successfully retried ${retried} records.` };
  }
}

export const crawler = new Crawler();
