import fs from 'fs';
import path from 'path';
import {
  ShopifyAppRecord,
  CrawlErrorRecord,
  CrawlState,
  CrawlConfig,
  CrawlStats,
  GroupedDeveloper,
  CrawlerEvent,
  CategoryFrequency,
  DashboardAnalyticsResponse,
  DashboardKPIs,
  CategoryDistributionItem,
  RatingBandItem,
  DeveloperLeaderboardItem,
  LaunchYearTrendItem,
  CategoryComparisonItem,
  DataQualitySummary,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const ERRORS_FILE = path.join(DATA_DIR, 'errors.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export const defaultConfig: CrawlConfig = {
  directoryUrl: 'https://sasi.heymantle.com/top-reviewed',
  startPage: 1,
  endPage: null,
  maxApps: null,
  batchSize: 5,
  requestDelayMs: 600,
  maxRetries: 3,
  testMode: false,
  exportVerifiedOnly: false,
};

export const defaultStats: CrawlStats = {
  totalPagesDiscovered: 0,
  pagesCompleted: 0,
  pagesRemaining: 0,
  appsDiscovered: 0,
  appsProcessed: 0,
  appsVerified: 0,
  appsPartiallyVerified: 0,
  appsFailed: 0,
  duplicateCount: 0,
  currentPage: 1,
  currentApp: '',
  currentAppSlug: '',
  startTime: null,
  endTime: null,
  elapsedSeconds: 0,
  status: 'idle',
  statusMessage: 'Ready to start crawl',
  lastCheckpointTimestamp: undefined,
  estimatedSecondsRemaining: null,
  recentAverageAppSeconds: null,
  recentAppsSampleCount: 0,
  appsRemaining: null,
  appsPerMinute: null,
};

export function normalizeDeveloperKey(
  devName: string,
  partnerHandle?: string
): { key: string; cleanName: string; partnerHandle?: string } {
  if (partnerHandle && partnerHandle.trim().length > 0) {
    const handle = partnerHandle.trim().toLowerCase();
    let clean = (devName || handle).trim();
    clean = clean.split('|')[0].trim();
    clean = clean.split(' - ')[0].trim();
    return { key: `partner:${handle}`, cleanName: clean, partnerHandle: handle };
  }

  let clean = (devName || 'Unknown Developer').trim();
  // Strip tagline after pipe or hyphen (e.g. "PageFly | AI Landing Page Builder & CRO")
  clean = clean.split('|')[0].trim();
  clean = clean.split(' - ')[0].trim();

  // Normalize common known Shopify publisher naming variations
  const lower = clean.toLowerCase();
  if (lower === 'shopify' || lower.startsWith('shopify ')) {
    return { key: 'partner:shopify', cleanName: 'Shopify', partnerHandle: 'shopify' };
  }
  if (lower.includes('avada')) {
    return { key: 'brand:avada', cleanName: 'Avada Commerce', partnerHandle: 'avada-commerce' };
  }
  if (lower.includes('cwill') || lower.includes('channelwill')) {
    return { key: 'brand:channelwill', cleanName: 'Channelwill (CWILL)', partnerHandle: 'channelwill' };
  }
  if (lower.includes('booster seo') || lower.includes('booster apps')) {
    return { key: 'brand:booster-apps', cleanName: 'Booster Apps', partnerHandle: 'booster-apps' };
  }
  if (lower.includes('reconvert') || lower.includes('upsell.com')) {
    return { key: 'brand:reconvert', cleanName: 'ReConvert (Upsell.com)', partnerHandle: 'reconvert' };
  }
  if (lower.includes('tinyimg') || lower.includes('tinyseo')) {
    return { key: 'brand:tinyimg', cleanName: 'TinyIMG (TinySEO)', partnerHandle: 'tinyimg' };
  }

  // Legal suffix stripping for robust multi-app consolidation
  const legalSuffixRegex = /\b(inc\.?|llc\.?|ltd\.?|gmbh|corp\.?|corporation|co\.,?\s*ltd\.?|as|s\.l\.?|pte\.?\s*ltd\.?)\b/gi;
  const stripped = clean.replace(legalSuffixRegex, '').trim().replace(/[,\.-]+$/, '').trim();

  const key = `name:${(stripped || clean).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return { key: key || 'name:unknown', cleanName: stripped || clean };
}

export class Storage {
  private records: Map<string, ShopifyAppRecord> = new Map();
  private errors: Map<string, CrawlErrorRecord> = new Map();
  private events: CrawlerEvent[] = [];
  private state: CrawlState;

  constructor() {
    ensureDataDir();
    this.state = {
      config: { ...defaultConfig },
      stats: { ...defaultStats },
      lastCompletedPage: 0,
      processedSlugs: [],
    };
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(RECORDS_FILE)) {
        const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
        const list: ShopifyAppRecord[] = JSON.parse(raw);
        for (const item of list) {
          this.records.set(item.id, item);
        }
      }

      if (fs.existsSync(ERRORS_FILE)) {
        const raw = fs.readFileSync(ERRORS_FILE, 'utf-8');
        const list: CrawlErrorRecord[] = JSON.parse(raw);
        for (const item of list) {
          this.errors.set(item.id, item);
        }
      }

      if (fs.existsSync(EVENTS_FILE)) {
        try {
          const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
          this.events = JSON.parse(raw);
        } catch (_) {}
      }

      if (this.events.length === 0) {
        this.events.push({
          id: 'evt-init',
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Crawler initialized and ready. Directory depth: 1,035 pages.',
        });
      }

      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          ...this.state,
          ...parsed,
          stats: {
            ...this.state.stats,
            ...parsed.stats,
            // The crawler must NEVER auto-start or resume on boot/restart.
            // It must remain strictly idle until the user explicitly clicks the Start Crawl button.
            status: 'idle',
            statusMessage: 'Idle — Ready to start crawl',
            currentApp: '',
            currentAppSlug: '',
            estimatedSecondsRemaining: null,
            appsRemaining: null,
            appsPerMinute: null,
          },
        };
      }
      this.recalculateStats();
      // Ensure the clean idle state is persisted to disk immediately
      this.saveToDisk();
    } catch (err) {
      console.error('Error loading data from disk:', err);
    }
  }

  public ensureIdleState() {
    this.state.stats.status = 'idle';
    this.state.stats.statusMessage = 'Idle — Ready to start crawl';
    this.state.stats.currentApp = '';
    this.state.stats.currentAppSlug = '';
    this.state.stats.estimatedSecondsRemaining = null;
    this.state.stats.appsRemaining = null;
    this.state.stats.appsPerMinute = null;
    this.saveToDisk();
  }

  public recalculateStats() {
    let verified = 0;
    let partial = 0;
    let failed = 0;

    for (const rec of this.records.values()) {
      if (rec.status === 'Verified') verified++;
      else if (rec.status === 'Partially Verified') partial++;
      else failed++;
    }

    this.state.stats.appsProcessed = this.records.size;
    this.state.stats.appsVerified = verified;
    this.state.stats.appsPartiallyVerified = partial;
    this.state.stats.appsFailed = failed;
  }

  public saveToDisk() {
    try {
      ensureDataDir();
      const recordsArray = Array.from(this.records.values()).sort(
        (a, b) => a.overallOrder - b.overallOrder
      );
      fs.writeFileSync(RECORDS_FILE, JSON.stringify(recordsArray, null, 2), 'utf-8');

      const errorsArray = Array.from(this.errors.values());
      fs.writeFileSync(ERRORS_FILE, JSON.stringify(errorsArray, null, 2), 'utf-8');

      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');

      fs.writeFileSync(EVENTS_FILE, JSON.stringify(this.events.slice(0, 300), null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving data to disk:', err);
    }
  }

  public getRecords(options?: {
    search?: string;
    status?: string;
    category?: string;
    ratingBand?: string;
    developer?: string;
    page?: number;
    limit?: number;
    sortBy?: 'order' | 'name' | 'rating' | 'developer';
    sortDir?: 'asc' | 'desc';
  }) {
    let list = Array.from(this.records.values());

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.appName.toLowerCase().includes(q) ||
          r.devName.toLowerCase().includes(q) ||
          r.primaryCategory.toLowerCase().includes(q) ||
          r.secondaryCategory.toLowerCase().includes(q) ||
          r.devAddress.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
      );
    }

    if (options?.status && options.status !== 'all') {
      list = list.filter((r) => r.status.toLowerCase() === options.status?.toLowerCase());
    }

    if (options?.category && options.category !== 'all') {
      list = list.filter(
        (r) =>
          r.primaryCategory.toLowerCase() === options.category?.toLowerCase() ||
          r.secondaryCategory.toLowerCase() === options.category?.toLowerCase()
      );
    }

    if (options?.developer && options.developer !== 'all') {
      const devQ = options.developer.toLowerCase();
      list = list.filter(
        (r) =>
          r.devName.toLowerCase() === devQ ||
          (r.devPartnerHandle && r.devPartnerHandle.toLowerCase() === devQ)
      );
    }

    if (options?.ratingBand && options.ratingBand !== 'all') {
      const band = options.ratingBand;
      list = list.filter((r) => {
        const val = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating));
        const isMissing = isNaN(val) || val < 0 || r.rating === '-';
        if (band === 'Missing rating') return isMissing;
        if (isMissing) return false;
        if (band === '4.5–5.0') return val >= 4.5 && val <= 5.0;
        if (band === '4.0–4.4') return val >= 4.0 && val < 4.5;
        if (band === '3.0–3.9') return val >= 3.0 && val < 4.0;
        if (band === '0.0–2.9') return val >= 0.0 && val < 3.0;
        return true;
      });
    }

    // Sorting
    const sortDir = options?.sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      switch (options?.sortBy) {
        case 'name':
          return a.appName.localeCompare(b.appName) * sortDir;
        case 'rating': {
          const rA = typeof a.rating === 'number' ? a.rating : parseFloat(String(a.rating)) || 0;
          const rB = typeof b.rating === 'number' ? b.rating : parseFloat(String(b.rating)) || 0;
          return (rA - rB) * sortDir;
        }
        case 'developer':
          return a.devName.localeCompare(b.devName) * sortDir;
        case 'order':
        default:
          return (a.overallOrder - b.overallOrder) * sortDir;
      }
    });

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      records: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public getAllRecords(): ShopifyAppRecord[] {
    return Array.from(this.records.values()).sort((a, b) => a.overallOrder - b.overallOrder);
  }

  public getAllGroupedDevelopers(): GroupedDeveloper[] {
    const devMap = new Map<string, GroupedDeveloper>();

    for (const r of this.records.values()) {
      const { key, cleanName, partnerHandle } = normalizeDeveloperKey(r.devName, r.devPartnerHandle);

      if (!devMap.has(key)) {
        devMap.set(key, {
          id: key.replace(/[^a-z0-9\-]/g, '-'),
          devName: cleanName || r.devName || 'Unknown Developer',
          partnerHandle,
          devWebsite: r.devWebsite && r.devWebsite !== '-' ? r.devWebsite : '-',
          devAddress: r.devAddress && r.devAddress !== '-' ? r.devAddress : '-',
          appCount: 0,
          apps: [],
          categories: [],
          avgRating: '-',
          hasMultipleApps: false,
          lastVerifiedDate: r.lastVerifiedDate,
        });
      }

      const dev = devMap.get(key)!;

      // Prefer shorter/cleaner brand name if previous had legal noise
      if (cleanName && cleanName.length < dev.devName.length && cleanName.length >= 3) {
        dev.devName = cleanName;
      }

      // If we discover a partner handle from any app of this dev
      if (!dev.partnerHandle && partnerHandle) {
        dev.partnerHandle = partnerHandle;
      }

      // Better website if previous was '-'
      if (dev.devWebsite === '-' && r.devWebsite && r.devWebsite !== '-') {
        dev.devWebsite = r.devWebsite;
      }

      // Longest/most detailed address
      if (r.devAddress && r.devAddress !== '-') {
        if (dev.devAddress === '-' || r.devAddress.length > dev.devAddress.length) {
          dev.devAddress = r.devAddress;
        }
      }

      // Add app (avoid duplicates)
      if (!dev.apps.some((a) => a.id === r.id)) {
        dev.apps.push({
          id: r.id,
          appName: r.appName,
          rating: r.rating,
          primaryCategory: r.primaryCategory,
          secondaryCategory: r.secondaryCategory,
          shopifyUrl: r.shopifyUrl,
          sasiUrl: r.sasiUrl,
          status: r.status,
          overallOrder: r.overallOrder,
          pageNum: r.pageNum,
        });
      }

      // Collect categories
      [r.primaryCategory, r.secondaryCategory].forEach((c) => {
        if (c && c !== '-' && !dev.categories.includes(c)) {
          dev.categories.push(c);
        }
      });
    }

    // Compute metrics
    const result: GroupedDeveloper[] = [];
    for (const dev of devMap.values()) {
      dev.appCount = dev.apps.length;
      dev.hasMultipleApps = dev.appCount > 1;

      // Calculate average rating
      const numericRatings: number[] = [];
      for (const a of dev.apps) {
        const val = typeof a.rating === 'number' ? a.rating : parseFloat(String(a.rating));
        if (!isNaN(val) && val > 0) numericRatings.push(val);
      }
      if (numericRatings.length > 0) {
        const sum = numericRatings.reduce((acc, curr) => acc + curr, 0);
        dev.avgRating = Number((sum / numericRatings.length).toFixed(1));
      } else {
        dev.avgRating = '-';
      }

      // Sort apps by overallOrder
      dev.apps.sort((a, b) => a.overallOrder - b.overallOrder);
      result.push(dev);
    }

    return result;
  }

  public getGroupedDevelopers(options?: {
    search?: string;
    multiOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'apps' | 'name' | 'rating';
    sortDir?: 'asc' | 'desc';
  }) {
    let list = this.getAllGroupedDevelopers();
    const multiAppCount = list.filter((d) => d.hasMultipleApps).length;
    const singleAppCount = list.length - multiAppCount;

    if (options?.multiOnly) {
      list = list.filter((d) => d.hasMultipleApps);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.devName.toLowerCase().includes(q) ||
          d.devAddress.toLowerCase().includes(q) ||
          d.devWebsite.toLowerCase().includes(q) ||
          d.categories.some((c) => c.toLowerCase().includes(q)) ||
          d.apps.some((a) => a.appName.toLowerCase().includes(q))
      );
    }

    const sortDir = options?.sortDir === 'asc' ? 1 : -1; // Default desc for count/rating
    list.sort((a, b) => {
      switch (options?.sortBy) {
        case 'name': {
          const dir = options?.sortDir === 'desc' ? -1 : 1;
          return a.devName.localeCompare(b.devName) * dir;
        }
        case 'rating': {
          const rA = typeof a.avgRating === 'number' ? a.avgRating : parseFloat(String(a.avgRating)) || 0;
          const rB = typeof b.avgRating === 'number' ? b.avgRating : parseFloat(String(b.avgRating)) || 0;
          return (rA - rB) * sortDir;
        }
        case 'apps':
        default:
          return (a.appCount - b.appCount) * sortDir;
      }
    });

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      developers: paginated,
      total,
      multiAppCount,
      singleAppCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public saveRecord(record: ShopifyAppRecord) {
    this.records.set(record.id, record);
    if (!this.state.processedSlugs.includes(record.id)) {
      this.state.processedSlugs.push(record.id);
    }
    this.recalculateStats();
    this.state.stats.lastCheckpointTimestamp = new Date().toISOString();
    this.saveToDisk();
  }

  public hasRecord(id: string): boolean {
    return this.records.has(id);
  }

  public getRecord(id: string): ShopifyAppRecord | undefined {
    return this.records.get(id);
  }

  public saveError(error: CrawlErrorRecord) {
    this.errors.set(error.id, error);
    this.saveToDisk();
  }

  public removeError(id: string) {
    this.errors.delete(id);
    this.saveToDisk();
  }

  public getErrors(): CrawlErrorRecord[] {
    return Array.from(this.errors.values());
  }

  public getState(): CrawlState {
    return this.state;
  }

  public updateConfig(config: Partial<CrawlConfig>) {
    this.state.config = { ...this.state.config, ...config };
    this.saveToDisk();
  }

  public updateStats(stats: Partial<CrawlStats>) {
    this.state.stats = { ...this.state.stats, ...stats };
    this.saveToDisk();
  }

  public logEvent(event: Omit<CrawlerEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    const fullEvent: CrawlerEvent = {
      id: event.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type,
      message: event.message,
      details: event.details,
    };
    // Keep newest first
    this.events.unshift(fullEvent);
    if (this.events.length > 300) {
      this.events = this.events.slice(0, 300);
    }
    this.saveToDisk();
  }

  public getEvents(limit: number = 50): CrawlerEvent[] {
    return this.events.slice(0, limit);
  }

  public getTopCategories(limit: number = 5): CategoryFrequency[] {
    const counts = new Map<string, number>();
    let totalCategorized = 0;

    for (const r of this.records.values()) {
      const cat = (r.primaryCategory || '').trim();
      if (cat && cat !== '-') {
        counts.set(cat, (counts.get(cat) || 0) + 1);
        totalCategorized++;
      }
    }

    const sorted = Array.from(counts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalCategorized > 0 ? Number(((count / totalCategorized) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, limit);
  }

  public getDashboardAnalytics(filters?: {
    category?: string;
    secondaryCategory?: string;
    ratingBand?: string;
    developer?: string;
    status?: string;
    search?: string;
  }): DashboardAnalyticsResponse {
    let list = Array.from(this.records.values());

    // Search filter
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.appName.toLowerCase().includes(q) ||
          r.devName.toLowerCase().includes(q) ||
          r.primaryCategory.toLowerCase().includes(q) ||
          r.secondaryCategory.toLowerCase().includes(q) ||
          r.devAddress.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((r) => r.status.toLowerCase() === filters.status?.toLowerCase());
    }

    // Primary category filter
    if (filters?.category && filters.category !== 'all') {
      list = list.filter((r) => r.primaryCategory.toLowerCase() === filters.category?.toLowerCase());
    }

    // Secondary category filter
    if (filters?.secondaryCategory && filters.secondaryCategory !== 'all') {
      list = list.filter((r) => r.secondaryCategory.toLowerCase() === filters.secondaryCategory?.toLowerCase());
    }

    // Developer filter (by name or partner handle)
    if (filters?.developer && filters.developer !== 'all') {
      const devQ = filters.developer.toLowerCase();
      list = list.filter(
        (r) =>
          r.devName.toLowerCase() === devQ ||
          (r.devPartnerHandle && r.devPartnerHandle.toLowerCase() === devQ)
      );
    }

    // Rating band filter
    if (filters?.ratingBand && filters.ratingBand !== 'all') {
      const band = filters.ratingBand;
      list = list.filter((r) => {
        const val = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating));
        const isMissing = isNaN(val) || val < 0 || r.rating === '-';
        if (band === 'Missing rating') return isMissing;
        if (isMissing) return false;
        if (band === '4.5–5.0') return val >= 4.5 && val <= 5.0;
        if (band === '4.0–4.4') return val >= 4.0 && val < 4.5;
        if (band === '3.0–3.9') return val >= 3.0 && val < 4.0;
        if (band === '0.0–2.9') return val >= 0.0 && val < 3.0;
        return true;
      });
    }

    // 1. KPIs
    const totalApps = list.length;
    const uniqueDevKeys = new Set<string>();
    let verifiedApps = 0;
    let partiallyVerifiedApps = 0;
    let unverifiedApps = 0;
    let missingDevWebsitesCount = 0;
    const primaryCategoriesSet = new Set<string>();
    let validRatingsSum = 0;
    let totalRatedApps = 0;

    for (const r of list) {
      const { key } = normalizeDeveloperKey(r.devName, r.devPartnerHandle);
      uniqueDevKeys.add(key);

      if (r.status === 'Verified') verifiedApps++;
      else if (r.status === 'Partially Verified') partiallyVerifiedApps++;
      else unverifiedApps++;

      if (!r.devWebsite || r.devWebsite.trim() === '-' || r.devWebsite.trim() === '') {
        missingDevWebsitesCount++;
      }

      const primCat = (r.primaryCategory || '').trim();
      if (primCat && primCat !== '-') {
        primaryCategoriesSet.add(primCat);
      }

      const numericRating = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating));
      if (!isNaN(numericRating) && numericRating >= 0 && r.rating !== '-') {
        validRatingsSum += numericRating;
        totalRatedApps++;
      }
    }

    const averageMarketplaceRating =
      totalRatedApps > 0 ? Number((validRatingsSum / totalRatedApps).toFixed(2)) : null;

    const kpis: DashboardKPIs = {
      totalApps,
      uniqueDevelopersCount: uniqueDevKeys.size,
      verifiedApps,
      partiallyVerifiedApps,
      unverifiedApps,
      missingDevWebsitesCount,
      totalPrimaryCategoriesCount: primaryCategoriesSet.size,
      averageMarketplaceRating,
      totalRatedApps,
    };

    // 2. Top Primary Categories (Sorted descending, exclude missing)
    const categoryMap = new Map<string, { count: number; ratings: number[] }>();
    let categorizedTotal = 0;

    for (const r of list) {
      const cat = (r.primaryCategory || '').trim();
      if (cat && cat !== '-') {
        categorizedTotal++;
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { count: 0, ratings: [] });
        }
        const entry = categoryMap.get(cat)!;
        entry.count++;
        const numRating = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating));
        if (!isNaN(numRating) && numRating >= 0 && r.rating !== '-') {
          entry.ratings.push(numRating);
        }
      }
    }

    const allCategories: CategoryDistributionItem[] = Array.from(categoryMap.entries())
      .map(([category, data]) => {
        const ratedCount = data.ratings.length;
        const avg = ratedCount > 0 ? Number((data.ratings.reduce((a, b) => a + b, 0) / ratedCount).toFixed(1)) : null;
        const min = ratedCount > 0 ? Math.min(...data.ratings) : null;
        const max = ratedCount > 0 ? Math.max(...data.ratings) : null;
        const percentage = categorizedTotal > 0 ? Number(((data.count / categorizedTotal) * 100).toFixed(1)) : 0;
        return {
          category,
          count: data.count,
          percentage,
          avgRating: avg,
          minRating: min,
          maxRating: max,
          ratedCount,
        };
      })
      .sort((a, b) => b.count - a.count);

    const topCategories = allCategories.slice(0, 10);

    // 3. App Rating Distribution
    const ratingBuckets: Record<'4.5–5.0' | '4.0–4.4' | '3.0–3.9' | '0.0–2.9' | 'Missing rating', number> = {
      '4.5–5.0': 0,
      '4.0–4.4': 0,
      '3.0–3.9': 0,
      '0.0–2.9': 0,
      'Missing rating': 0,
    };

    for (const r of list) {
      const val = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating));
      if (isNaN(val) || val < 0 || r.rating === '-') {
        ratingBuckets['Missing rating']++;
      } else if (val >= 4.5 && val <= 5.0) {
        ratingBuckets['4.5–5.0']++;
      } else if (val >= 4.0 && val < 4.5) {
        ratingBuckets['4.0–4.4']++;
      } else if (val >= 3.0 && val < 4.0) {
        ratingBuckets['3.0–3.9']++;
      } else {
        ratingBuckets['0.0–2.9']++;
      }
    }

    const ratingBandColors: Record<string, string> = {
      '4.5–5.0': '#10b981', // Emerald for top tier
      '4.0–4.4': '#626b78', // Neutral gray accent
      '3.0–3.9': '#f59e0b', // Amber for average
      '0.0–2.9': '#ef4444', // Red for low rating
      'Missing rating': '#94a3b8', // Neutral muted gray
    };

    const ratingDistribution: RatingBandItem[] = (
      ['4.5–5.0', '4.0–4.4', '3.0–3.9', '0.0–2.9', 'Missing rating'] as const
    ).map((band) => ({
      band,
      count: ratingBuckets[band],
      percentage: totalApps > 0 ? Number(((ratingBuckets[band] / totalApps) * 100).toFixed(1)) : 0,
      color: ratingBandColors[band],
    }));

    // 4. Developer Leaderboard (Top 10 Developers by App Count)
    const devMap = new Map<string, {
      id: string;
      devName: string;
      partnerHandle?: string;
      appCount: number;
      ratings: number[];
      missingWebsitesCount: number;
      devWebsite: string;
      devAddress: string;
    }>();

    for (const r of list) {
      const { key, cleanName, partnerHandle } = normalizeDeveloperKey(r.devName, r.devPartnerHandle);
      if (!devMap.has(key)) {
        devMap.set(key, {
          id: key.replace(/[^a-z0-9\-]/g, '-'),
          devName: cleanName || r.devName || 'Unknown Developer',
          partnerHandle,
          appCount: 0,
          ratings: [],
          missingWebsitesCount: 0,
          devWebsite: r.devWebsite && r.devWebsite !== '-' ? r.devWebsite : '-',
          devAddress: r.devAddress && r.devAddress !== '-' ? r.devAddress : '-',
        });
      }

      const dev = devMap.get(key)!;
      dev.appCount++;

      if (!dev.partnerHandle && partnerHandle) dev.partnerHandle = partnerHandle;
      if (dev.devWebsite === '-' && r.devWebsite && r.devWebsite !== '-') dev.devWebsite = r.devWebsite;
      if (dev.devAddress === '-' && r.devAddress && r.devAddress !== '-') dev.devAddress = r.devAddress;

      if (!r.devWebsite || r.devWebsite === '-' || r.devWebsite.trim() === '') {
        dev.missingWebsitesCount++;
      }

      const numVal = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating));
      if (!isNaN(numVal) && numVal >= 0 && r.rating !== '-') {
        dev.ratings.push(numVal);
      }
    }

    const topDevelopers: DeveloperLeaderboardItem[] = Array.from(devMap.values())
      .map((d) => {
        const avg = d.ratings.length > 0 ? Number((d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length).toFixed(1)) : 'N/A';
        return {
          id: d.id,
          devName: d.devName,
          partnerHandle: d.partnerHandle,
          appCount: d.appCount,
          avgRating: avg,
          missingWebsitesCount: d.missingWebsitesCount,
          devWebsite: d.devWebsite,
          devAddress: d.devAddress,
        };
      })
      .sort((a, b) => {
        if (b.appCount !== a.appCount) return b.appCount - a.appCount;
        const rA = typeof a.avgRating === 'number' ? a.avgRating : 0;
        const rB = typeof b.avgRating === 'number' ? b.avgRating : 0;
        return rB - rA;
      })
      .slice(0, 10);

    // 5. App Launch Trends (by explicitly verified original launch year)
    const yearCounts = new Map<number, number>();
    let excludedLaunchDatesCount = 0;

    for (const r of list) {
      const rawLaunch = (r.launchDate || '').trim();
      if (!rawLaunch || rawLaunch === '-' || rawLaunch.toLowerCase() === 'n/a') {
        excludedLaunchDatesCount++;
        continue;
      }

      const match = rawLaunch.match(/\b(20\d{2}|19\d{2})\b/);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= 2006 && year <= new Date().getFullYear() + 1) {
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
          continue;
        }
      }
      excludedLaunchDatesCount++;
    }

    const verifiedLaunchYearsTotal = Array.from(yearCounts.values()).reduce((a, b) => a + b, 0);
    const launchYearTrendsList: LaunchYearTrendItem[] = Array.from(yearCounts.entries())
      .map(([year, count]) => ({
        year,
        count,
        percentage: verifiedLaunchYearsTotal > 0 ? Number(((count / verifiedLaunchYearsTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.year - b.year);

    const hasSufficientData = verifiedLaunchYearsTotal >= 3 && launchYearTrendsList.length >= 2;

    // 6. Category Rating Comparison
    const categoryComparison: CategoryComparisonItem[] = allCategories.map((c) => ({
      category: c.category,
      totalApps: c.count,
      ratedApps: c.ratedCount,
      avgRating: c.avgRating !== null ? c.avgRating : 'N/A',
      highestRating: c.maxRating !== null ? c.maxRating : 'N/A',
      lowestRating: c.minRating !== null ? c.minRating : 'N/A',
    }));

    // 7. Data Quality Overview (calculated across the full dataset)
    const allRecords = Array.from(this.records.values());
    const totalRecs = allRecords.length;
    let fullVer = 0;
    let partVer = 0;
    let notVer = 0;
    let missCat = 0;
    let missDev = 0;
    let missWeb = 0;
    let missLaunch = 0;

    for (const r of allRecords) {
      if (r.status === 'Verified') fullVer++;
      else if (r.status === 'Partially Verified') partVer++;
      else notVer++;

      if (!r.primaryCategory || r.primaryCategory.trim() === '-' || r.primaryCategory.trim() === '') missCat++;
      if (!r.devName || r.devName.trim() === '-' || r.devName.trim() === '' || r.devName.toLowerCase() === 'unknown developer') missDev++;
      if (!r.devWebsite || r.devWebsite.trim() === '-' || r.devWebsite.trim() === '') missWeb++;
      if (!r.launchDate || r.launchDate.trim() === '-' || r.launchDate.trim() === '') missLaunch++;
    }

    const calcPct = (cnt: number) => (totalRecs > 0 ? Number(((cnt / totalRecs) * 100).toFixed(1)) : 0);

    const dataQuality: DataQualitySummary = {
      totalRecords: totalRecs,
      fullyVerifiedCount: fullVer,
      fullyVerifiedPercent: calcPct(fullVer),
      partiallyVerifiedCount: partVer,
      partiallyVerifiedPercent: calcPct(partVer),
      unverifiedCount: notVer,
      unverifiedPercent: calcPct(notVer),
      missingPrimaryCategoryCount: missCat,
      missingPrimaryCategoryPercent: calcPct(missCat),
      missingDevNameCount: missDev,
      missingDevNamePercent: calcPct(missDev),
      missingDevWebsiteCount: missWeb,
      missingDevWebsitePercent: calcPct(missWeb),
      missingLaunchDateCount: missLaunch,
      missingLaunchDatePercent: calcPct(missLaunch),
      duplicateCount: this.state.stats.duplicateCount || 0,
      failedRecordsCount: this.errors.size,
    };

    // Filter dropdown options
    const allUniqueCategories = Array.from(
      new Set(allRecords.map((r) => r.primaryCategory).filter((c) => c && c !== '-'))
    ).sort();
    const allUniqueDevs = Array.from(
      new Set(allRecords.map((r) => r.devName).filter((d) => d && d !== '-'))
    ).sort();

    return {
      kpis,
      topCategories,
      allCategories,
      ratingDistribution,
      topDevelopers,
      launchYearTrends: {
        trends: launchYearTrendsList,
        excludedCount: excludedLaunchDatesCount,
        hasSufficientData,
      },
      categoryComparison,
      dataQuality,
      availableCategories: allUniqueCategories,
      availableDevelopers: allUniqueDevs,
      lastUpdatedTimestamp: this.state.stats.lastCheckpointTimestamp || new Date().toISOString(),
    };
  }

  public resetAll() {
    this.records.clear();
    this.errors.clear();
    this.events = [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        message: 'Crawler state, records, and events reset by user.',
      },
    ];
    this.state = {
      config: { ...defaultConfig },
      stats: { ...defaultStats },
      lastCompletedPage: 0,
      processedSlugs: [],
    };
    this.saveToDisk();
  }
}

export const storage = new Storage();
