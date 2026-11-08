import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCw,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Layers,
  ShieldCheck,
  Database,
  Clock,
  Settings,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  Eye,
  Trash2,
  Star,
  Globe,
  MapPin,
  Building,
  Calendar,
  AlertCircle,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Activity,
  History,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import UserAnalyticsDashboard from './components/UserAnalyticsDashboard';
import {
  ShopifyAppRecord,
  CrawlErrorRecord,
  CrawlStats,
  CrawlConfig,
  GroupedDeveloper,
  CrawlerEvent,
  CategoryFrequency,
  DashboardAnalyticsResponse,
} from './types';
import { useToast } from './context/ToastContext';

const CATEGORY_COLORS = ['#2563eb', '#3b82f6', '#0284c7', '#0d9488', '#10b981'];

const CategoryChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CategoryFrequency;
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs space-y-1">
        <p className="font-semibold text-slate-900 text-sm">{data.category}</p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-slate-900 font-mono font-bold text-sm">
            {data.count} {data.count === 1 ? 'app' : 'apps'}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] border border-slate-200">
            {data.percentage}% of categorized
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'developers' | 'records' | 'errors' | 'docs'>('monitor');
  const [stats, setStats] = useState<CrawlStats>({
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
  });

  const [config, setConfig] = useState<CrawlConfig>({
    directoryUrl: 'https://sasi.heymantle.com/top-reviewed',
    startPage: 1,
    endPage: null,
    maxApps: null,
    batchSize: 5,
    requestDelayMs: 600,
    maxRetries: 3,
    testMode: false,
    exportVerifiedOnly: false,
  });

  const [records, setRecords] = useState<ShopifyAppRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<CrawlErrorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShopifyAppRecord | null>(null);

  // View mode: 'user' (User Analytics Dashboard) or 'admin' (Crawler Admin Console)
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');

  // Dedicated User Analytics Dashboard state
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFilters, setAnalyticsFilters] = useState<{
    category: string;
    ratingBand: string;
    status: string;
    developer: string;
    search: string;
  }>({
    category: 'all',
    ratingBand: 'all',
    status: 'all',
    developer: 'all',
    search: '',
  });

  // Table filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingBandFilter, setRatingBandFilter] = useState('all');
  const [developerFilter, setDeveloperFilter] = useState('all');
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(25);
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'rating' | 'developer'>('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [configOpen, setConfigOpen] = useState(false);
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Developer state (Grouped by Company)
  const [developers, setDevelopers] = useState<GroupedDeveloper[]>([]);
  const [totalDevs, setTotalDevs] = useState(0);
  const [multiAppDevsCount, setMultiAppDevsCount] = useState(0);
  const [singleAppDevsCount, setSingleAppDevsCount] = useState(0);
  const [devsLoading, setDevsLoading] = useState(false);
  const [devSearch, setDevSearch] = useState('');
  const [devMultiOnly, setDevMultiOnly] = useState(false);
  const [devSortBy, setDevSortBy] = useState<'apps' | 'name' | 'rating'>('apps');
  const [devSortDir, setDevSortDir] = useState<'asc' | 'desc'>('desc');
  const [devPage, setDevPage] = useState(1);
  const [devLimit, setDevLimit] = useState(25);

  // Polling ref and editing guard
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingConfigRef = useRef<boolean>(false);

  // Visualization & Crawler Events state
  const [topCategories, setTopCategories] = useState<CategoryFrequency[]>([]);
  const [crawlerEvents, setCrawlerEvents] = useState<CrawlerEvent[]>([]);
  const [eventsFilter, setEventsFilter] = useState<'all' | 'verified' | 'pages' | 'rate-limit' | 'errors'>('all');
  const [eventsSortOrder, setEventsSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/crawl/status');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        if (data.config && !isEditingConfigRef.current) {
          setConfig((prev) => ({ ...prev, ...data.config }));
        }
        if (data.topCategories) {
          setTopCategories(data.topCategories);
        }
        if (data.recentEvents) {
          setCrawlerEvents(data.recentEvents);
        }
      }
    } catch (e) {
      // Graceful fallback during dev server reloads
    }
  };

  // Save config to server
  const handleSaveConfig = async (newConfig?: Partial<CrawlConfig>) => {
    const toSave = newConfig ? { ...config, ...newConfig } : config;
    try {
      const res = await fetch('/api/crawl/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
        showToast('Crawler configuration updated and saved!', 'success');
      }
    } catch (e: any) {
      showToast('Failed to save config: ' + e.message, 'error');
    }
  };

  // Fetch user analytics overview (Semrush/Ahrefs pre-aggregated metrics)
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const params = new URLSearchParams();
      if (analyticsFilters.category && analyticsFilters.category !== 'all') {
        params.append('category', analyticsFilters.category);
      }
      if (analyticsFilters.ratingBand && analyticsFilters.ratingBand !== 'all') {
        params.append('ratingBand', analyticsFilters.ratingBand);
      }
      if (analyticsFilters.status && analyticsFilters.status !== 'all') {
        params.append('status', analyticsFilters.status);
      }
      if (analyticsFilters.developer && analyticsFilters.developer !== 'all') {
        params.append('developer', analyticsFilters.developer);
      }
      if (analyticsFilters.search) {
        params.append('search', analyticsFilters.search);
      }

      const res = await fetch(`/api/analytics/overview?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      // Graceful handling
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch records
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(tablePage),
        limit: String(tableLimit),
        sortBy,
        sortDir,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (ratingBandFilter !== 'all') params.append('ratingBand', ratingBandFilter);
      if (developerFilter !== 'all') params.append('developer', developerFilter);

      const res = await fetch(`/api/crawl/records?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setTotalRecords(data.total);
        if (data.availableCategories) {
          setAvailableCategories(data.availableCategories);
        }
      }
    } catch (e) {
      // Graceful handling
    } finally {
      setLoading(false);
    }
  };

  // Fetch grouped developers
  const fetchDevelopers = async () => {
    try {
      setDevsLoading(true);
      const params = new URLSearchParams({
        page: String(devPage),
        limit: String(devLimit),
        sortBy: devSortBy,
        sortDir: devSortDir,
      });
      if (devSearch) params.append('search', devSearch);
      if (devMultiOnly) params.append('multiOnly', 'true');

      const res = await fetch(`/api/crawl/developers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDevelopers(data.developers || []);
        setTotalDevs(data.total || 0);
        setMultiAppDevsCount(data.multiAppCount || 0);
        setSingleAppDevsCount(data.singleAppCount || 0);
      }
    } catch (e) {
      // Graceful handling
    } finally {
      setDevsLoading(false);
    }
  };

  // Fetch errors
  const fetchErrors = async () => {
    try {
      setErrorsLoading(true);
      const res = await fetch('/api/crawl/errors');
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch (e) {
      // Graceful handling
    } finally {
      setErrorsLoading(false);
    }
  };

  // Setup initial data load and polling
  useEffect(() => {
    fetchStatus();
    fetchRecords();
    fetchDevelopers();
    fetchErrors();
    fetchAnalytics();

    const interval = setInterval(() => {
      fetchStatus();
      if (stats.status === 'running') {
        fetchRecords();
        fetchDevelopers();
        fetchErrors();
        fetchAnalytics();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [stats.status]);

  // When analytics filters change, reload analytics
  useEffect(() => {
    fetchAnalytics();
  }, [analyticsFilters]);

  // When filters or sorting change, reload records
  useEffect(() => {
    fetchRecords();
  }, [tablePage, tableLimit, searchQuery, statusFilter, categoryFilter, ratingBandFilter, developerFilter, sortBy, sortDir]);

  // When developer filters change, reload developers
  useEffect(() => {
    fetchDevelopers();
  }, [devPage, devLimit, devSearch, devMultiOnly, devSortBy, devSortDir]);

  // When switching to user view, ensure fresh analytics and developers are retrieved
  useEffect(() => {
    if (viewMode === 'user') {
      fetchAnalytics();
      fetchDevelopers();
      fetchRecords();
      fetchStatus();
    }
  }, [viewMode]);

  // Crawl Actions
  const handleStartCrawl = async (isTest: boolean = false, customEndPage?: number) => {
    setActionLoading(true);
    isEditingConfigRef.current = false;
    try {
      let targetEnd: number | null = null;
      if (isTest) {
        targetEnd = 1;
      } else if (customEndPage !== undefined) {
        targetEnd = customEndPage;
      } else if (config.endPage && Number(config.endPage) >= 1) {
        targetEnd = Number(config.endPage);
      } else {
        targetEnd = 1035;
      }

      const payload: Partial<CrawlConfig> = isTest
        ? {
            ...config,
            testMode: true,
            maxApps: 5,
            endPage: 1,
          }
        : {
            ...config,
            testMode: false,
            endPage: targetEnd,
            maxApps: null,
          };

      // Ensure config is also persisted on server
      await fetch('/api/crawl/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        showToast(
          isTest
            ? 'Test crawl started (5 apps sample verification)'
            : `Crawl started! Processing pages ${config.startPage || 1} to ${targetEnd} (${targetEnd - (config.startPage || 1) + 1} pages total).`,
          'success'
        );
        fetchRecords();
        fetchDevelopers();
      } else {
        showToast(data.error || 'Failed to start crawl', 'error');
      }
    } catch (e: any) {
      showToast('Error starting crawl: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseCrawl = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/crawl/pause', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        showToast('Crawl paused safely', 'info');
      }
    } catch (e: any) {
      showToast('Pause error: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeCrawl = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/crawl/resume', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        showToast('Crawl resumed from checkpoint', 'success');
      }
    } catch (e: any) {
      showToast('Resume error: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopCrawl = async () => {
    setConfirmDialog({
      title: 'Stop Crawl',
      message: 'Are you sure you want to stop the crawl? All completed records will remain safely saved in the workbook.',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(true);
        try {
          const res = await fetch('/api/crawl/stop', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setStats(data.stats);
            showToast('Crawl stopped', 'info');
          }
        } catch (e: any) {
          showToast('Stop error: ' + e.message, 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleRetryFailed = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/crawl/retry-failed', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Retry completed', 'success');
      fetchRecords();
      fetchErrors();
    } catch (e: any) {
      showToast('Retry error: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setConfirmDialog({
      title: 'Reset All Crawl Data',
      message: 'Warning: This will clear all collected records, analytics, companies, and error logs across both Admin and User views. Are you sure you want to proceed?',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(true);

        // Instantly zero out all client states so both Admin and User views update immediately
        setRecords([]);
        setTotalRecords(0);
        setAvailableCategories([]);
        setDevelopers([]);
        setTotalDevs(0);
        setMultiAppDevsCount(0);
        setSingleAppDevsCount(0);
        setSelectedRecord(null);
        setErrors([]);
        setTopCategories([]);
        setTablePage(1);
        setDevPage(1);
        setAnalytics(null);
        setSearchQuery('');
        setStatusFilter('all');
        setCategoryFilter('all');
        setRatingBandFilter('all');
        setDeveloperFilter('all');
        setAnalyticsFilters({
          category: 'all',
          ratingBand: 'all',
          status: 'all',
          developer: 'all',
          search: '',
        });

        try {
          const res = await fetch('/api/crawl/reset', { method: 'POST' });
          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }
          showToast('All crawl records and user analytics have been reset to zero', 'info', 'Data Reset');
          // Re-fetch everything concurrently to ensure client is 100% in sync with zeroed server storage
          await Promise.all([
            fetchStatus(),
            fetchRecords(),
            fetchDevelopers(),
            fetchErrors(),
            fetchAnalytics(),
          ]);
        } catch (e: any) {
          showToast('Reset error: ' + e.message, 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}h ${remM}m ${s}s`;
    }
    return `${m}m ${s}s`;
  };

  const formatEta = (sec: number | null | undefined) => {
    if (sec === null || sec === undefined) return 'Calculating...';
    if (sec <= 0) return 'Almost done';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}h ${remM}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  const formatEventTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const filteredEvents = crawlerEvents
    .filter((evt) => {
      if (eventsFilter === 'all') return true;
      if (eventsFilter === 'verified') {
        return evt.type === 'success' || evt.message.toLowerCase().includes('verified');
      }
      if (eventsFilter === 'pages') {
        return evt.message.toLowerCase().includes('page');
      }
      if (eventsFilter === 'rate-limit') {
        return evt.type === 'rate-limit' || evt.message.toLowerCase().includes('rate limit');
      }
      if (eventsFilter === 'errors') {
        return evt.type === 'error' || evt.message.toLowerCase().includes('failed');
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return eventsSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  const progressPercent = stats.totalPagesDiscovered > 0
    ? Math.min(100, Math.round((stats.pagesCompleted / stats.totalPagesDiscovered) * 100))
    : stats.appsProcessed > 0 ? 100 : 0;

  // Render dedicated User Analytics Dashboard when viewMode is 'user'
  if (viewMode === 'user') {
    return (
      <>
        <UserAnalyticsDashboard
          analytics={analytics}
          loading={analyticsLoading}
          onRefresh={() => {
            fetchAnalytics();
            fetchRecords();
            fetchDevelopers();
            fetchStatus();
          }}
          onReset={handleReset}
          onSwitchToAdmin={() => setViewMode('admin')}
          records={records}
          totalRecords={totalRecords}
          recordsLoading={loading}
          developers={developers}
          totalDevelopers={totalDevs}
          crawlerStats={stats}
          crawlerEvents={crawlerEvents}
          selectedRecord={selectedRecord}
          onSelectRecord={setSelectedRecord}
          filters={analyticsFilters}
          onFilterChange={(newFilters) => {
            setAnalyticsFilters(newFilters);
            setCategoryFilter(newFilters.category);
            setRatingBandFilter(newFilters.ratingBand);
            setDeveloperFilter(newFilters.developer);
            setSearchQuery(newFilters.search);
            setStatusFilter(newFilters.status);
            setTablePage(1);
          }}
          tablePage={tablePage}
          onPageChange={(page) => setTablePage(page)}
        />
        {/* Confirmation Modal if triggered while in User View */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-[#20242B]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E1E4E8] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-bold text-[#20242B]">{confirmDialog.title}</h4>
              </div>
              <p className="text-xs text-[#69717D] leading-relaxed">{confirmDialog.message}</p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setConfirmDialog(null);
                    showToast('Action cancelled', 'info');
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#F0F2F5] text-xs font-medium text-[#20242B] border border-[#D6DAE0] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900">
                Shopify App Directory Crawler
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                SASI Top Reviewed + App Store
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Admin Extraction Console & Verification Pipeline
            </p>
          </div>
        </div>

        {/* Global Status & Quick Exports */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                stats.status === 'running'
                  ? 'bg-emerald-500 animate-pulse'
                  : stats.status === 'paused'
                  ? 'bg-amber-500'
                  : stats.status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="capitalize text-slate-900 font-semibold">{stats.status}</span>
            {stats.status === 'running' && (
              <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                <span>{formatSeconds(stats.elapsedSeconds)}</span>
                {typeof stats.estimatedSecondsRemaining === 'number' && (
                  <span className="text-slate-900 font-semibold">• ETA: ~{formatEta(stats.estimatedSecondsRemaining)}</span>
                )}
              </span>
            )}
          </div>

          {/* Switch to User Analytics Dashboard Button */}
          <button
            onClick={() => {
              setViewMode('user');
              showToast('Switched to User Analytics Dashboard', 'action', 'View Mode');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Open Market Analytics & Insights Dashboard (User View)"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>User Analytics View</span>
          </button>

          {/* Developers CSV Export Button */}
          <a
            href="/api/export/developers-csv"
            download="Grouped_Shopify_Developers.csv"
            onClick={() => {
              showToast('Downloading Multi-App Companies CSV...', 'success', 'Export Started');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Devs CSV</span>
          </a>

          {/* Excel Export Button */}
          <a
            href="/api/export/excel"
            download="Shopify_Apps_Top_Reviewed_Directory.xlsx"
            onClick={() => {
              showToast('Downloading comprehensive 4-sheet Excel workbook...', 'success', 'Export Started');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span>Export Excel (.xlsx)</span>
          </a>

          {/* CSV Export Button */}
          <a
            href="/api/export/csv"
            download="Shopify_Apps_Top_Reviewed_Directory.csv"
            onClick={() => {
              showToast('Downloading All Apps CSV data...', 'success', 'Export Started');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Apps CSV</span>
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <div className="flex space-x-1">
          <button
            onClick={() => {
              setActiveTab('monitor');
              showToast('Switched to Live Dashboard & Monitor tab', 'info', 'Admin Tabs');
            }}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'monitor'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Dashboard & Monitor
          </button>
          <button
            onClick={() => {
              setActiveTab('developers');
              showToast('Switched to Grouped Developers tab', 'info', 'Admin Tabs');
            }}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'developers'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Grouped Developers ({totalDevs})</span>
            {multiAppDevsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {multiAppDevsCount} multi-app
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('records');
              showToast('Switched to All Apps directory table', 'info', 'Admin Tabs');
            }}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'records'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4" />
            All Apps ({totalRecords})
          </button>
          <button
            onClick={() => {
              setActiveTab('errors');
              showToast('Switched to Crawl Errors audit tab', 'info', 'Admin Tabs');
            }}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'errors'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Crawl Errors ({errors.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('docs');
              showToast('Switched to Read Me & Architecture tab', 'info', 'Admin Tabs');
            }}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'docs'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Info className="w-4 h-4" />
            Read Me & Architecture
          </button>
        </div>

        <button
          onClick={() => {
            const next = !configOpen;
            setConfigOpen(next);
            showToast(next ? 'Opened Crawl Configuration drawer' : 'Closed Crawl Configuration drawer', 'info', 'Settings');
          }}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 transition cursor-pointer shadow-xs"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Crawl Configuration</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Configuration Drawer/Card (Collapsible or toggleable) */}
        {configOpen && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Crawler Settings & Batch Parameters</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => {
                    isEditingConfigRef.current = false;
                    setConfigOpen(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 transition"
                >
                  Close ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Starting Directory URL</label>
                <input
                  type="text"
                  value={config.directoryUrl}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) => setConfig({ ...config, directoryUrl: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Starting Page Number</label>
                <input
                  type="number"
                  min="1"
                  max="1035"
                  value={config.startPage}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setConfig({ ...config, startPage: val });
                  }}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-900 font-semibold block">Ending Page Number (Optional)</label>
                  <span className="text-[10px] text-slate-500 font-mono">Max: 1,035 Pages</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="1035"
                  placeholder="All 1035 pages (e.g. 490)"
                  value={config.endPage ?? ''}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    const updated = { ...config, endPage: val };
                    setConfig(updated);
                  }}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-md px-3 py-1.5 text-slate-900 font-mono font-bold text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  Set to <strong>490</strong> to crawl only up to page 490, or leave blank to crawl all 1,035 pages.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, endPage: 50 };
                      setConfig(updated);
                      handleSaveConfig(updated);
                      showToast('Target scope set: Pages 1 to 50 (Crawler remains idle)', 'action', 'Crawl Scope');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 transition cursor-pointer"
                  >
                    50 Pgs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, endPage: 100 };
                      setConfig(updated);
                      handleSaveConfig(updated);
                      showToast('Target scope set: Pages 1 to 100 (Crawler remains idle)', 'action', 'Crawl Scope');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 transition cursor-pointer"
                  >
                    100 Pgs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, endPage: 490 };
                      setConfig(updated);
                      handleSaveConfig(updated);
                      showToast('Target scope set: Pages 1 to 490 (Crawler remains idle)', 'action', 'Crawl Scope');
                    }}
                    className="px-2.5 py-0.5 rounded bg-blue-50 border border-blue-300 text-[10px] text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
                  >
                    Page 490
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, endPage: 1035 };
                      setConfig(updated);
                      handleSaveConfig(updated);
                      showToast('Target scope set: All 1,035 Pages (Crawler remains idle)', 'action', 'Crawl Scope');
                    }}
                    className="px-2.5 py-0.5 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-600 hover:text-slate-900 font-medium transition cursor-pointer"
                  >
                    All 1,035 Pgs
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Max Apps Limit (Optional)</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  value={config.maxApps ?? ''}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxApps: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Batch Size (Concurrent / chunk)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.batchSize}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 5 })}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Request Delay (ms)</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={config.requestDelayMs}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) =>
                    setConfig({ ...config, requestDelayMs: parseInt(e.target.value) || 500 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Max Retries on Failure</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxRetries}
                  onFocus={() => { isEditingConfigRef.current = true; }}
                  onChange={(e) =>
                    setConfig({ ...config, maxRetries: parseInt(e.target.value) || 3 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  Save All Parameters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: MONITOR & CONTROLS */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* Primary Action Controls Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              {/* Quick Crawl Scope Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-900 font-semibold">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Target Crawl Scope:</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Page</span>
                    <input
                      type="number"
                      min="1"
                      max="1035"
                      value={config.startPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        const upd = { ...config, startPage: val };
                        setConfig(upd);
                        handleSaveConfig(upd);
                      }}
                      className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="number"
                      min="1"
                      max="1035"
                      placeholder="1035"
                      value={config.endPage ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        const upd = { ...config, endPage: val };
                        setConfig(upd);
                        handleSaveConfig(upd);
                      }}
                      className="w-20 bg-white border border-slate-300 focus:border-blue-600 rounded px-2 py-1 text-slate-900 font-bold text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs font-mono text-slate-500 font-medium">
                      ({((config.endPage || 1035) - config.startPage + 1)} total pages)
                    </span>
                  </div>
                </div>

                {/* Scope Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-500 mr-1">Quick Scope:</span>
                  <button
                    onClick={() => {
                      const upd = { ...config, startPage: 1, endPage: 50 };
                      setConfig(upd);
                      handleSaveConfig(upd);
                      showToast('Target scope set: 50 pages (Idle — Click Start Crawl to begin)', 'action', 'Crawl Scope');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] border transition cursor-pointer ${
                      config.endPage === 50
                        ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    50 Pgs
                  </button>
                  <button
                    onClick={() => {
                      const upd = { ...config, startPage: 1, endPage: 100 };
                      setConfig(upd);
                      handleSaveConfig(upd);
                      showToast('Target scope set: 100 pages (Idle — Click Start Crawl to begin)', 'action', 'Crawl Scope');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] border transition cursor-pointer ${
                      config.endPage === 100
                        ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    100 Pgs
                  </button>
                  <button
                    onClick={() => {
                      const upd = { ...config, startPage: 1, endPage: 490 };
                      setConfig(upd);
                      handleSaveConfig(upd);
                      showToast('Target scope set: 490 pages (Idle — Click Start Crawl to begin)', 'action', 'Crawl Scope');
                    }}
                    className={`px-3 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${
                      config.endPage === 490
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Page 490 (490 Pgs)
                  </button>
                  <button
                    onClick={() => {
                      const upd = { ...config, startPage: 1, endPage: 1035 };
                      setConfig(upd);
                      handleSaveConfig(upd);
                      showToast('Target scope set: All 1,035 pages (Idle — Click Start Crawl to begin)', 'action', 'Crawl Scope');
                    }}
                    className={`px-3 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                      !config.endPage || config.endPage === 1035
                        ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    All 1,035 Pages
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  {stats.status !== 'running' ? (
                    <>
                      <button
                        onClick={() => handleStartCrawl(false)}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>
                          {config.endPage && config.endPage < 1035
                            ? `Start Crawl (Pages ${config.startPage || 1} to ${config.endPage} — ${config.endPage - (config.startPage || 1) + 1} Pages)`
                            : `Start Full Crawl (All 1,035 Pages)`}
                        </span>
                      </button>

                      <button
                        onClick={() => handleStartCrawl(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Run Test Crawl (5 Apps)</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handlePauseCrawl}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause Crawl</span>
                      </button>

                      <button
                        onClick={handleStopCrawl}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Square className="w-4 h-4" />
                        <span>Stop Crawl</span>
                      </button>
                    </>
                  )}

                  {stats.status === 'paused' && (
                    <button
                      onClick={handleResumeCrawl}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Resume from Checkpoint</span>
                    </button>
                  )}

                  {errors.length > 0 && stats.status !== 'running' && (
                    <button
                      onClick={handleRetryFailed}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-amber-50 text-amber-700 text-xs font-medium border border-amber-300 transition cursor-pointer shadow-xs"
                    >
                      <RotateCw className="w-4 h-4 text-amber-600" />
                      <span>Retry Failed Apps ({errors.length})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs transition cursor-pointer font-medium"
                    title="Clear all crawl state and collected data"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Data</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Progress Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>Live Extraction Pipeline</span>
                    {stats.status === 'running' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Active Stream
                      </span>
                    )}
                    {stats.status === 'idle' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Idle — Waiting to Start
                      </span>
                    )}
                    {stats.status === 'paused' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Paused
                      </span>
                    )}
                    {stats.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completed (Idle)
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {stats.status === 'idle'
                      ? 'Crawler is idle. Click "Start Crawl" above to begin crawling directory listings.'
                      : stats.statusMessage}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {(stats.status === 'running' || stats.status === 'paused' || typeof stats.estimatedSecondsRemaining === 'number') && (
                    <div className="text-right border-r border-slate-200 pr-4 hidden sm:block">
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Est. Remaining (ETA)</span>
                      </div>
                      <div className="text-base font-bold font-mono text-slate-900">
                        {formatEta(stats.estimatedSecondsRemaining)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {stats.recentAverageAppSeconds
                          ? `${stats.recentAverageAppSeconds}s/app (last ${stats.recentAppsSampleCount || 10} apps avg)`
                          : 'Calibrating speed...'}
                      </div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-slate-900">
                      {progressPercent}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Page {stats.currentPage} / {stats.totalPagesDiscovered || 1035}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, progressPercent)}%` }}
                />
              </div>

              {/* ETA, Processing Speed (Last 10 Apps), and Throughput Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 flex items-center gap-1">
                        <span>Est. Remaining</span>
                        <span className="font-mono">(ETA)</span>
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-900">
                        {stats.status === 'completed'
                          ? 'Complete'
                          : stats.status === 'idle'
                          ? 'Awaiting start'
                          : formatEta(stats.estimatedSecondsRemaining)}
                      </div>
                    </div>
                  </div>
                  {typeof stats.appsRemaining === 'number' && stats.appsRemaining > 0 && (
                    <span className="text-[10px] text-slate-600 font-mono bg-white px-2 py-1 rounded border border-slate-200">
                      ~{stats.appsRemaining} apps left
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Avg Speed (Last 10)</div>
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-900">
                        {stats.recentAverageAppSeconds
                          ? `${stats.recentAverageAppSeconds}s / app`
                          : stats.status === 'running'
                          ? 'Sampling speed...'
                          : 'Ready'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono bg-white px-2 py-1 rounded border border-slate-200">
                    {stats.recentAppsSampleCount
                      ? `${stats.recentAppsSampleCount}/10 sampled`
                      : 'Rolling window'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
                      <RotateCw className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Throughput Pace</div>
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-900">
                        {stats.appsPerMinute
                          ? `~${stats.appsPerMinute} apps/min`
                          : stats.status === 'running'
                          ? 'Calculating...'
                          : 'Idle'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono bg-white px-2 py-1 rounded border border-slate-200">
                    Elapsed: {formatSeconds(stats.elapsedSeconds)}
                  </span>
                </div>
              </div>

              {stats.currentApp && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-500">Processing app:</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {stats.currentApp}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      ({stats.currentAppSlug})
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Elapsed: {formatSeconds(stats.elapsedSeconds)}</span>
                    </div>
                    {typeof stats.estimatedSecondsRemaining === 'number' && (
                      <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                        <span>ETA: {formatEta(stats.estimatedSecondsRemaining)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pages Discovered</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {stats.totalPagesDiscovered || 1035}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Completed: {stats.pagesCompleted}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Apps Discovered</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {stats.appsDiscovered}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Order preserved
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Apps Processed</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {stats.appsProcessed}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Saved to database
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Verified Apps</div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {stats.appsVerified}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Full metadata
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Partially Verified</div>
                <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                  {stats.appsPartiallyVerified}
                </div>
                <div className="text-[11px] text-amber-700 mt-1">
                  Store verified
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Failed Apps</div>
                <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                  {stats.appsFailed}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Duplicates: {stats.duplicateCount}
                </div>
              </div>
            </div>

            {/* SECTION: Visualization - Top 5 Most Frequent Primary Categories */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Visualization</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Top 5 Primary Categories
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bar chart of the top 5 most frequent primary marketplace categories of currently crawled apps
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
                    {stats.appsProcessed} apps analyzed
                  </span>
                </div>
              </div>

              {topCategories.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-900 text-xs font-semibold">No category visualization data yet</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Click <strong>"Run Test Crawl"</strong> or <strong>"Start Crawl"</strong> above to crawl apps and generate the categories bar chart.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: Recharts Bar Chart */}
                  <div className="lg:col-span-7 h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={topCategories}
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="#94a3b8"
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="category"
                          stroke="#94a3b8"
                          tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 500 }}
                          width={150}
                          tickFormatter={(val: string) =>
                            val.length > 20 ? `${val.substring(0, 19)}…` : val
                          }
                        />
                        <Tooltip content={<CategoryChartTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                          {topCategories.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Right: Category Metrics Breakdown */}
                  <div className="lg:col-span-5 space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      <span>Category Breakdown</span>
                      <span className="font-mono text-slate-500 text-[11px]">Share / Count</span>
                    </div>

                    <div className="space-y-2.5">
                      {topCategories.map((cat, idx) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                              />
                              <span className="font-medium text-slate-900 truncate" title={cat.category}>
                                #{idx + 1} {cat.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
                              <span className="text-slate-900 font-bold">{cat.count}</span>
                              <span className="text-slate-500 text-[11px]">({cat.percentage}%)</span>
                            </div>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(4, cat.percentage)}%`,
                                backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: Monitor - Recent Crawler Events */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Recent Crawler Events</span>
                      {stats.status === 'running' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Live Stream
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chronological stream of background crawl progress, page scans, app verifications, and rate limits
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter Pills */}
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-md p-0.5 text-xs">
                    <button
                      onClick={() => {
                        setEventsFilter('all');
                        showToast(`Showing all ${crawlerEvents.length} crawler events`, 'info', 'Event Filter');
                      }}
                      className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                        eventsFilter === 'all'
                          ? 'bg-white text-slate-900 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({crawlerEvents.length})
                    </button>
                    <button
                      onClick={() => {
                        setEventsFilter('verified');
                        showToast('Filtering events by verified apps', 'info', 'Event Filter');
                      }}
                      className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                        eventsFilter === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Verified
                    </button>
                    <button
                      onClick={() => {
                        setEventsFilter('pages');
                        showToast('Filtering events by scanned pages', 'info', 'Event Filter');
                      }}
                      className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                        eventsFilter === 'pages'
                          ? 'bg-white text-slate-900 border border-slate-300 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pages
                    </button>
                    <button
                      onClick={() => {
                        setEventsFilter('rate-limit');
                        showToast('Filtering events by rate limit backoffs', 'info', 'Event Filter');
                      }}
                      className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                        eventsFilter === 'rate-limit'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rate Limits
                    </button>
                    <button
                      onClick={() => {
                        setEventsFilter('errors');
                        showToast('Filtering events by crawl errors', 'info', 'Event Filter');
                      }}
                      className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                        eventsFilter === 'errors'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Errors
                    </button>
                  </div>

                  {/* Chronological Sort Toggle */}
                  <button
                    onClick={() => {
                      const next = eventsSortOrder === 'newest' ? 'oldest' : 'newest';
                      setEventsSortOrder(next);
                      showToast(`Events sorted: ${next === 'newest' ? 'newest first' : 'oldest first'}`, 'info', 'Event Sorting');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-mono transition cursor-pointer shadow-xs"
                    title="Toggle chronological sorting"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>{eventsSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                  </button>
                </div>
              </div>

              {/* Events Chronological Stream List */}
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Activity className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-900 text-xs font-medium">No events matching selected filter</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Background crawl events (e.g., 'Page 40 crawled', 'App XYZ verified', 'Rate limit hit') will stream here in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredEvents.map((evt) => {
                    const isRateLimit = evt.type === 'rate-limit' || evt.message.toLowerCase().includes('rate limit');
                    const isSuccess = evt.type === 'success' || evt.message.toLowerCase().includes('verified');
                    const isError = evt.type === 'error' || evt.message.toLowerCase().includes('failed');
                    const isPage = evt.message.toLowerCase().includes('page');

                    return (
                      <div
                        key={evt.id}
                        className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition ${
                          isRateLimit
                            ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                            : isError
                            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                            : isSuccess
                            ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isRateLimit
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isError
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isSuccess
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isPage
                                ? 'bg-white text-slate-700 border border-slate-300'
                                : 'bg-white text-slate-500 border border-slate-300'
                            }`}
                          >
                            {isRateLimit ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : isError ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : isSuccess ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Layers className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  isRateLimit
                                    ? 'text-amber-900'
                                    : isError
                                    ? 'text-rose-900'
                                    : isSuccess
                                    ? 'text-emerald-900'
                                    : 'text-slate-900'
                                }`}
                              >
                                {evt.message}
                              </span>
                            </div>
                            {evt.details && (
                              <p className="text-[11px] text-slate-600 font-mono mt-0.5 leading-relaxed">
                                {evt.details}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                              isRateLimit
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : isError
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isSuccess
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isPage
                                ? 'bg-white text-slate-700 border-slate-300'
                                : 'bg-white text-slate-600 border-slate-300'
                            }`}
                          >
                            {isRateLimit
                              ? 'Rate Limit'
                              : isError
                              ? 'Error'
                              : isSuccess
                              ? 'Verified'
                              : isPage
                              ? 'Page'
                              : 'System'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatEventTimestamp(evt.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Preview of latest collected records */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recently Collected Records ({records.length} shown)
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('records');
                    showToast('Switched to All Apps directory table', 'info', 'Admin Tabs');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                >
                  <span>View Full Table</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {records.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-900 text-xs font-medium">No apps collected yet.</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Click <strong>"Run Test Crawl"</strong> above to extract the first 5 apps.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-900">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">App Name</th>
                        <th className="py-2.5 px-3">Rating</th>
                        <th className="py-2.5 px-3">Primary Category</th>
                        <th className="py-2.5 px-3">Developer Name</th>
                        <th className="py-2.5 px-3">Developer Website</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.slice(0, 5).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{r.overallOrder}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                            {r.appName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 font-mono">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {r.rating}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">{r.primaryCategory}</td>
                          <td className="py-2.5 px-3 text-slate-800">{r.devName}</td>
                          <td className="py-2.5 px-3">
                            {r.devWebsite !== '-' ? (
                              <a
                                href={r.devWebsite}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                              >
                                <Globe className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                <span>{r.devWebsite.replace(/^https?:\/\//, '')}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                r.status === 'Verified'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : r.status === 'Partially Verified'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={r.shopifyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:text-slate-900"
                                title="Official Shopify Store Listing"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => {
                                  setSelectedRecord(r);
                                  showToast(`Inspecting details for "${r.appName}"`, 'info', 'Record Detail');
                                }}
                                className="text-slate-500 hover:text-slate-900 cursor-pointer"
                                title="View Record Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GROUPED DEVELOPERS DIRECTORY */}
        {activeTab === 'developers' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
            {/* Header & Export controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Grouped Shopify Developers Directory</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated company profiles grouping developers with multiple apps into single entities for targeted recruitment & company research.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/export/developers-csv"
                  download="Grouped_Shopify_Developers.csv"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Developers CSV</span>
                </a>
                <a
                  href="/api/export/excel"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span>Excel Workbook</span>
                </a>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Unique Developers</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">{totalDevs}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Distinct company entities</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Multi-App Developers
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">{multiAppDevsCount}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Companies with 2+ apps</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Single-App Developers</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">{singleAppDevsCount}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Single product companies</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Multi-App Ratio</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                  {totalDevs > 0 ? Math.round((multiAppDevsCount / totalDevs) * 100) : 0}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Scaled e-commerce teams</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by company name, address, category, or app..."
                    value={devSearch}
                    onChange={(e) => {
                      setDevSearch(e.target.value);
                      setDevPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        showToast(`Searching developers for "${devSearch}"`, 'info', 'Search');
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <button
                  onClick={() => {
                    const next = !devMultiOnly;
                    setDevMultiOnly(next);
                    setDevPage(1);
                    showToast(
                      next ? 'Showing multi-app companies only (2+ apps)' : 'Showing all developer companies',
                      'action',
                      'Company Filter'
                    );
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition cursor-pointer ${
                    devMultiOnly
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Show Multi-App Developers Only (2+ Apps)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={`${devSortBy}-${devSortDir}`}
                  onChange={(e) => {
                    const [by, dir] = e.target.value.split('-');
                    setDevSortBy(by as any);
                    setDevSortDir(dir as any);
                    setDevPage(1);
                    const label = e.target.options[e.target.selectedIndex]?.text || e.target.value;
                    showToast(`Sorted developers by: ${label.replace('Sort: ', '')}`, 'info', 'Sort Updated');
                  }}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="apps-desc">Sort: Most Apps Owned</option>
                  <option value="rating-desc">Sort: Highest Average Rating</option>
                  <option value="name-asc">Sort: Company Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Developers List Cards */}
            {devsLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                Loading grouped developers...
              </div>
            ) : developers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-900 text-sm font-semibold">No developers found</p>
                <p className="text-slate-500 text-xs mt-1">
                  {devMultiOnly
                    ? 'No developers with 2+ apps match this filter.'
                    : 'Start the crawler to collect developer company profiles.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {developers.map((dev) => (
                  <div
                    key={dev.id}
                    className="border rounded-xl p-4 transition bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-slate-900 text-sm">{dev.devName}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dev.hasMultipleApps
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {dev.appCount} {dev.appCount === 1 ? 'App Owned' : 'Apps Owned'}
                          </span>
                          {dev.hasMultipleApps && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                              Multi-App Company
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                          {dev.avgRating !== '-' && (
                            <span className="flex items-center gap-1 text-amber-700 font-mono font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {dev.avgRating} avg rating
                            </span>
                          )}
                          {dev.devWebsite !== '-' && (
                            <a
                              href={dev.devWebsite}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => showToast(`Visiting ${dev.devName} website...`, 'info', 'External Link')}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span>{dev.devWebsite.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {dev.devAddress !== '-' && (
                        <div className="text-right max-w-sm text-xs text-slate-500 flex items-start gap-1 justify-end">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{dev.devAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Apps Portfolio pill list */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Apps Portfolio ({dev.apps.length}):
                        </span>
                        {dev.apps.map((app) => (
                          <a
                            key={app.id}
                            href={app.shopifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => showToast(`Opening ${app.appName} on Shopify...`, 'info', 'External Link')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs text-slate-800 transition group"
                          >
                            <span className="font-medium group-hover:text-blue-600">
                              {app.appName}
                            </span>
                            <span className="text-[10px] text-amber-700 font-mono">
                              ({app.rating}★)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              [{app.primaryCategory}]
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                          </a>
                        ))}
                      </div>

                      {dev.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {dev.categories.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Developers Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
              <div>
                Showing {(devPage - 1) * devLimit + 1} to{' '}
                {Math.min(devPage * devLimit, totalDevs)} of {totalDevs} developers
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={devPage <= 1}
                  onClick={() =>
                    setDevPage((p) => {
                      const next = Math.max(1, p - 1);
                      showToast(`Viewing developers page ${next}`, 'info', 'Pagination');
                      return next;
                    })
                  }
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-900 font-semibold">
                  Page {devPage} of {Math.max(1, Math.ceil(totalDevs / devLimit))}
                </span>
                <button
                  disabled={devPage >= Math.ceil(totalDevs / devLimit)}
                  onClick={() =>
                    setDevPage((p) => {
                      const next = p + 1;
                      showToast(`Viewing developers page ${next}`, 'info', 'Pagination');
                      return next;
                    })
                  }
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COLLECTED RECORDS TABLE */}
        {activeTab === 'records' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by app name, developer, category, address..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setTablePage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        showToast(`Searching records for "${searchQuery}"`, 'info', 'Search');
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStatusFilter(val);
                    setTablePage(1);
                    showToast(
                      `Status filter: ${val === 'all' ? 'All Verification Statuses' : val}`,
                      'action',
                      'Filter Applied'
                    );
                  }}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="Verified">Verified</option>
                  <option value="Partially Verified">Partially Verified</option>
                  <option value="Could not be verified">Could not be verified</option>
                </select>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryFilter(val);
                    setTablePage(1);
                    showToast(
                      `Category filter: ${val === 'all' ? 'All Categories' : val}`,
                      'action',
                      'Filter Applied'
                    );
                  }}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-700 max-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sorting and Exports */}
              <div className="flex items-center gap-2">
                <select
                  value={`${sortBy}-${sortDir}`}
                  onChange={(e) => {
                    const [by, dir] = e.target.value.split('-');
                    setSortBy(by as any);
                    setSortDir(dir as any);
                    const label = e.target.options[e.target.selectedIndex]?.text || e.target.value;
                    showToast(`Sorting records: ${label.replace('Sort: ', '')}`, 'info', 'Sort Applied');
                  }}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="order-asc">Sort: Discovery Order</option>
                  <option value="rating-desc">Sort: Highest Rating</option>
                  <option value="name-asc">Sort: App Name (A-Z)</option>
                  <option value="developer-asc">Sort: Developer (A-Z)</option>
                </select>

                <a
                  href="/api/export/excel"
                  onClick={() => showToast('Generating 4-sheet production Excel workbook...', 'success', 'Export Started')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span>Excel</span>
                </a>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-900">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Shopify App Name</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">Primary Category</th>
                    <th className="py-3 px-3">Secondary Category</th>
                    <th className="py-3 px-3">Developer Name</th>
                    <th className="py-3 px-3">Developer Address</th>
                    <th className="py-3 px-3">Developer Website</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading collected records...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-500">
                        No records match the active search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-mono text-slate-500">{r.overallOrder}</td>
                        <td className="py-3 px-3 font-medium text-slate-900 max-w-[220px]">
                          <div className="truncate font-semibold text-slate-900">{r.appName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Page {r.pageNum} · Pos #{r.posOnPage}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 font-mono">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {r.rating}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-800">{r.primaryCategory}</td>
                        <td className="py-3 px-3 text-slate-500">{r.secondaryCategory}</td>
                        <td className="py-3 px-3 text-slate-900 font-medium">{r.devName}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-[220px]">
                          <div className="truncate text-[11px]" title={r.devAddress}>
                            {r.devAddress}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {r.devWebsite !== '-' ? (
                            <a
                              href={r.devWebsite}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => showToast(`Visiting ${r.devName} website...`, 'info', 'External Link')}
                              className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[140px]"
                            >
                              <Globe className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              <span className="truncate">{r.devWebsite.replace(/^https?:\/\//, '')}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                              r.status === 'Verified'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : r.status === 'Partially Verified'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={r.shopifyUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => showToast(`Opening ${r.appName} Shopify listing...`, 'info', 'External Link')}
                              className="text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition"
                              title="Shopify Listing"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                setSelectedRecord(r);
                                showToast(`Inspecting details for "${r.appName}"`, 'info', 'Record Detail');
                              }}
                              className="text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <div>
                Showing {(tablePage - 1) * tableLimit + 1} to{' '}
                {Math.min(tablePage * tableLimit, totalRecords)} of {totalRecords} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={tablePage <= 1}
                  onClick={() =>
                    setTablePage((p) => {
                      const next = Math.max(1, p - 1);
                      showToast(`Viewing records page ${next}`, 'info', 'Pagination');
                      return next;
                    })
                  }
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-900 font-semibold">
                  Page {tablePage} of {Math.max(1, Math.ceil(totalRecords / tableLimit))}
                </span>
                <button
                  disabled={tablePage >= Math.ceil(totalRecords / tableLimit)}
                  onClick={() =>
                    setTablePage((p) => {
                      const next = p + 1;
                      showToast(`Viewing records page ${next}`, 'info', 'Pagination');
                      return next;
                    })
                  }
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ERROR LOG */}
        {activeTab === 'errors' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Crawl Error Log & Remediation</span>
              </div>
              <div className="flex items-center gap-2">
                {errors.length > 0 && (
                  <button
                    onClick={handleRetryFailed}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry All Failed</span>
                  </button>
                )}
                <a
                  href="/api/export/errors-csv"
                  download="Crawl_Errors.csv"
                  onClick={() => showToast('Downloading crawl error log CSV...', 'success', 'Export')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Error CSV</span>
                </a>
              </div>
            </div>

            {errors.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-slate-900 text-sm font-semibold">No extraction errors recorded</p>
                <p className="text-slate-500 text-xs mt-1">
                  All processed app listings were successfully parsed and stored.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-900">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">App Name</th>
                      <th className="py-2.5 px-3">Page</th>
                      <th className="py-2.5 px-3">Failed Field</th>
                      <th className="py-2.5 px-3">Error Description</th>
                      <th className="py-2.5 px-3">Attempts</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errors.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{e.appName || e.id}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{e.pageNum}</td>
                        <td className="py-2.5 px-3 text-rose-700 font-mono font-semibold">{e.failedField}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[280px]">{e.errorDescription}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{e.attempts}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">
                          {new Date(e.lastAttemptTimestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">{e.suggestedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: READ ME & ARCHITECTURE */}
        {activeTab === 'docs' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 text-xs text-slate-800 leading-relaxed">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span>Shopify App Directory Crawler & Excel Export Specification</span>
              </h2>
              <p className="text-slate-500">
                This production tool systematically scrapes the Shopify App Store Index (SASI) Top
                Reviewed directory and verifies each listing against the official Shopify App Store.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-slate-900 text-sm">Data Extraction Strategy</h3>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
                  <li>
                    <strong>Discovery:</strong> SASI Top Reviewed directory (
                    <code className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">https://sasi.heymantle.com/top-reviewed</code>)
                    is crawled sequentially, capturing app order, directory page number, and position.
                  </li>
                  <li>
                    <strong>Dynamic Pagination:</strong> Discovers total pages from pagination controls
                    (up to 1,017 pages).
                  </li>
                  <li>
                    <strong>Verification:</strong> Navigates from SASI to official Shopify App Store
                    listings (
                    <code className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">https://apps.shopify.com/...</code>) to extract
                    official company details.
                  </li>
                  <li>
                    <strong>Deduplication:</strong> Normalizes canonical App Store URLs so duplicate
                    appearances preserve their earliest discovery order without overwriting verified details.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-slate-900 text-sm">Quality Assurance & Compliance</h3>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
                  <li>
                    <strong>Zero Fabrication:</strong> Missing values are explicitly formatted as
                    hyphens (<code className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">"-"</code>). No dates or company addresses
                    are inferred.
                  </li>
                  <li>
                    <strong>Developer Website:</strong> Sourced exclusively from the Developer section
                    external website anchor, filtering out support/privacy/Shopify navigation links.
                  </li>
                  <li>
                    <strong>Launch Date Verification:</strong> Explicitly marked as "-" and noted with
                    "Launch date not verified" when not published on modern listing layouts.
                  </li>
                  <li>
                    <strong>Durable Persistence:</strong> State and records auto-checkpoint to disk.
                    Resume at any time across server restarts.
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-slate-900 text-sm">
                4-Sheet Excel Workbook Architecture (.xlsx)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-900">
                <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-xs">
                  <div className="font-semibold text-slate-900 mb-1">Sheet 1: All Apps</div>
                  <p className="text-slate-500 text-[11px]">
                    16 required columns in exact order, frozen header row, bold styling, auto-filter,
                    clickable hyperlinks for SASI, Shopify, and Developer Website.
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-xs">
                  <div className="font-semibold text-slate-900 mb-1">Sheet 2: Crawl Summary</div>
                  <p className="text-slate-500 text-[11px]">
                    Auditable metrics including crawl duration, total pages discovered, pages processed,
                    unique apps count, verified vs partially verified counts, and limitations.
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-xs">
                  <div className="font-semibold text-slate-900 mb-1">Sheet 3: Crawl Errors</div>
                  <p className="text-slate-500 text-[11px]">
                    Structured error table with failed fields, error descriptions, attempt counts,
                    timestamps, and actionable next steps.
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-xs">
                  <div className="font-semibold text-slate-900 mb-1">Sheet 4: Read Me</div>
                  <p className="text-slate-500 text-[11px]">
                    Documentation covering data provenance, field dictionaries, status definitions,
                    checkpoint resumption guide, and collection timestamps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-mono text-slate-500 font-medium">
                  Discovery #{selectedRecord.overallOrder} · Page {selectedRecord.pageNum} (Pos #{selectedRecord.posOnPage})
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{selectedRecord.appName}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  showToast('Closed app inspection modal', 'info');
                }}
                className="text-slate-400 hover:text-slate-700 text-sm p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Rating</span>
                <span className="font-semibold text-amber-700 font-mono text-sm flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  {selectedRecord.rating}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Verification Status</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full font-medium ${
                    selectedRecord.status === 'Verified'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedRecord.status}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Primary Category</span>
                <span className="text-slate-900 font-medium">{selectedRecord.primaryCategory}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Secondary Category</span>
                <span className="text-slate-900 font-medium">{selectedRecord.secondaryCategory}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Developer / Company</span>
                <span className="text-slate-900 font-medium flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {selectedRecord.devName}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Developer Website</span>
                {selectedRecord.devWebsite !== '-' ? (
                  <a
                    href={selectedRecord.devWebsite}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => showToast(`Visiting ${selectedRecord.devName} website...`, 'info', 'External Link')}
                    className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedRecord.devWebsite}</span>
                  </a>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>

              <div className="col-span-2">
                <span className="text-slate-500 block mb-0.5">Developer Address</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{selectedRecord.devAddress}</span>
                </p>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Launched Date</span>
                <span className="text-slate-900 font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRecord.launchDate}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Last Verified Timestamp</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {selectedRecord.lastVerifiedDate}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-500 block mb-0.5">Notes & Extraction Audit</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  {selectedRecord.notes}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex items-center gap-3">
                <a
                  href={selectedRecord.sasiUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => showToast(`Opening ${selectedRecord.appName} on SASI...`, 'info', 'External Link')}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>SASI Detail Page</span>
                </a>
                <a
                  href={selectedRecord.shopifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => showToast(`Opening ${selectedRecord.appName} on Shopify...`, 'info', 'External Link')}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Official Shopify Listing</span>
                </a>
              </div>

              <button
                onClick={() => {
                  setSelectedRecord(null);
                  showToast('Closed app inspection modal', 'info');
                }}
                className="px-4 py-1.5 rounded-md bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">{confirmDialog.title}</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmDialog(null);
                  showToast('Action cancelled', 'info');
                }}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 transition cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
