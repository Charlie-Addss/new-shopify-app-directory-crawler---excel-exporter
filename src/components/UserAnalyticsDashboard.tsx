import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Building2,
  Users,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Eye,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowUpDown,
  Calendar,
  Star,
  Activity,
  HelpCircle,
  Info,
  Settings,
  Database,
  ArrowUpRight,
  Sparkles,
  Briefcase,
  Trash2,
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
  LineChart,
  Line,
} from 'recharts';
import {
  DashboardAnalyticsResponse,
  ShopifyAppRecord,
  GroupedDeveloper,
  CrawlStats,
  CrawlerEvent,
  CategoryComparisonItem,
  DeveloperLeaderboardItem,
} from '../types';
import { useToast } from '../context/ToastContext';

interface UserAnalyticsDashboardProps {
  analytics: DashboardAnalyticsResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onReset?: () => void;
  onSwitchToAdmin: () => void;
  onSwitchToJobs?: () => void;
  records: ShopifyAppRecord[];
  totalRecords: number;
  recordsLoading: boolean;
  developers: GroupedDeveloper[];
  totalDevelopers: number;
  crawlerStats: CrawlStats;
  crawlerEvents: CrawlerEvent[];
  selectedRecord: ShopifyAppRecord | null;
  onSelectRecord: (record: ShopifyAppRecord | null) => void;
  filters: {
    category: string;
    ratingBand: string;
    status: string;
    developer: string;
    search: string;
  };
  onFilterChange: (filters: {
    category: string;
    ratingBand: string;
    status: string;
    developer: string;
    search: string;
  }) => void;
  tablePage: number;
  onPageChange: (page: number) => void;
}

export default function UserAnalyticsDashboard({
  analytics,
  loading,
  onRefresh,
  onReset,
  onSwitchToAdmin,
  onSwitchToJobs,
  records,
  totalRecords,
  recordsLoading,
  developers,
  crawlerStats,
  crawlerEvents,
  selectedRecord,
  onSelectRecord,
  filters,
  onFilterChange,
  tablePage,
  onPageChange,
}: UserAnalyticsDashboardProps) {
  const { showToast } = useToast();

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<
    'overview' | 'explorer' | 'companies' | 'categories' | 'quality' | 'crawler' | 'reports'
  >('overview');

  // Overview sub-states
  const [categoriesLimit, setCategoriesLimit] = useState<10 | 15 | 'all'>(10);
  const [devSortKey, setDevSortKey] = useState<'apps' | 'rating'>('apps');
  const [devSortDir, setDevSortDir] = useState<'desc' | 'asc'>('desc');
  const [catCompSortKey, setCatCompSortKey] = useState<'avgRating' | 'totalApps'>('avgRating');
  const [catCompSortDir, setCatCompSortDir] = useState<'desc' | 'asc'>('desc');
  const [searchInput, setSearchInput] = useState(filters.search);

  // Handle category bar click -> filters Apps Explorer & switches to it
  const handleCategoryClick = (categoryName: string) => {
    onFilterChange({
      ...filters,
      category: categoryName,
    });
    setActiveNav('explorer');
    showToast(`Filtering apps directory by category: "${categoryName}"`, 'action', 'Category Filter');
  };

  // Handle rating band click -> filters Apps Explorer
  const handleRatingBandClick = (bandName: string) => {
    onFilterChange({
      ...filters,
      ratingBand: bandName,
    });
    setActiveNav('explorer');
    showToast(`Filtering apps by rating band: "${bandName}"`, 'action', 'Rating Filter');
  };

  // Handle developer click -> filters Apps Explorer
  const handleDeveloperClick = (devName: string) => {
    onFilterChange({
      ...filters,
      developer: devName,
    });
    setActiveNav('explorer');
    showToast(`Filtering apps directory for company: "${devName}"`, 'action', 'Developer Filter');
  };

  // Handle data quality dimension click
  const handleQualityMetricClick = (type: 'verified' | 'partially' | 'unverified') => {
    let status = 'all';
    if (type === 'verified') status = 'Verified';
    else if (type === 'partially') status = 'Partially Verified';
    else if (type === 'unverified') status = 'Could not be verified';

    onFilterChange({
      ...filters,
      status,
    });
    setActiveNav('explorer');
    showToast(`Filtering directory by verification status: "${status}"`, 'action', 'Verification Filter');
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    onFilterChange({
      category: 'all',
      ratingBand: 'all',
      status: 'all',
      developer: 'all',
      search: '',
    });
    showToast('All search and category filters cleared', 'info', 'Filters Reset');
  };

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.ratingBand !== 'all' ||
    filters.status !== 'all' ||
    filters.developer !== 'all' ||
    Boolean(filters.search);

  // Format relative timestamp
  const formatTimeAgo = (ts?: string) => {
    if (!ts) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(ts).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      return `${diffHours} hours ago`;
    } catch {
      return ts;
    }
  };

  // Data helpers from analytics
  const kpis = analytics?.kpis;
  const topCategories =
    categoriesLimit === 'all'
      ? analytics?.allCategories || []
      : (analytics?.allCategories || []).slice(0, categoriesLimit);
  const ratingDistribution = analytics?.ratingDistribution || [];
  const topDevelopers = analytics?.topDevelopers || [];
  const launchTrends = analytics?.launchYearTrends;
  const categoryComparison = analytics?.categoryComparison || [];
  const dataQuality = analytics?.dataQuality;

  // Sorted developer leaderboard
  const sortedDevelopers = [...topDevelopers].sort((a, b) => {
    const dir = devSortDir === 'desc' ? -1 : 1;
    if (devSortKey === 'apps') {
      return (a.appCount - b.appCount) * dir;
    }
    const rA = typeof a.avgRating === 'number' ? a.avgRating : 0;
    const rB = typeof b.avgRating === 'number' ? b.avgRating : 0;
    return (rA - rB) * dir;
  });

  // Sorted category comparison
  const sortedCategoryComparison = [...categoryComparison].sort((a, b) => {
    const dir = catCompSortDir === 'desc' ? -1 : 1;
    if (catCompSortKey === 'avgRating') {
      const rA = typeof a.avgRating === 'number' ? a.avgRating : 0;
      const rB = typeof b.avgRating === 'number' ? b.avgRating : 0;
      return (rA - rB) * dir;
    }
    return (a.totalApps - b.totalApps) * dir;
  });

  // Custom chart tooltip for category bars
  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md text-xs space-y-1 font-['Montserrat',sans-serif]">
          <p className="font-semibold text-slate-900 text-sm">{item.category}</p>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-slate-900 font-bold text-sm tabular-nums">
              {item.count.toLocaleString()} apps
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-200/60">
              {item.percentage}% share
            </span>
          </div>
          {item.avgRating !== null && (
            <p className="text-[11px] text-slate-500 pt-0.5 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              <span>Avg Rating: {item.avgRating}★ ({item.ratedCount} rated)</span>
            </p>
          )}
          <p className="text-[10px] text-slate-400 pt-1 italic">Click bar to filter Apps Explorer</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for rating distribution
  const RatingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md text-xs space-y-1 font-['Montserrat',sans-serif]">
          <p className="font-semibold text-slate-900 text-sm">Rating Band: {item.band}</p>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-slate-900 font-bold text-sm tabular-nums">
              {item.count.toLocaleString()} apps
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
              {item.percentage}% of dataset
            </span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 italic">Click bar to view matching apps</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Montserrat',sans-serif] antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* SaaS App Header - Semrush / Ahrefs Style */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Brand & Workspace */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const next = !sidebarCollapsed;
              setSidebarCollapsed(next);
              showToast(next ? 'Sidebar collapsed' : 'Sidebar expanded', 'info', 'Sidebar');
            }}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer lg:hidden"
            title="Toggle Sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                Shopify App Intelligence
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80">
                Marketplace Analytics
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Semrush & Ahrefs-style competitive telemetry for 1,035 directory pages
            </p>
          </div>
        </div>

        {/* Global Search & Telemetry */}
        <div className="flex flex-1 max-w-md mx-2 sm:mx-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onFilterChange({ ...filters, search: searchInput });
              if (searchInput.trim()) {
                showToast(`Search applied: "${searchInput.trim()}"`, 'action', 'Search');
              } else {
                showToast('Search query cleared', 'info', 'Search');
              }
            }}
            className="relative w-full"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search apps, categories, developers, locations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onFilterChange({ ...filters, search: '' });
                  showToast('Search query cleared', 'info', 'Search');
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Action Controls & Admin Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Refresh Button with Last Updated */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 hidden md:inline">
              {formatTimeAgo(analytics?.lastUpdatedTimestamp)}
            </span>
            <button
              onClick={() => {
                onRefresh();
                showToast('Refreshing market intelligence & live metrics...', 'action', 'Refresh');
              }}
              disabled={loading}
              className="p-1.5 rounded-md bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-300 text-xs font-medium transition-colors cursor-pointer shadow-xs"
              title="Refresh Analytics from Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Reset all crawl records and user analytics"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="flex items-center gap-1.5">
            <a
              href="/api/export/excel"
              download="Shopify_App_Directory_Analytics.xlsx"
              onClick={() => {
                showToast('Downloading comprehensive 4-sheet Excel workbook...', 'success', 'Export Started');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download Comprehensive Excel Workbook"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </a>
            <a
              href="/api/export/csv"
              download="Shopify_App_Directory.csv"
              onClick={() => {
                showToast('Downloading All Apps CSV file...', 'success', 'Export Started');
              }}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 transition-colors cursor-pointer shadow-xs"
              title="Download Apps CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </a>
          </div>

          {/* Switch to Job Search & Employer Tracking */}
          {onSwitchToJobs && (
            <button
              onClick={() => {
                onSwitchToJobs();
                showToast('Opening Job Search & Talent Module', 'action', 'Navigation');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer ml-1"
              title="Open Job Search & Employer Research Module"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Job Search & Talent</span>
            </button>
          )}

          {/* Switch to Admin Mode Button */}
          <button
            onClick={() => {
              onSwitchToAdmin();
              showToast('Switched to Crawler Admin Console', 'action', 'View Mode');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer ml-1"
            title="Open Crawler Configuration, Pause/Resume & Extraction Controls"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Crawler Admin</span>
            {crawlerStats.status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* Main SaaS Workspace Body with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Left Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-60'
          } border-r border-slate-200 bg-white transition-all duration-200 flex flex-col justify-between flex-shrink-0 z-30`}
        >
          {/* Nav Items */}
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between px-2.5 py-1 mb-2">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider text-slate-400 ${
                  sidebarCollapsed ? 'hidden' : 'block'
                }`}
              >
                Intelligence Suite
              </span>
              <button
                onClick={() => {
                  const next = !sidebarCollapsed;
                  setSidebarCollapsed(next);
                  showToast(next ? 'Sidebar collapsed' : 'Sidebar expanded', 'info', 'Sidebar');
                }}
                className="hidden lg:block text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 cursor-pointer"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* 1. Overview */}
            <button
              onClick={() => {
                setActiveNav('overview');
                showToast('Viewing Executive Market Overview dashboard', 'info', 'Navigation');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'overview'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Overview Dashboard"
            >
              <BarChart3 className={`w-4 h-4 flex-shrink-0 ${activeNav === 'overview' ? 'text-blue-600' : 'text-slate-400'}`} />
              {!sidebarCollapsed && <span>Overview</span>}
            </button>

            {/* 2. Apps Explorer */}
            <button
              onClick={() => {
                setActiveNav('explorer');
                showToast('Viewing App Directory Explorer table', 'info', 'Navigation');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'explorer'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Apps Explorer"
            >
              <div className="flex items-center gap-3">
                <Database className={`w-4 h-4 flex-shrink-0 ${activeNav === 'explorer' ? 'text-blue-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && <span>Apps Explorer</span>}
              </div>
              {!sidebarCollapsed && totalRecords > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {totalRecords}
                </span>
              )}
            </button>

            {/* 3. Companies / Developers */}
            <button
              onClick={() => {
                setActiveNav('companies');
                showToast('Viewing Multi-App Companies intelligence', 'info', 'Navigation');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'companies'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Companies & Grouped Developers"
            >
              <div className="flex items-center gap-3">
                <Building2 className={`w-4 h-4 flex-shrink-0 ${activeNav === 'companies' ? 'text-blue-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && <span>Companies</span>}
              </div>
              {!sidebarCollapsed && (kpis?.uniqueDevelopersCount || 0) > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {kpis?.uniqueDevelopersCount}
                </span>
              )}
            </button>

            {/* 4. Categories */}
            <button
              onClick={() => {
                setActiveNav('categories');
                showToast('Viewing Category Landscape analytics', 'info', 'Navigation');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'categories'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Categories Intelligence"
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 flex-shrink-0 ${activeNav === 'categories' ? 'text-blue-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && <span>Categories</span>}
              </div>
              {!sidebarCollapsed && (kpis?.totalPrimaryCategoriesCount || 0) > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {kpis?.totalPrimaryCategoriesCount}
                </span>
              )}
            </button>

            {/* 5. Data Quality */}
            <button
              onClick={() => {
                setActiveNav('quality');
                showToast('Viewing Data Quality & Verification breakdown', 'info', 'Navigation');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'quality'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Data Quality & Verification Audit"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${activeNav === 'quality' ? 'text-blue-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && <span>Data Quality</span>}
              </div>
              {!sidebarCollapsed && dataQuality && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {dataQuality.fullyVerifiedPercent + dataQuality.partiallyVerifiedPercent}%
                </span>
              )}
            </button>

            {/* 6. Crawler & History */}
            <button
              onClick={() => {
                setActiveNav('crawler');
                showToast('Viewing Live Background Crawler status & events', 'info', 'Navigation');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'crawler'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Crawler Status & Event Stream"
            >
              <div className="flex items-center gap-3">
                <Activity className={`w-4 h-4 flex-shrink-0 ${activeNav === 'crawler' ? 'text-blue-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && <span>Crawler & History</span>}
              </div>
              {!sidebarCollapsed && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    crawlerStats.status === 'running'
                      ? 'bg-emerald-500 animate-pulse'
                      : crawlerStats.status === 'paused'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
              )}
            </button>

            {/* 7. Reports & Exports */}
            <button
              onClick={() => {
                setActiveNav('reports');
                showToast('Viewing Executive Reports & Exports summary', 'info', 'Navigation');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'reports'
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
              title="Reports & Downloads"
            >
              <FileSpreadsheet className={`w-4 h-4 flex-shrink-0 ${activeNav === 'reports' ? 'text-blue-600' : 'text-slate-400'}`} />
              {!sidebarCollapsed && <span>Executive Reports</span>}
            </button>

            {/* 8. Job Search & Talent Module Switcher */}
            {onSwitchToJobs && (
              <button
                onClick={onSwitchToJobs}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-dashed border-slate-300 transition-colors cursor-pointer mt-1"
                title="Open Job Search & Employer Research"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Job Search & Talent</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    New
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Bottom Sidebar: Crawler Live Badge & Quick Switch */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
            {!sidebarCollapsed && (
              <div className="bg-white border border-slate-200 rounded-md p-2.5 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-medium">Crawler Engine</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      crawlerStats.status === 'running'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : crawlerStats.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {crawlerStats.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-900 font-mono font-medium">
                  {crawlerStats.pagesCompleted} / {crawlerStats.totalPagesDiscovered || 1035} pgs
                </div>
                {crawlerStats.estimatedSecondsRemaining !== undefined &&
                  crawlerStats.estimatedSecondsRemaining !== null &&
                  crawlerStats.estimatedSecondsRemaining > 0 && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      ETA: ~{Math.floor(crawlerStats.estimatedSecondsRemaining / 60)}m left
                    </div>
                  )}
              </div>
            )}
            <button
              onClick={onSwitchToAdmin}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-2.5 rounded-md bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              {!sidebarCollapsed && <span>Crawler Console</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Active Filters Bar (Shown whenever a filter is set) */}
          {hasActiveFilters && (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Active Filters:</span>
                </span>
                {filters.category !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium text-xs">
                    <span>Category: {filters.category}</span>
                    <button
                      onClick={() => {
                        onFilterChange({ ...filters, category: 'all' });
                        showToast(`Removed category filter: ${filters.category}`, 'info', 'Filter Removed');
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.ratingBand !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium text-xs">
                    <span>Rating: {filters.ratingBand}</span>
                    <button
                      onClick={() => {
                        onFilterChange({ ...filters, ratingBand: 'all' });
                        showToast(`Removed rating filter: ${filters.ratingBand}`, 'info', 'Filter Removed');
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium text-xs">
                    <span>Status: {filters.status}</span>
                    <button
                      onClick={() => {
                        onFilterChange({ ...filters, status: 'all' });
                        showToast(`Removed verification status filter`, 'info', 'Filter Removed');
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.developer !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium text-xs">
                    <span>Dev: {filters.developer}</span>
                    <button
                      onClick={() => {
                        onFilterChange({ ...filters, developer: 'all' });
                        showToast(`Removed developer filter: ${filters.developer}`, 'info', 'Filter Removed');
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.search && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium text-xs">
                    <span>Query: "{filters.search}"</span>
                    <button
                      onClick={() => {
                        setSearchInput('');
                        onFilterChange({ ...filters, search: '' });
                        showToast('Search query cleared', 'info', 'Filter Removed');
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={handleClearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 1: OVERVIEW PAGE (Primary requested SaaS Dashboard) */}
          {/* ========================================================================= */}
          {activeNav === 'overview' && (
            <div className="space-y-6">
              {/* Page Title & Context Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                    <span>Marketplace Overview</span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                      Live Telemetry
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Competitive insights, marketplace category share, rating distributions, and developer portfolios.
                  </p>
                </div>

                {/* Filter Selector Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
                    value={filters.category}
                    onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
                    className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                  >
                    <option value="all">All Categories ({analytics?.availableCategories.length || 0})</option>
                    {analytics?.availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Rating Band Filter */}
                  <select
                    value={filters.ratingBand}
                    onChange={(e) => onFilterChange({ ...filters, ratingBand: e.target.value })}
                    className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                  >
                    <option value="all">All Ratings</option>
                    <option value="4.5–5.0">4.5 – 5.0 ★</option>
                    <option value="4.0–4.4">4.0 – 4.4 ★</option>
                    <option value="3.0–3.9">3.0 – 3.9 ★</option>
                    <option value="0.0–2.9">0.0 – 2.9 ★</option>
                    <option value="Missing rating">Missing rating</option>
                  </select>

                  {/* Verification Status Filter */}
                  <select
                    value={filters.status}
                    onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                    className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Verified">Fully Verified</option>
                    <option value="Partially Verified">Partially Verified</option>
                    <option value="Could not be verified">Could not be verified</option>
                  </select>
                </div>
              </div>

              {/* 1. KPI SUMMARY CARDS */}
              {kpis && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  {/* Card 1: Total Apps */}
                  <div
                    onClick={() => setActiveNav('explorer')}
                    className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-lg p-4 transition-all hover:border-slate-300 cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">Total Apps</span>
                      <Database className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                      {kpis.totalApps.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Unique ID records</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 2: Unique Developers */}
                  <div
                    onClick={() => setActiveNav('companies')}
                    className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-lg p-4 transition-all hover:border-slate-300 cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">Unique Devs</span>
                      <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                      {kpis.uniqueDevelopersCount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Deduplicated entities</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 3: Fully Verified */}
                  <div
                    onClick={() => handleQualityMetricClick('verified')}
                    className="bg-white hover:bg-emerald-50/30 border border-emerald-200 rounded-lg p-4 transition-all hover:border-emerald-300 cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-emerald-700 text-xs">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-emerald-700">Fully Verified</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1.5 tabular-nums">
                      {kpis.verifiedApps.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-emerald-700/80 mt-1">
                      {kpis.totalApps > 0
                        ? `${((kpis.verifiedApps / kpis.totalApps) * 100).toFixed(1)}% complete`
                        : '0% complete'}
                    </div>
                  </div>

                  {/* Card 4: Partially Verified */}
                  <div
                    onClick={() => handleQualityMetricClick('partially')}
                    className="bg-white hover:bg-amber-50/30 border border-amber-200 rounded-lg p-4 transition-all hover:border-amber-300 cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-amber-800 text-xs">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-amber-800">Partially Verified</span>
                      <CheckCircle2 className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-amber-800 mt-1.5 tabular-nums">
                      {kpis.partiallyVerifiedApps.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-amber-800/80 mt-1">
                      {kpis.totalApps > 0
                        ? `${((kpis.partiallyVerifiedApps / kpis.totalApps) * 100).toFixed(1)}% store verified`
                        : '0%'}
                    </div>
                  </div>

                  {/* Card 5: Missing Developer Websites */}
                  <div
                    onClick={() => setActiveNav('quality')}
                    className="bg-white hover:bg-rose-50/30 border border-rose-200 rounded-lg p-4 transition-all hover:border-rose-300 cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-rose-700 text-xs">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-rose-700">Missing Dev Web</span>
                      <Globe className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-rose-700 mt-1.5 tabular-nums">
                      {kpis.missingDevWebsitesCount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-rose-700/80 mt-1">
                      {kpis.totalApps > 0
                        ? `${((kpis.missingDevWebsitesCount / kpis.totalApps) * 100).toFixed(1)}% unlisted`
                        : '0%'}
                    </div>
                  </div>

                  {/* Card 6: Primary Categories */}
                  <div
                    onClick={() => setActiveNav('categories')}
                    className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-lg p-4 transition-all hover:border-slate-300 cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">Categories</span>
                      <Layers className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                      {kpis.totalPrimaryCategoriesCount}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {kpis.averageMarketplaceRating !== null
                        ? `Market Avg: ${kpis.averageMarketplaceRating}★`
                        : 'Rating calibrating'}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State Banner if no apps crawled yet */}
              {(!kpis || kpis.totalApps === 0) && (
                <div className="text-center py-16 border border-dashed border-slate-300 rounded-lg bg-white p-8 space-y-4 shadow-2xs">
                  <Database className="w-12 h-12 text-slate-400 mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">No Crawled Apps in Dataset Yet</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      The analytics dashboard aggregates live data from the directory crawler. Start a Test Crawl or Full Crawl from the Crawler Admin Console to populate market metrics and charts.
                    </p>
                  </div>
                  <button
                    onClick={onSwitchToAdmin}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Open Crawler Admin & Start Crawl</span>
                  </button>
                </div>
              )}

              {/* 2. CHARTS ROW: TOP PRIMARY CATEGORIES & APP RATING DISTRIBUTION */}
              {kpis && kpis.totalApps > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Chart: Top Primary Categories (Horizontal Bar Chart) */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>Top Primary Categories</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Unique apps in each primary category. Click a bar to filter Apps Explorer.
                        </p>
                      </div>

                      {/* Display limit toggle */}
                      <div className="flex items-center bg-slate-100 border border-slate-200 rounded-md p-0.5 text-xs">
                        <button
                          onClick={() => {
                            setCategoriesLimit(10);
                            showToast('Showing top 10 categories', 'info', 'Category View');
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                            categoriesLimit === 10
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Top 10
                        </button>
                        <button
                          onClick={() => {
                            setCategoriesLimit(15);
                            showToast('Showing top 15 categories', 'info', 'Category View');
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                            categoriesLimit === 15
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Top 15
                        </button>
                        <button
                          onClick={() => {
                            setCategoriesLimit('all');
                            showToast(`Showing all ${analytics?.allCategories.length || 0} categories`, 'info', 'Category View');
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                            categoriesLimit === 'all'
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({analytics?.allCategories.length || 0})
                        </button>
                      </div>
                    </div>

                    {topCategories.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No categorized apps found matching active filters.
                      </div>
                    ) : (
                      <div
                        className="w-full"
                        style={{ height: Math.max(280, topCategories.length * 32) }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={topCategories}
                            margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                            onClick={(data: any) => {
                              if (data && data.activePayload && data.activePayload.length) {
                                const cat = data.activePayload[0].payload.category;
                                handleCategoryClick(cat);
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis
                              type="number"
                              stroke="#cbd5e1"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              allowDecimals={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="category"
                              stroke="#cbd5e1"
                              tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 500 }}
                              width={160}
                              tickFormatter={(val: string) =>
                                val.length > 22 ? `${val.substring(0, 21)}…` : val
                              }
                            />
                            <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                              {topCategories.map((_, index) => (
                                <Cell
                                  key={`cat-cell-${index}`}
                                  fill={
                                    [
                                      '#2563eb',
                                      '#3b82f6',
                                      '#1d4ed8',
                                      '#4f46e5',
                                      '#6366f1',
                                      '#0ea5e9',
                                      '#0284c7',
                                      '#38bdf8',
                                      '#2563eb',
                                      '#1e40af',
                                    ][index % 10]
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Right Chart: App Rating Distribution */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>App Rating Distribution</span>
                          </h2>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Validated review rating score bands. Click a band to filter.
                          </p>
                        </div>
                        {kpis.averageMarketplaceRating !== null && (
                          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                            {kpis.averageMarketplaceRating} ★ avg
                          </span>
                        )}
                      </div>

                      <div className="h-[220px] w-full pt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={ratingDistribution}
                            margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                            onClick={(data: any) => {
                              if (data && data.activePayload && data.activePayload.length) {
                                const band = data.activePayload[0].payload.band;
                                handleRatingBandClick(band);
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                              dataKey="band"
                              stroke="#cbd5e1"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                            />
                            <YAxis
                              stroke="#cbd5e1"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              allowDecimals={false}
                            />
                            <Tooltip content={<RatingTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                              {ratingDistribution.map((entry, index) => (
                                <Cell key={`rating-cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Rating breakdown legend list */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      {ratingDistribution.map((r) => (
                        <button
                          key={r.band}
                          onClick={() => handleRatingBandClick(r.band)}
                          className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="text-xs text-slate-800 font-medium truncate">
                              {r.band}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-900 pl-2">
                            {r.count} <span className="text-[10px] text-slate-500 font-normal">({r.percentage}%)</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ROW: DEVELOPER PORTFOLIO LEADERBOARD & CATEGORY RATING COMPARISON */}
              {kpis && kpis.totalApps > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Table: Top Developers by App Count */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>Top Developers by App Count</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Top 10 publishers by unique apps portfolio. Click developer to inspect apps.
                        </p>
                      </div>

                      {/* Sorting controls */}
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => {
                            const newDir = devSortKey === 'apps' && devSortDir === 'desc' ? 'asc' : 'desc';
                            setDevSortKey('apps');
                            setDevSortDir(newDir);
                            showToast(`Sorting companies by app count (${newDir === 'desc' ? 'highest first' : 'lowest first'})`, 'info', 'Sorting');
                          }}
                          className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            devSortKey === 'apps'
                              ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>Apps</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            const newDir = devSortKey === 'rating' && devSortDir === 'desc' ? 'asc' : 'desc';
                            setDevSortKey('rating');
                            setDevSortDir(newDir);
                            showToast(`Sorting companies by average rating (${newDir === 'desc' ? 'highest first' : 'lowest first'})`, 'info', 'Sorting');
                          }}
                          className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            devSortKey === 'rating'
                              ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>Rating</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Developer</th>
                            <th className="py-2.5 px-3 text-center">Apps</th>
                            <th className="py-2.5 px-3 text-center">Avg Rating</th>
                            <th className="py-2.5 px-3">Website</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-900">
                          {sortedDevelopers.map((dev, idx) => (
                            <tr
                              key={dev.id}
                              className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                              onClick={() => handleDeveloperClick(dev.devName)}
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                                  <span>{dev.devName}</span>
                                </div>
                                {dev.partnerHandle && (
                                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                                    @{dev.partnerHandle}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                  {dev.appCount}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {dev.avgRating !== 'N/A' ? (
                                  <span className="text-amber-600 flex items-center justify-center gap-1">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>{dev.avgRating}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {dev.devWebsite !== '-' ? (
                                  <a
                                    href={dev.devWebsite}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate max-w-[140px]"
                                  >
                                    <Globe className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{dev.devWebsite.replace(/^https?:\/\//, '')}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">Missing</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeveloperClick(dev.devName);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold hover:underline"
                                >
                                  View Apps
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Table: Category Rating Comparison */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span>Category Rating Comparison</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ratings distribution & sample size comparison by market category.
                        </p>
                      </div>

                      {/* Sort toggle */}
                      <button
                        onClick={() => {
                          if (catCompSortKey === 'avgRating') {
                            setCatCompSortKey('totalApps');
                          } else {
                            setCatCompSortKey('avgRating');
                          }
                        }}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 text-[11px] text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                      >
                        Sort by: {catCompSortKey === 'avgRating' ? 'Rating' : 'Apps'}
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-2.5">Category</th>
                            <th className="py-2 px-2.5 text-center">Sample</th>
                            <th className="py-2 px-2.5 text-center">Avg</th>
                            <th className="py-2 px-2.5 text-right">High / Low</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-900">
                          {sortedCategoryComparison.map((cat) => (
                            <tr
                              key={cat.category}
                              onClick={() => handleCategoryClick(cat.category)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            >
                              <td className="py-2.5 px-2.5 font-medium text-slate-900 max-w-[150px] truncate">
                                {cat.category}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono">
                                <span className="text-slate-900 font-bold">{cat.totalApps}</span>
                                <span className="text-[10px] text-slate-500 block">({cat.ratedApps} rated)</span>
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold">
                                {cat.avgRating !== 'N/A' ? (
                                  <span className="text-amber-600 font-bold">{cat.avgRating}★</span>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono text-[11px] text-slate-500">
                                {cat.highestRating !== 'N/A' ? `${cat.highestRating} / ${cat.lowestRating}` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ROW: APPS LAUNCHED BY YEAR & DATA QUALITY OVERVIEW */}
              {kpis && kpis.totalApps > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Apps Launched by Year Trends */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span>Apps Launched by Year</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Historical launch cohort based exclusively on verified original launch dates.
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {launchTrends?.excludedCount} unverified excluded
                      </span>
                    </div>

                    {launchTrends?.hasSufficientData ? (
                      <div className="h-[220px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={launchTrends.trends} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="year" stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-md text-xs space-y-1 font-['Montserrat',sans-serif]">
                                      <p className="font-semibold text-slate-900">Year: {item.year}</p>
                                      <p className="text-blue-600 font-mono font-bold">
                                        {item.count} apps launched ({item.percentage}%)
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-8 px-4 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50 space-y-2">
                        <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                        <h4 className="text-xs font-semibold text-slate-900">
                          Insufficient Verified Launch Dates
                        </h4>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          In adherence with data integrity standards, this chart only displays explicitly verified original launch years. Currently,{' '}
                          <strong className="text-slate-900">{launchTrends?.excludedCount} of {kpis.totalApps} apps</strong> do not expose a verified launch date on their store pages.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Data Quality Overview */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Data Quality & Completeness Audit</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Verification status and missing field audit across {dataQuality?.totalRecords} records.
                        </p>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-mono font-bold">
                        {dataQuality?.fullyVerifiedPercent}% verified
                      </span>
                    </div>

                    {dataQuality && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Fully Verified */}
                        <div
                          onClick={() => handleQualityMetricClick('verified')}
                          className="bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-700 font-medium">Fully Verified</span>
                            <span className="font-mono font-bold text-slate-900">{dataQuality.fullyVerifiedCount}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${dataQuality.fullyVerifiedPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{dataQuality.fullyVerifiedPercent}% complete</span>
                        </div>

                        {/* Partially Verified */}
                        <div
                          onClick={() => handleQualityMetricClick('partially')}
                          className="bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-amber-800 font-medium">Partially Verified</span>
                            <span className="font-mono font-bold text-slate-900">{dataQuality.partiallyVerifiedCount}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${dataQuality.partiallyVerifiedPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{dataQuality.partiallyVerifiedPercent}% store validated</span>
                        </div>

                        {/* Missing Dev Websites */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Missing Dev Websites</span>
                            <span className="font-mono font-bold text-rose-600">{dataQuality.missingDevWebsiteCount}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full"
                              style={{ width: `${dataQuality.missingDevWebsitePercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{dataQuality.missingDevWebsitePercent}% missing URLs</span>
                        </div>

                        {/* Duplicates / Errors */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-medium">Duplicates / Retries</span>
                            <span className="font-mono font-bold text-slate-900">
                              {dataQuality.duplicateCount} / {dataQuality.failedRecordsCount}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }} />
                          </div>
                          <span className="text-[10px] text-slate-500">De-duplicated in pipeline</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: APPS EXPLORER (Interactive Table & Details) */}
          {/* ========================================================================= */}
          {activeNav === 'explorer' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                    <Database className="w-5 h-5 text-blue-600" />
                    <span>Apps Explorer</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search and filter through all {totalRecords.toLocaleString()} collected Shopify App Store listings.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/export/csv"
                    onClick={() => {
                      showToast('Downloading App Directory CSV...', 'success', 'Export Started');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download CSV</span>
                  </a>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-900">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">App Name</th>
                        <th className="py-3 px-3">Rating</th>
                        <th className="py-3 px-3">Primary Category</th>
                        <th className="py-3 px-3">Developer</th>
                        <th className="py-3 px-3">Website</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                            {recordsLoading ? 'Loading app records...' : 'No apps match the active criteria.'}
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => (
                          <tr
                            key={r.id}
                            onClick={() => {
                              onSelectRecord(r);
                              showToast(`Inspecting details for "${r.appName}"`, 'info', 'App Details');
                            }}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400">{r.overallOrder}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[220px] truncate">
                              {r.appName}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 font-mono">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {r.rating}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 max-w-[180px] truncate">
                              {r.primaryCategory}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 max-w-[160px] truncate">
                              {r.devName}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.devWebsite !== '-' ? (
                                <a
                                  href={r.devWebsite}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showToast(`Opening developer website: ${r.devWebsite}...`, 'info', 'External Link');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate max-w-[130px]"
                                >
                                  <Globe className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{r.devWebsite.replace(/^https?:\/\//, '')}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  r.status === 'Verified'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : r.status === 'Partially Verified'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showToast(`Opening Shopify listing for "${r.appName}"...`, 'info', 'External Link');
                                  }}
                                  className="text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Official Shopify Listing"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectRecord(r);
                                    showToast(`Inspecting details for "${r.appName}"`, 'info', 'App Details');
                                  }}
                                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                  title="View Record Details"
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
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">
                    Showing page {tablePage} (Records {(tablePage - 1) * 25 + 1} -{' '}
                    {Math.min(totalRecords, tablePage * 25)} of {totalRecords})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const prev = Math.max(1, tablePage - 1);
                        onPageChange(prev);
                        showToast(`Navigated to page ${prev}`, 'info', 'Pagination');
                      }}
                      disabled={tablePage <= 1}
                      className="px-3 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium cursor-pointer shadow-xs transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        const next = tablePage + 1;
                        onPageChange(next);
                        showToast(`Navigated to page ${next}`, 'info', 'Pagination');
                      }}
                      disabled={tablePage * 25 >= totalRecords}
                      className="px-3 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium cursor-pointer shadow-xs transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: COMPANIES DIRECTORY */}
          {/* ========================================================================= */}
          {activeNav === 'companies' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Consolidated Companies & Publishers</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    De-duplicated developer entities grouping multi-app portfolios under single organizations.
                  </p>
                </div>
                <a
                  href="/api/export/developers-csv"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Developers CSV</span>
                </a>
              </div>

              {developers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-300 rounded-lg bg-white p-8 space-y-3">
                  <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">No Companies Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No multi-app companies or publisher profiles found in the dataset. Start a crawl in the Crawler Admin Console to populate developer data.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {developers.map((dev) => (
                    <div
                      key={dev.id}
                      onClick={() => handleDeveloperClick(dev.devName)}
                      className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-colors cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{dev.devName}</h3>
                          {dev.partnerHandle && (
                            <span className="text-[11px] font-mono text-slate-500">@{dev.partnerHandle}</span>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-bold text-xs text-slate-800">
                          {dev.appCount} {dev.appCount === 1 ? 'app' : 'apps'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-500">
                        {dev.devWebsite !== '-' && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate text-blue-600 hover:underline">{dev.devWebsite}</span>
                          </div>
                        )}
                        {dev.devAddress !== '-' && (
                          <div className="text-[11px] text-slate-500 truncate">{dev.devAddress}</div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Avg Rating:</span>
                        <span className="font-mono font-bold text-amber-600">
                          {dev.avgRating !== '-' ? `${dev.avgRating} ★` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 4: CATEGORIES INTELLIGENCE */}
          {/* ========================================================================= */}
          {activeNav === 'categories' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span>Marketplace Categories Intelligence</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Breakdown of all {analytics?.allCategories.length || 0} primary Shopify App Store categories.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Category Name</th>
                      <th className="py-3 px-3 text-center">App Count</th>
                      <th className="py-3 px-3 text-center">Market Share</th>
                      <th className="py-3 px-3 text-center">Avg Rating</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900">
                    {(!analytics?.allCategories || analytics.allCategories.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                          No primary marketplace categories discovered in dataset yet.
                        </td>
                      </tr>
                    ) : (
                      analytics.allCategories.map((cat, idx) => (
                        <tr
                          key={cat.category}
                          onClick={() => handleCategoryClick(cat.category)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400">#{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{cat.category}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{cat.count}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">{cat.percentage}%</td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber-600 font-bold">
                            {cat.avgRating !== null ? `${cat.avgRating} ★` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCategoryClick(cat.category);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold hover:underline"
                            >
                              Explore Apps
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 5: DATA QUALITY AUDIT */}
          {/* ========================================================================= */}
          {activeNav === 'quality' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Data Quality & Verification Audit</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Field completeness audit, missing data detection, and verification health checks.
                  </p>
                </div>
              </div>

              {dataQuality && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification Status</span>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-700 font-medium">Fully Verified:</span>
                        <span className="font-mono font-bold text-slate-900">{dataQuality.fullyVerifiedCount} ({dataQuality.fullyVerifiedPercent}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-800 font-medium">Partially Verified:</span>
                        <span className="font-mono font-bold text-slate-900">{dataQuality.partiallyVerifiedCount} ({dataQuality.partiallyVerifiedPercent}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-700 font-medium">Unverified:</span>
                        <span className="font-mono font-bold text-slate-900">{dataQuality.unverifiedCount} ({dataQuality.unverifiedPercent}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Missing Key Fields</span>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Missing Dev Websites:</span>
                        <span className="font-mono text-rose-600 font-bold">{dataQuality.missingDevWebsiteCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Missing Launch Dates:</span>
                        <span className="font-mono text-slate-900 font-bold">{dataQuality.missingLaunchDateCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Missing Primary Categories:</span>
                        <span className="font-mono text-emerald-700 font-bold">{dataQuality.missingPrimaryCategoryCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Integrity</span>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Duplicate Check Hits:</span>
                        <span className="font-mono text-slate-900 font-bold">{dataQuality.duplicateCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Failed / Unresolved:</span>
                        <span className="font-mono text-rose-600 font-bold">{dataQuality.failedRecordsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Analyzed:</span>
                        <span className="font-mono text-slate-900 font-bold">{dataQuality.totalRecords}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 6: CRAWLER & HISTORY */}
          {/* ========================================================================= */}
          {activeNav === 'crawler' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Crawler Status & Activity Stream</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live background crawler progress, throughput pace, and real-time events.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onReset && (
                    <button
                      onClick={onReset}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Reset all crawl state and collected data"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset Data</span>
                    </button>
                  )}
                  <button
                    onClick={onSwitchToAdmin}
                    className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Open Full Crawler Controls
                  </button>
                </div>
              </div>

              {/* Status card */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        crawlerStats.status === 'running'
                          ? 'bg-emerald-500 animate-pulse'
                          : crawlerStats.status === 'paused'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 capitalize">{crawlerStats.status}</h3>
                      <p className="text-xs text-slate-500">{crawlerStats.statusMessage}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-500">
                    <div>{crawlerStats.appsProcessed} apps processed</div>
                    <div>Page {crawlerStats.currentPage} of {crawlerStats.totalPagesDiscovered || 1035}</div>
                  </div>
                </div>
              </div>

              {/* Event Stream */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Stream Events</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {crawlerEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-100 transition-colors"
                    >
                      <span className="font-semibold text-slate-900">{evt.message}</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 7: REPORTS & EXPORTS */}
          {/* ========================================================================= */}
          {activeNav === 'reports' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                  <Download className="w-5 h-5 text-blue-600" />
                  <span>Reports & Export Center</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download production-ready spreadsheets and data dumps in Excel and CSV formats.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Excel Workbook */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">Full Excel Workbook (.xlsx)</h3>
                    <p className="text-xs text-slate-500">
                      Multi-sheet workbook with All Apps, Grouped Developers, Crawl Summary, and Error Logs.
                    </p>
                  </div>
                  <a
                    href="/api/export/excel"
                    download="Shopify_App_Directory.xlsx"
                    onClick={() => {
                      showToast('Downloading comprehensive 4-sheet Excel workbook...', 'success', 'Export Started');
                    }}
                    className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel Workbook</span>
                  </a>
                </div>

                {/* Apps CSV */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                      <Download className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">All Apps CSV (.csv)</h3>
                    <p className="text-xs text-slate-500">
                      Standard CSV export of all collected app records including ranks, URLs, ratings, and devs.
                    </p>
                  </div>
                  <a
                    href="/api/export/csv"
                    download="Shopify_Apps_Directory.csv"
                    onClick={() => {
                      showToast('Downloading All Apps CSV file...', 'success', 'Export Started');
                    }}
                    className="w-full py-2.5 rounded-md bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-300 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Apps CSV</span>
                  </a>
                </div>

                {/* Developers CSV */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">Grouped Developers CSV (.csv)</h3>
                    <p className="text-xs text-slate-500">
                      Consolidated developer publisher entities with app portfolios, ratings, and websites.
                    </p>
                  </div>
                  <a
                    href="/api/export/developers-csv"
                    download="Shopify_Developers.csv"
                    onClick={() => {
                      showToast('Downloading Multi-App Companies CSV file...', 'success', 'Export Started');
                    }}
                    className="w-full py-2.5 rounded-md bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-300 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Developers CSV</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* App Details Modal/Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-['Montserrat',sans-serif]">
                  <span>{selectedRecord.appName}</span>
                  <span className="text-xs font-mono font-normal text-slate-500">
                    (Rank #{selectedRecord.overallOrder})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: <span className="text-slate-900 font-semibold">{selectedRecord.primaryCategory}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  onSelectRecord(null);
                  showToast('Closed app details modal', 'info', 'Modal Closed');
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Review Rating</span>
                <div className="text-base font-bold text-amber-600 flex items-center gap-1 font-mono">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{selectedRecord.rating}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium">Verification Status</span>
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded font-bold text-[11px] border ${
                      selectedRecord.status === 'Verified'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedRecord.status === 'Partially Verified'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 col-span-2">
                <span className="text-slate-500 font-medium">Developer</span>
                <div className="font-semibold text-slate-900">{selectedRecord.devName}</div>
                {selectedRecord.devWebsite !== '-' && (
                  <a
                    href={selectedRecord.devWebsite}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      showToast(`Opening developer website: ${selectedRecord.devWebsite}...`, 'info', 'External Link');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 pt-0.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{selectedRecord.devWebsite}</span>
                  </a>
                )}
                {selectedRecord.devAddress !== '-' && (
                  <p className="text-[11px] text-slate-500 pt-0.5">{selectedRecord.devAddress}</p>
                )}
              </div>

              {selectedRecord.notes && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 col-span-2">
                  <span className="text-slate-500 font-medium">Extraction Notes</span>
                  <p className="text-slate-900 font-mono text-[11px]">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <a
                href={selectedRecord.shopifyUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  showToast(`Opening Shopify listing for "${selectedRecord.appName}"...`, 'info', 'External Link');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <span>View on Shopify App Store</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  onSelectRecord(null);
                  showToast('Closed app details modal', 'info', 'Modal Closed');
                }}
                className="px-4 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
