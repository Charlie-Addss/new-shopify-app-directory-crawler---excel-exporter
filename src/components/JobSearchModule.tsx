import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
  AlertCircle,
  HelpCircle,
  Settings as SettingsIcon,
  Sliders,
  DollarSign,
  Tag,
  BookmarkCheck,
  Bookmark,
  Share2,
  Check,
  X,
  FileText,
  Mail,
  Linkedin,
  ArrowRight,
  Sparkles,
  TrendingUp,
  BarChart3,
  CalendarDays,
  LayoutGrid,
  ListFilter,
  Table as TableIcon,
  Activity,
  History,
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
  JobOpportunity,
  CompanyResearch,
  JobApplication,
  JobDashboardMetrics,
  JobSearchSettings,
  ApplicationStatus,
  WorkArrangement,
  EmploymentType,
  ExperienceLevel,
  IndustryType,
  JobSource,
  CompanyPriority,
  ResearchStatus,
  JobImportRow,
  JobImportPreviewResult,
  UpcomingFollowUpItem,
  ActivityFeedItem,
} from '../types';

interface JobSearchModuleProps {
  onSwitchToAnalytics: () => void;
  onSwitchToCrawler: () => void;
}

const PIPELINE_STATUSES: { status: ApplicationStatus; label: string; color: string; bg: string }[] = [
  { status: 'Interested', label: 'Interested', color: 'text-[#626B78]', bg: 'bg-[#F0F2F5]' },
  { status: 'To Research', label: 'To Research', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  { status: 'Ready to Apply', label: 'Ready to Apply', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  { status: 'Applied', label: 'Applied', color: 'text-blue-700', bg: 'bg-blue-50' },
  { status: 'Assessment', label: 'Assessment', color: 'text-purple-700', bg: 'bg-purple-50' },
  { status: 'Interview', label: 'Interview', color: 'text-amber-700', bg: 'bg-amber-50' },
  { status: 'Offer', label: 'Offer', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { status: 'Rejected', label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-50' },
  { status: 'Withdrawn', label: 'Withdrawn', color: 'text-slate-600', bg: 'bg-slate-100' },
];

export default function JobSearchModule({
  onSwitchToAnalytics,
  onSwitchToCrawler,
}: JobSearchModuleProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'opportunities' | 'companies' | 'tracker' | 'saved' | 'settings'
  >('dashboard');

  // Global loading and toast
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // 1. Dashboard State
  const [dashboardMetrics, setDashboardMetrics] = useState<JobDashboardMetrics | null>(null);

  // 2. Job Opportunities State
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsViewMode, setJobsViewMode] = useState<'grid' | 'table'>('table');
  const [jobSearch, setJobSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [arrangementFilter, setArrangementFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // 3. Company Directory State
  const [companies, setCompanies] = useState<CompanyResearch[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companySearch, setCompanySearch] = useState('');
  const [compIndustryFilter, setCompIndustryFilter] = useState('all');
  const [compPriorityFilter, setCompPriorityFilter] = useState('all');
  const [compStatusFilter, setCompStatusFilter] = useState('all');
  const [potentialOnlyFilter, setPotentialOnlyFilter] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResearch | null>(null);
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);
  const [activeScorePopover, setActiveScorePopover] = useState<string | null>(null);

  // 4. Application Tracker State
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [trackerViewMode, setTrackerViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [addAppModalOpen, setAddAppModalOpen] = useState(false);

  // 5. Settings State
  const [settings, setSettings] = useState<JobSearchSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Import State
  const [importRawText, setImportRawText] = useState('');
  const [importPreview, setImportPreview] = useState<JobImportPreviewResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // ==========================================
  // Data Fetching
  // ==========================================

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/jobs/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardMetrics(data);
      }
    } catch (e: any) {
      console.error('Failed to fetch dashboard metrics:', e);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(jobsPage),
        limit: '25',
        search: jobSearch,
        industry: industryFilter,
        workArrangement: arrangementFilter,
        experienceLevel: experienceFilter,
        employmentType: typeFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalJobs(data.total || 0);
      }
    } catch (e: any) {
      console.error('Failed to fetch jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const params = new URLSearchParams({
        page: String(companiesPage),
        limit: '25',
        search: companySearch,
        industry: compIndustryFilter,
        priority: compPriorityFilter,
        researchStatus: compStatusFilter,
        potentialOnly: potentialOnlyFilter ? 'true' : 'false',
      });

      const res = await fetch(`/api/companies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setTotalCompanies(data.total || 0);
      }
    } catch (e: any) {
      console.error('Failed to fetch companies:', e);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (e: any) {
      console.error('Failed to fetch applications:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/jobs/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e: any) {
      console.error('Failed to fetch settings:', e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchJobs();
    fetchCompanies();
    fetchApplications();
    fetchSettings();
  }, []);

  // Refetch when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'opportunities' || activeTab === 'saved') {
      fetchJobs();
    } else if (activeTab === 'companies') {
      fetchCompanies();
    } else if (activeTab === 'tracker') {
      fetchApplications();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [
    activeTab,
    jobsPage,
    jobSearch,
    industryFilter,
    arrangementFilter,
    experienceFilter,
    typeFilter,
    statusFilter,
    companiesPage,
    companySearch,
    compIndustryFilter,
    compPriorityFilter,
    compStatusFilter,
    potentialOnlyFilter,
  ]);

  // ==========================================
  // Actions: Jobs
  // ==========================================

  const handleToggleSaveJob = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/jobs/${jobId}/toggle-save`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
        if (selectedJob?.id === jobId) setSelectedJob(updated);
        showToast(updated.isSaved ? 'Job saved to bookmarks' : 'Job removed from bookmarks', 'info');
        fetchDashboard();
      }
    } catch (e: any) {
      showToast('Failed to update bookmark: ' + e.message, 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job listing?')) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Job listing removed', 'info');
        if (selectedJob?.id === jobId) setSelectedJob(null);
        fetchJobs();
        fetchDashboard();
      }
    } catch (e: any) {
      showToast('Failed to delete job: ' + e.message, 'error');
    }
  };

  const handleCreateApplicationFromJob = async (job: JobOpportunity) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          companyId: job.companyId,
          companyName: job.companyName,
          companyWebsite: job.companyWebsite,
          jobUrl: job.jobUrl,
          status: 'Interested',
          notes: `Added from job opportunity: ${job.title}`,
        }),
      });

      if (res.ok) {
        showToast(`Created application tracker for "${job.title}"`, 'success');
        fetchApplications();
        fetchDashboard();
        fetchJobs();
        setActiveTab('tracker');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create application', 'error');
      }
    } catch (e: any) {
      showToast('Failed to create application: ' + e.message, 'error');
    }
  };

  // ==========================================
  // Actions: Companies
  // ==========================================

  const handleUpdateCompany = async (
    id: string,
    updates: Partial<CompanyResearch>
  ) => {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updated = await res.json();
        setCompanies((prev) => prev.map((c) => (c.id === id ? updated : c)));
        if (selectedCompany?.id === id) setSelectedCompany(updated);
        showToast('Company research updated', 'success');
        fetchDashboard();
      }
    } catch (e: any) {
      showToast('Failed to update company: ' + e.message, 'error');
    }
  };

  // ==========================================
  // Actions: Applications
  // ==========================================

  const handleUpdateApplicationStatus = async (
    appId: string,
    newStatus: ApplicationStatus,
    note?: string
  ) => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          statusChangeNote: note || `Updated stage to ${newStatus}`,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
        if (selectedApplication?.id === appId) setSelectedApplication(updated);
        showToast(`Application moved to "${newStatus}"`, 'success');
        fetchDashboard();
      }
    } catch (e: any) {
      showToast('Failed to update status: ' + e.message, 'error');
    }
  };

  // ==========================================
  // Actions: Spreadsheet Import
  // ==========================================

  const parseCsvText = (text: string): JobImportRow[] => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];

    // Header inspection
    const firstLine = lines[0];
    const hasHeader =
      firstLine.toLowerCase().includes('title') ||
      firstLine.toLowerCase().includes('company') ||
      firstLine.toLowerCase().includes('role');

    const startIndex = hasHeader ? 1 : 0;
    const parsedRows: JobImportRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 2) continue;

      parsedRows.push({
        title: cols[0] || '',
        companyName: cols[1] || '',
        location: cols[2] || 'Remote',
        workArrangement: (cols[3] as WorkArrangement) || 'Remote',
        salaryRaw: cols[4] || '',
        jobUrl: cols[5] || '',
        companyWebsite: cols[6] || '',
        requiredSkills: cols[7] ? cols[7].split(';') : [],
        description: cols[8] || '',
      });
    }

    return parsedRows;
  };

  const handlePreviewImport = async () => {
    if (!importRawText.trim()) {
      showToast('Please paste CSV text or select a file to import', 'error');
      return;
    }

    setImportLoading(true);
    try {
      const rows = parseCsvText(importRawText);
      if (rows.length === 0) {
        showToast('Could not parse any rows. Ensure comma-separated values (Title, Company, Location, ...)', 'error');
        setImportLoading(false);
        return;
      }

      const res = await fetch('/api/jobs/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (res.ok) {
        const preview = await res.json();
        setImportPreview(preview);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to preview import', 'error');
      }
    } catch (e: any) {
      showToast('Import preview error: ' + e.message, 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview || importPreview.validCount === 0) return;

    setImportLoading(true);
    try {
      const validRows = importPreview.rows
        .filter((r) => r.status === 'valid')
        .map((r) => r.data);

      const res = await fetch('/api/jobs/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(`Successfully imported ${result.addedCount} jobs!`, 'success');
        setImportModalOpen(false);
        setImportRawText('');
        setImportPreview(null);
        fetchJobs();
        fetchDashboard();
      }
    } catch (e: any) {
      showToast('Commit error: ' + e.message, 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // ==========================================
  // Priority Reasons Tooltip / Popover Renderer
  // ==========================================

  const renderPriorityBadge = (company: CompanyResearch) => {
    const isPopoverOpen = activeScorePopover === company.id;

    return (
      <div className="relative inline-block">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveScorePopover(isPopoverOpen ? null : company.id);
          }}
          className={`px-2 py-0.5 rounded text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
            company.priority === 'High'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : company.priority === 'Medium'
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : company.priority === 'Low'
              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              : 'bg-[#F0F2F5] text-[#626B78] border-[#E1E4E8]'
          }`}
          title="Click to inspect priority score breakdown"
        >
          <span>{company.priority}</span>
          <span className="font-mono text-[11px] opacity-75">({company.priorityScore})</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {isPopoverOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 w-72 p-3 bg-white border border-[#E1E4E8] rounded-xl shadow-xl z-50 text-left text-xs text-[#20242B] animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4E8] pb-1.5 mb-2">
              <span className="font-bold text-[#20242B]">Priority Score Breakdown</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {company.priorityScore}/100 pts
              </span>
            </div>
            <p className="text-[11px] text-[#69717D] mb-2">
              Calculated dynamically from role relevance, industry match, active openings, and website verification.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(company.priorityReasons || []).map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#20242B]">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[#E1E4E8] flex justify-end">
              <button
                onClick={() => setActiveScorePopover(null)}
                className="text-[11px] font-semibold text-[#626B78] hover:text-[#20242B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#20242B] flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-white text-[#20242B] border-[#E1E4E8]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <Activity className="w-4 h-4 text-[#626B78]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="border-b border-[#E1E4E8] bg-white sticky top-0 z-40 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F0F2F5] border border-[#E1E4E8] flex items-center justify-center text-[#20242B] font-bold">
            <Briefcase className="w-4 h-4 text-[#626B78]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-[#20242B]">
                Job Search & Employer Research
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#F0F2F5] text-[#626B78] border border-[#E1E4E8]">
                SaaS & Shopify Talent Tracker
              </span>
            </div>
            <p className="text-xs text-[#69717D]">
              Discover verified companies, opportunities, and manage application pipeline
            </p>
          </div>
        </div>

        {/* Global Navigation Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* 3-Way Product Navigation Segmented Control */}
          <div className="inline-flex p-1 bg-[#F5F6F8] border border-[#E1E4E8] rounded-xl text-xs font-medium">
            <button
              onClick={onSwitchToAnalytics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#69717D] hover:text-[#20242B] hover:bg-white transition cursor-pointer"
              title="Switch to Marketplace Analytics & App Directory"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Marketplace Analytics</span>
            </button>
            <button
              onClick={onSwitchToCrawler}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#69717D] hover:text-[#20242B] hover:bg-white transition cursor-pointer"
              title="Switch to Crawler Console & Pipeline"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Crawler Console</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#626B78] text-white font-semibold shadow-xs cursor-default"
              title="Currently active module"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Search & Employers</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              fetchDashboard();
              fetchJobs();
              fetchCompanies();
              fetchApplications();
              showToast('Data refreshed', 'info');
            }}
            disabled={loading}
            className="p-2 rounded-lg bg-white hover:bg-[#F0F2F5] active:scale-95 text-[#20242B] border border-[#D6DAE0] text-xs font-medium transition cursor-pointer shadow-sm ml-1"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#626B78]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Module Sub-Navigation Bar */}
      <nav className="bg-white border-b border-[#E1E4E8] px-6 py-2 flex flex-wrap items-center justify-between gap-3 sticky top-[57px] z-30">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'opportunities', label: 'Job Opportunities', icon: Briefcase },
            { id: 'companies', label: 'Company Directory', icon: Building2 },
            { id: 'tracker', label: 'Application Tracker', icon: Clock },
            { id: 'saved', label: 'Saved Jobs', icon: Bookmark },
            { id: 'settings', label: 'Search Settings', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#F0F2F5] text-[#20242B] font-semibold border border-[#E1E4E8]'
                    : 'text-[#69717D] hover:text-[#20242B] hover:bg-[#F5F6F8]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#20242B]' : 'text-[#626B78]'}`} />
                <span>{item.label}</span>
                {item.id === 'tracker' && applications.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#E1E4E8] text-[#20242B]">
                    {applications.length}
                  </span>
                )}
                {item.id === 'saved' && dashboardMetrics?.kpis.jobsSaved ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800">
                    {dashboardMetrics.kpis.jobsSaved}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'opportunities' && (
            <>
              <button
                onClick={() => setAddJobModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Job</span>
              </button>
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F2F5] text-[#20242B] text-xs font-medium border border-[#D6DAE0] shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#626B78]" />
                <span>Import Spreadsheet</span>
              </button>
              <a
                href="/api/export/jobs-excel"
                download="Job_Opportunities.xlsx"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F2F5] text-[#20242B] text-xs font-medium border border-[#D6DAE0] shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Jobs Excel</span>
              </a>
            </>
          )}

          {activeTab === 'companies' && (
            <>
              <button
                onClick={() => setAddCompanyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Company</span>
              </button>
              <a
                href="/api/export/companies-research-csv"
                download="Company_Employer_Research.csv"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F2F5] text-[#20242B] text-xs font-medium border border-[#D6DAE0] shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#626B78]" />
                <span>Companies CSV</span>
              </a>
            </>
          )}

          {activeTab === 'tracker' && (
            <>
              <button
                onClick={() => setAddAppModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Application</span>
              </button>
              <a
                href="/api/export/applications-excel"
                download="Job_Applications_Tracker.xlsx"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F2F5] text-[#20242B] text-xs font-medium border border-[#D6DAE0] shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Pipeline</span>
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: JOB SEARCH DASHBOARD                              */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Row (7 Real Metrics) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
              {[
                {
                  label: 'Companies Tracked',
                  value: dashboardMetrics?.kpis.totalCompaniesTracked || 0,
                  icon: Building2,
                  color: 'text-[#20242B]',
                  sub: 'Crawled & Custom',
                },
                {
                  label: 'Jobs Discovered',
                  value: dashboardMetrics?.kpis.totalJobsDiscovered || 0,
                  icon: Briefcase,
                  color: 'text-[#20242B]',
                  sub: 'Active & Verified',
                },
                {
                  label: 'Jobs Saved',
                  value: dashboardMetrics?.kpis.jobsSaved || 0,
                  icon: Bookmark,
                  color: 'text-amber-700',
                  sub: 'Bookmarked',
                },
                {
                  label: 'Applications',
                  value: dashboardMetrics?.kpis.applicationsSubmitted || 0,
                  icon: Clock,
                  color: 'text-blue-700',
                  sub: 'Active in Pipeline',
                },
                {
                  label: 'Interviews',
                  value: dashboardMetrics?.kpis.interviewsScheduled || 0,
                  icon: Calendar,
                  color: 'text-purple-700',
                  sub: 'Scheduled/Active',
                },
                {
                  label: 'Offers Received',
                  value: dashboardMetrics?.kpis.offersReceived || 0,
                  icon: CheckCircle2,
                  color: 'text-emerald-700',
                  sub: 'Final Stage',
                },
                {
                  label: 'Follow-ups Due',
                  value: dashboardMetrics?.kpis.followUpsDue || 0,
                  icon: AlertCircle,
                  color:
                    (dashboardMetrics?.kpis.followUpsDue || 0) > 0 ? 'text-amber-600' : 'text-[#69717D]',
                  sub: 'Due Today / Overdue',
                },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white border border-[#E1E4E8] rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[#69717D] mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">{kpi.label}</span>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className={`text-2xl font-bold font-mono tracking-tight ${kpi.color}`}>
                        {kpi.value.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-[#69717D] mt-0.5">{kpi.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart 1: Applications by Status */}
              <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-[#20242B]">Application Pipeline by Stage</h3>
                    <p className="text-xs text-[#69717D]">
                      Active distribution across recruitment milestones
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#69717D]">
                    {applications.length} total
                  </span>
                </div>
                {dashboardMetrics?.applicationsByStatus && dashboardMetrics.applicationsByStatus.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardMetrics.applicationsByStatus}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E4E8" />
                        <XAxis
                          dataKey="status"
                          stroke="#69717D"
                          fontSize={11}
                          tickLine={false}
                          angle={-25}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis stroke="#69717D" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border border-[#E1E4E8] p-2.5 rounded-lg shadow-md text-xs">
                                  <p className="font-semibold text-[#20242B]">{d.status}</p>
                                  <p className="font-mono text-emerald-700 font-bold mt-0.5">
                                    {d.count} {d.count === 1 ? 'application' : 'applications'}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {dashboardMetrics.applicationsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#626B78'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-xs text-[#69717D] border border-dashed border-[#E1E4E8] rounded-lg">
                    <Clock className="w-6 h-6 text-[#626B78] mb-1.5 opacity-50" />
                    <span>No applications tracked yet</span>
                    <button
                      onClick={() => setAddAppModalOpen(true)}
                      className="mt-2 text-xs font-semibold text-[#20242B] underline cursor-pointer"
                    >
                      Create your first application
                    </button>
                  </div>
                )}
              </div>

              {/* Chart 2: Jobs by Industry */}
              <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-[#20242B]">Jobs Discovered by Industry</h3>
                    <p className="text-xs text-[#69717D]">
                      Breakdown across Shopify Apps, SaaS, and E-commerce tech
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#69717D]">{totalJobs} jobs</span>
                </div>
                {dashboardMetrics?.jobsByIndustry && dashboardMetrics.jobsByIndustry.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardMetrics.jobsByIndustry}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E4E8" />
                        <XAxis
                          dataKey="industry"
                          stroke="#69717D"
                          fontSize={11}
                          tickLine={false}
                          angle={-20}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis stroke="#69717D" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border border-[#E1E4E8] p-2.5 rounded-lg shadow-md text-xs">
                                  <p className="font-semibold text-[#20242B]">{d.industry}</p>
                                  <p className="font-mono text-[#626B78] font-bold mt-0.5">
                                    {d.count} {d.count === 1 ? 'opening' : 'openings'}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="#626B78" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-xs text-[#69717D] border border-dashed border-[#E1E4E8] rounded-lg">
                    <Briefcase className="w-6 h-6 text-[#626B78] mb-1.5 opacity-50" />
                    <span>No jobs categorized yet</span>
                  </div>
                )}
              </div>

              {/* Chart 3: Jobs by Work Arrangement */}
              <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-[#20242B]">Work Arrangement Distribution</h3>
                    <p className="text-xs text-[#69717D]">
                      Remote vs Hybrid vs On-site positions in the database
                    </p>
                  </div>
                </div>
                {dashboardMetrics?.jobsByArrangement && dashboardMetrics.jobsByArrangement.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardMetrics.jobsByArrangement}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E1E4E8" />
                        <XAxis type="number" stroke="#69717D" fontSize={11} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="arrangement" stroke="#69717D" fontSize={11} tickLine={false} width={70} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border border-[#E1E4E8] p-2.5 rounded-lg shadow-md text-xs">
                                  <p className="font-semibold text-[#20242B]">{d.arrangement}</p>
                                  <p className="font-mono text-[#626B78] font-bold mt-0.5">
                                    {d.count} positions
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="#626B78" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-52 flex flex-col items-center justify-center text-xs text-[#69717D] border border-dashed border-[#E1E4E8] rounded-lg">
                    <span>No arrangement data</span>
                  </div>
                )}
              </div>

              {/* Chart 4: Opportunities by Source */}
              <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-[#20242B]">Opportunities by Discovery Source</h3>
                    <p className="text-xs text-[#69717D]">
                      Company career sites, LinkedIn, referrals, and job boards
                    </p>
                  </div>
                </div>
                {dashboardMetrics?.opportunitiesBySource && dashboardMetrics.opportunitiesBySource.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardMetrics.opportunitiesBySource}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E4E8" />
                        <XAxis dataKey="source" stroke="#69717D" fontSize={11} tickLine={false} />
                        <YAxis stroke="#69717D" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border border-[#E1E4E8] p-2.5 rounded-lg shadow-md text-xs">
                                  <p className="font-semibold text-[#20242B]">{d.source}</p>
                                  <p className="font-mono text-[#626B78] font-bold mt-0.5">
                                    {d.count} discovered
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="#7B8491" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-52 flex flex-col items-center justify-center text-xs text-[#69717D] border border-dashed border-[#E1E4E8] rounded-lg">
                    <span>No sources recorded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Upcoming Follow-ups & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Upcoming Follow-ups Panel */}
              <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-[#E1E4E8] pb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#626B78]" />
                    <h3 className="font-bold text-sm text-[#20242B]">Upcoming & Overdue Follow-ups</h3>
                  </div>
                  <span className="text-xs text-[#69717D] font-mono">
                    {dashboardMetrics?.upcomingFollowUps.length || 0} pending
                  </span>
                </div>

                {dashboardMetrics?.upcomingFollowUps && dashboardMetrics.upcomingFollowUps.length > 0 ? (
                  <div className="divide-y divide-[#E1E4E8] max-h-72 overflow-y-auto">
                    {dashboardMetrics.upcomingFollowUps.map((fu) => (
                      <div key={fu.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#20242B] truncate">{fu.targetName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${
                                fu.isOverdue
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-[#F0F2F5] text-[#626B78] border-[#E1E4E8]'
                              }`}
                            >
                              {fu.isOverdue ? 'Overdue' : 'Due Soon'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#69717D] truncate">{fu.notes}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-mono font-semibold text-[#20242B] block">{fu.date}</span>
                          <span className="text-[10px] text-[#69717D]">{fu.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-[#69717D]">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-60" />
                    <span>No upcoming follow-ups due. You're all caught up!</span>
                  </div>
                )}
              </div>

              {/* Recent Activity Feed */}
              <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-[#E1E4E8] pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#626B78]" />
                    <h3 className="font-bold text-sm text-[#20242B]">Recent Activity Stream</h3>
                  </div>
                  <span className="text-xs text-[#69717D]">Audit trail</span>
                </div>

                {dashboardMetrics?.recentActivity && dashboardMetrics.recentActivity.length > 0 ? (
                  <div className="divide-y divide-[#E1E4E8] max-h-72 overflow-y-auto">
                    {dashboardMetrics.recentActivity.map((act) => (
                      <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-[#20242B]">{act.title}</p>
                          {act.description && (
                            <p className="text-[11px] text-[#69717D] truncate">{act.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#69717D] flex-shrink-0">
                          {new Date(act.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-[#69717D]">
                    <span>No recent activity logged</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: JOB OPPORTUNITIES / SEARCH                        */}
        {/* ======================================================== */}
        {(activeTab === 'opportunities' || activeTab === 'saved') && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-[#E1E4E8] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#69717D]" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => {
                      setJobSearch(e.target.value);
                      setJobsPage(1);
                    }}
                    placeholder="Search by job title, keywords, company, skills..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B] focus:outline-none focus:ring-2 focus:ring-[#7B8491]"
                  />
                  {jobSearch && (
                    <button
                      onClick={() => setJobSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#69717D] hover:text-[#20242B]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="inline-flex border border-[#D6DAE0] rounded-lg p-0.5 bg-[#F5F6F8]">
                    <button
                      onClick={() => setJobsViewMode('table')}
                      className={`p-1.5 rounded text-xs transition cursor-pointer ${
                        jobsViewMode === 'table' ? 'bg-white shadow-xs text-[#20242B]' : 'text-[#69717D]'
                      }`}
                      title="Table List View"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setJobsViewMode('grid')}
                      className={`p-1.5 rounded text-xs transition cursor-pointer ${
                        jobsViewMode === 'grid' ? 'bg-white shadow-xs text-[#20242B]' : 'text-[#69717D]'
                      }`}
                      title="Grid Card View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs text-[#69717D] font-mono">
                    {totalJobs} {totalJobs === 1 ? 'opening' : 'openings'}
                  </span>
                </div>
              </div>

              {/* Secondary Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E1E4E8] text-xs">
                {/* Industry Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Industry:</span>
                  <select
                    value={industryFilter}
                    onChange={(e) => {
                      setIndustryFilter(e.target.value);
                      setJobsPage(1);
                    }}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B] focus:outline-none focus:ring-1 focus:ring-[#7B8491]"
                  >
                    <option value="all">All Industries</option>
                    <option value="Shopify Apps">Shopify Apps</option>
                    <option value="SaaS">SaaS</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Fintech">Fintech</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Work Arrangement */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Arrangement:</span>
                  <select
                    value={arrangementFilter}
                    onChange={(e) => {
                      setArrangementFilter(e.target.value);
                      setJobsPage(1);
                    }}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B] focus:outline-none focus:ring-1 focus:ring-[#7B8491]"
                  >
                    <option value="all">All Arrangements</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                {/* Experience Level */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Experience:</span>
                  <select
                    value={experienceFilter}
                    onChange={(e) => {
                      setExperienceFilter(e.target.value);
                      setJobsPage(1);
                    }}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B] focus:outline-none focus:ring-1 focus:ring-[#7B8491]"
                  >
                    <option value="all">All Levels</option>
                    <option value="Entry">Entry Level</option>
                    <option value="Mid">Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead / Architect</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>

                {/* Employment Type */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setJobsPage(1);
                    }}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B] focus:outline-none focus:ring-1 focus:ring-[#7B8491]"
                  >
                    <option value="all">All Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setJobsPage(1);
                    }}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B] focus:outline-none focus:ring-1 focus:ring-[#7B8491]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Expired">Expired</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>

                {/* Saved Filter Preset Shortcuts */}
                {settings?.savedFilters && settings.savedFilters.length > 0 && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[#69717D] font-medium">Preset:</span>
                    <select
                      onChange={(e) => {
                        const filterId = e.target.value;
                        const preset = settings.savedFilters.find((f) => f.id === filterId);
                        if (preset) {
                          if (preset.industry) setIndustryFilter(preset.industry);
                          if (preset.arrangement) setArrangementFilter(preset.arrangement);
                          if (preset.experience) setExperienceFilter(preset.experience);
                          if (preset.targetRole) setJobSearch(preset.targetRole);
                          setJobsPage(1);
                        }
                      }}
                      className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#626B78]"
                    >
                      <option value="">Load Saved Filter...</option>
                      {settings.savedFilters.map((sf) => (
                        <option key={sf.id} value={sf.id}>
                          {sf.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Jobs View Mode: Table List */}
            {jobsViewMode === 'table' ? (
              <div className="bg-white border border-[#E1E4E8] rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F5F6F8] border-b border-[#E1E4E8] text-[#69717D] font-semibold">
                        <th className="py-2.5 px-3 w-10 text-center">Save</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Role & Title</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Company</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Arrangement</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Salary Range</th>
                        <th className="py-2.5 px-3 min-w-[100px]">Experience</th>
                        <th className="py-2.5 px-3 min-w-[90px]">Status</th>
                        <th className="py-2.5 px-3 min-w-[100px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E4E8]">
                      {jobs.map((job) => {
                        const isSaved = job.isSaved;
                        const hasApplication = !!job.applicationId;

                        return (
                          <tr
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="hover:bg-[#F0F2F5] transition cursor-pointer"
                          >
                            <td
                              className="py-2.5 px-3 text-center"
                              onClick={(e) => handleToggleSaveJob(job.id, e)}
                            >
                              <button className="text-[#69717D] hover:text-amber-600 transition cursor-pointer">
                                {isSaved ? (
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                ) : (
                                  <Star className="w-4 h-4 text-[#D6DAE0]" />
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-[#20242B] block hover:text-[#626B78]">
                                {job.title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-[#69717D]">{job.industry}</span>
                                <span className="text-[#D6DAE0]">•</span>
                                <span className="text-[11px] text-[#69717D] flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#69717D]" />
                                  {job.location}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-[#20242B] block">
                                {job.companyName}
                              </span>
                              {job.companyWebsite && (
                                <span className="text-[11px] text-[#69717D] truncate block max-w-[140px]">
                                  {job.companyWebsite.replace(/^https?:\/\//, '')}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  job.workArrangement === 'Remote'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : job.workArrangement === 'Hybrid'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-[#F0F2F5] text-[#626B78] border-[#E1E4E8]'
                                }`}
                              >
                                {job.workArrangement}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-medium text-[#20242B]">
                              {job.salaryRaw ||
                                (job.salaryMin && job.salaryMax
                                  ? `${job.salaryCurrency || '$'}${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                                  : '-')}
                            </td>
                            <td className="py-2.5 px-3 text-[#69717D]">
                              {job.experienceLevel} ({job.employmentType})
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                  job.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                {hasApplication ? (
                                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                                    Tracking
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleCreateApplicationFromJob(job)}
                                    className="px-2 py-1 rounded bg-[#626B78] hover:bg-[#525B67] text-white text-[11px] font-semibold transition cursor-pointer"
                                    title="Add to application pipeline"
                                  >
                                    Track
                                  </button>
                                )}
                                {job.jobUrl && (
                                  <a
                                    href={job.jobUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded text-[#626B78] hover:text-[#20242B] hover:bg-[#F0F2F5] transition"
                                    title="Open original job posting"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {jobs.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-xs text-[#69717D]">
                            No jobs found matching your filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Jobs View Mode: Grid Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="bg-white border border-[#E1E4E8] rounded-xl p-4 shadow-xs hover:border-[#7B8491] transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] text-[#69717D] uppercase font-bold tracking-wider">
                          {job.industry}
                        </span>
                        <button
                          onClick={(e) => handleToggleSaveJob(job.id, e)}
                          className="text-[#69717D] hover:text-amber-600 transition"
                        >
                          {job.isSaved ? (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          ) : (
                            <Star className="w-4 h-4 text-[#D6DAE0]" />
                          )}
                        </button>
                      </div>

                      <h4 className="font-bold text-sm text-[#20242B] leading-snug line-clamp-2 mb-1">
                        {job.title}
                      </h4>
                      <p className="text-xs font-semibold text-[#626B78] mb-2">{job.companyName}</p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-3">
                        <span className="px-2 py-0.5 rounded bg-[#F0F2F5] text-[#20242B] border border-[#E1E4E8]">
                          {job.workArrangement}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F0F2F5] text-[#20242B] border border-[#E1E4E8]">
                          {job.experienceLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F0F2F5] text-[#20242B] border border-[#E1E4E8]">
                          {job.location}
                        </span>
                      </div>

                      <p className="text-xs text-[#69717D] line-clamp-3 mb-3">{job.description}</p>

                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {job.requiredSkills.slice(0, 4).map((s, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[#F5F6F8] text-[#626B78] text-[10px] font-mono border border-[#E1E4E8]"
                            >
                              {s}
                            </span>
                          ))}
                          {job.requiredSkills.length > 4 && (
                            <span className="text-[10px] text-[#69717D] self-center">
                              +{job.requiredSkills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E1E4E8] flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#20242B]">
                        {job.salaryRaw ||
                          (job.salaryMin ? `$${job.salaryMin.toLocaleString()}+` : 'Negotiable')}
                      </span>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {job.applicationId ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                            Tracking
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCreateApplicationFromJob(job)}
                            className="px-2.5 py-1 rounded bg-[#626B78] hover:bg-[#525B67] text-white text-[11px] font-semibold transition"
                          >
                            Track
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: COMPANY DIRECTORY & EMPLOYER RESEARCH             */}
        {/* ======================================================== */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-[#E1E4E8] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#69717D]" />
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setCompaniesPage(1);
                    }}
                    placeholder="Search company name, portfolio app, website, contact..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B] focus:outline-none focus:ring-2 focus:ring-[#7B8491]"
                  />
                  {companySearch && (
                    <button
                      onClick={() => setCompanySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#69717D] hover:text-[#20242B]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-[#20242B] font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={potentialOnlyFilter}
                      onChange={(e) => setPotentialOnlyFilter(e.target.checked)}
                      className="rounded border-[#D6DAE0] text-[#626B78] focus:ring-[#7B8491]"
                    />
                    <span>Target Employers Only</span>
                  </label>
                  <span className="text-xs text-[#69717D] font-mono">
                    {totalCompanies} companies
                  </span>
                </div>
              </div>

              {/* Secondary Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E1E4E8] text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Priority:</span>
                  <select
                    value={compPriorityFilter}
                    onChange={(e) => setCompPriorityFilter(e.target.value)}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B]"
                  >
                    <option value="all">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Unranked">Unranked</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Research Status:</span>
                  <select
                    value={compStatusFilter}
                    onChange={(e) => setCompStatusFilter(e.target.value)}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Contact Identified">Contact Identified</option>
                    <option value="Outreach Sent">Outreach Sent</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#69717D] font-medium">Industry:</span>
                  <select
                    value={compIndustryFilter}
                    onChange={(e) => setCompIndustryFilter(e.target.value)}
                    className="border border-[#D6DAE0] rounded-md px-2 py-1 bg-white text-xs text-[#20242B]"
                  >
                    <option value="all">All Industries</option>
                    <option value="Shopify Apps">Shopify Apps</option>
                    <option value="SaaS">SaaS</option>
                    <option value="E-commerce">E-commerce</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Companies Table */}
            <div className="bg-white border border-[#E1E4E8] rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F6F8] border-b border-[#E1E4E8] text-[#69717D] font-semibold">
                      <th className="py-2.5 px-3 min-w-[200px]">Company Name</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Priority Score</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Research Status</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Apps / Rating</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Active Jobs</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Contact Person</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Follow-Up</th>
                      <th className="py-2.5 px-3 min-w-[90px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E4E8]">
                    {companies.map((comp) => {
                      return (
                        <tr
                          key={comp.id}
                          onClick={() => setSelectedCompany(comp)}
                          className="hover:bg-[#F0F2F5] transition cursor-pointer"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateCompany(comp.id, {
                                    isPotentialEmployer: !comp.isPotentialEmployer,
                                  });
                                }}
                                title="Mark as target employer"
                                className="text-[#69717D] hover:text-amber-500 transition cursor-pointer"
                              >
                                {comp.isPotentialEmployer ? (
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                ) : (
                                  <Star className="w-4 h-4 text-[#D6DAE0]" />
                                )}
                              </button>
                              <div>
                                <span className="font-bold text-[#20242B] block hover:text-[#626B78]">
                                  {comp.name}
                                </span>
                                <div className="flex items-center gap-1.5 text-[11px] text-[#69717D]">
                                  <span>{comp.industry}</span>
                                  {comp.website && (
                                    <>
                                      <span>•</span>
                                      <a
                                        href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[#626B78] hover:underline flex items-center gap-0.5"
                                      >
                                        <span>site</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            {renderPriorityBadge(comp)}
                          </td>
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={comp.researchStatus}
                              onChange={(e) =>
                                handleUpdateCompany(comp.id, {
                                  researchStatus: e.target.value as ResearchStatus,
                                })
                              }
                              className="border border-[#D6DAE0] rounded px-1.5 py-1 bg-white text-[11px] text-[#20242B]"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Contact Identified">Contact Identified</option>
                              <option value="Outreach Sent">Outreach Sent</option>
                              <option value="Archived">Archived</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[#20242B] font-semibold block">
                              {comp.appCount} {comp.appCount === 1 ? 'app' : 'apps'}
                            </span>
                            <span className="text-[11px] text-[#69717D]">
                              Avg rating: {comp.avgRating ? `${comp.avgRating}★` : 'N/A'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {comp.activeJobsCount > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setJobSearch(comp.name);
                                  setActiveTab('opportunities');
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition cursor-pointer"
                              >
                                {comp.activeJobsCount} active {comp.activeJobsCount === 1 ? 'job' : 'jobs'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#69717D]">No active listings</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-[#20242B] block truncate max-w-[130px]">
                              {comp.contactName || '-'}
                            </span>
                            {comp.contactRole && (
                              <span className="text-[10px] text-[#69717D] truncate block max-w-[130px]">
                                {comp.contactRole}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#69717D]">
                            {comp.followUpDate || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedCompany(comp)}
                              className="px-2 py-1 rounded bg-white hover:bg-[#F0F2F5] border border-[#D6DAE0] text-[11px] font-medium text-[#20242B] transition cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: JOB APPLICATION TRACKER (9 PIPELINE STAGES)        */}
        {/* ======================================================== */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
            {/* View Switcher Bar */}
            <div className="flex items-center justify-between bg-white border border-[#E1E4E8] rounded-xl px-4 py-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#20242B]">Pipeline View:</span>
                <div className="inline-flex border border-[#D6DAE0] rounded-lg p-0.5 bg-[#F5F6F8]">
                  <button
                    onClick={() => setTrackerViewMode('kanban')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                      trackerViewMode === 'kanban' ? 'bg-white shadow-xs text-[#20242B]' : 'text-[#69717D]'
                    }`}
                  >
                    Kanban Board
                  </button>
                  <button
                    onClick={() => setTrackerViewMode('table')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                      trackerViewMode === 'table' ? 'bg-white shadow-xs text-[#20242B]' : 'text-[#69717D]'
                    }`}
                  >
                    Table List
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#69717D] font-mono">
                  {applications.length} applications in database
                </span>
                <button
                  onClick={() => setAddAppModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Application</span>
                </button>
              </div>
            </div>

            {/* Kanban Board View (Horizontal Scrolling across 9 statuses) */}
            {trackerViewMode === 'kanban' ? (
              <div className="overflow-x-auto pb-4">
                <div className="flex items-start gap-3.5 min-w-[1600px]">
                  {PIPELINE_STATUSES.map((pipelineCol) => {
                    const colApps = applications.filter((a) => a.status === pipelineCol.status);

                    return (
                      <div
                        key={pipelineCol.status}
                        className="w-72 flex-shrink-0 bg-[#F5F6F8] border border-[#E1E4E8] rounded-xl flex flex-col max-h-[750px]"
                      >
                        {/* Column Header */}
                        <div className="p-3 border-b border-[#E1E4E8] flex items-center justify-between bg-white rounded-t-xl">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                pipelineCol.status === 'Offer'
                                  ? 'bg-emerald-500'
                                  : pipelineCol.status === 'Interview'
                                  ? 'bg-amber-500'
                                  : pipelineCol.status === 'Applied'
                                  ? 'bg-blue-500'
                                  : 'bg-[#626B78]'
                              }`}
                            />
                            <h4 className="font-bold text-xs text-[#20242B]">{pipelineCol.label}</h4>
                          </div>
                          <span className="px-1.5 py-0.2 rounded bg-[#F0F2F5] text-[#20242B] font-mono text-[10px] font-bold border border-[#E1E4E8]">
                            {colApps.length}
                          </span>
                        </div>

                        {/* Column Cards Container */}
                        <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                          {colApps.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => setSelectedApplication(app)}
                              className="bg-white border border-[#E1E4E8] rounded-lg p-3 shadow-xs hover:border-[#7B8491] transition cursor-pointer text-xs space-y-2"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <h5 className="font-bold text-[#20242B] text-xs leading-snug line-clamp-2">
                                  {app.jobTitle}
                                </h5>
                              </div>

                              <p className="font-semibold text-[11px] text-[#626B78]">{app.companyName}</p>

                              {/* Dates & Follow Up */}
                              <div className="space-y-1 text-[10px] font-mono text-[#69717D]">
                                {app.interviewDate && (
                                  <div className="flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    <Calendar className="w-3 h-3" />
                                    <span>Interview: {app.interviewDate}</span>
                                  </div>
                                )}
                                {app.followUpDate && (
                                  <div className="flex items-center gap-1 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    <Clock className="w-3 h-3" />
                                    <span>Follow-up: {app.followUpDate}</span>
                                  </div>
                                )}
                              </div>

                              {app.notes && (
                                <p className="text-[11px] text-[#69717D] line-clamp-2 bg-[#F5F6F8] p-1.5 rounded border border-[#E1E4E8]">
                                  {app.notes}
                                </p>
                              )}

                              {/* Stage Advancement Quick Action */}
                              <div
                                className="pt-2 border-t border-[#E1E4E8] flex items-center justify-between"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <select
                                  value={app.status}
                                  onChange={(e) =>
                                    handleUpdateApplicationStatus(app.id, e.target.value as ApplicationStatus)
                                  }
                                  className="border border-[#D6DAE0] rounded px-1.5 py-0.5 text-[10px] bg-white text-[#20242B]"
                                >
                                  {PIPELINE_STATUSES.map((ps) => (
                                    <option key={ps.status} value={ps.status}>
                                      {ps.label}
                                    </option>
                                  ))}
                                </select>

                                <span className="text-[10px] text-[#69717D] font-mono">
                                  {app.statusHistory.length} logs
                                </span>
                              </div>
                            </div>
                          ))}

                          {colApps.length === 0 && (
                            <div className="py-8 text-center text-[11px] text-[#69717D]">
                              Empty stage
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Tracker Table View */
              <div className="bg-white border border-[#E1E4E8] rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F5F6F8] border-b border-[#E1E4E8] text-[#69717D] font-semibold">
                        <th className="py-2.5 px-3 min-w-[200px]">Job Title</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Company</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Stage</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Date Applied</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Interview</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Follow-Up</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Contact Person</th>
                        <th className="py-2.5 px-3 min-w-[80px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E4E8]">
                      {applications.map((app) => (
                        <tr
                          key={app.id}
                          onClick={() => setSelectedApplication(app)}
                          className="hover:bg-[#F0F2F5] transition cursor-pointer"
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-[#20242B] block">{app.jobTitle}</span>
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-[#626B78] hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                <span>Posting URL</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#20242B]">
                            {app.companyName}
                          </td>
                          <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={app.status}
                              onChange={(e) =>
                                handleUpdateApplicationStatus(app.id, e.target.value as ApplicationStatus)
                              }
                              className="border border-[#D6DAE0] rounded px-2 py-1 text-xs bg-white text-[#20242B] font-medium"
                            >
                              {PIPELINE_STATUSES.map((ps) => (
                                <option key={ps.status} value={ps.status}>
                                  {ps.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#69717D]">
                            {app.dateApplied || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#69717D]">
                            {app.interviewDate || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#69717D]">
                            {app.followUpDate || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[#20242B] font-medium block">
                              {app.contactPerson || '-'}
                            </span>
                            {app.contactEmail && (
                              <span className="text-[10px] text-[#69717D] truncate block max-w-[130px]">
                                {app.contactEmail}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedApplication(app)}
                              className="px-2 py-1 rounded bg-white hover:bg-[#F0F2F5] border border-[#D6DAE0] text-[11px] font-medium text-[#20242B]"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: JOB SEARCH SETTINGS & CONFIGURATION               */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#20242B]">Job Search Profile & Target Criteria</h3>
                <p className="text-xs text-[#69717D]">
                  Configure your primary roles, preferred industries, and location arrangements
                </p>
              </div>

              {/* Target Role Keywords */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-[#20242B]">Target Role Keywords</label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-[#D6DAE0] bg-[#F5F6F8]">
                  {(settings?.targetRoleKeywords || []).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-white border border-[#E1E4E8] text-[#20242B] text-xs flex items-center gap-1.5"
                    >
                      <span>{kw}</span>
                      <button
                        onClick={() => {
                          if (!settings) return;
                          const next = settings.targetRoleKeywords.filter((_, idx) => idx !== i);
                          setSettings({ ...settings, targetRoleKeywords: next });
                        }}
                        className="text-[#69717D] hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    id="new-keyword-input"
                    placeholder="Add keyword (e.g. 'GraphQL', 'Shopify App Bridge')..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && settings) {
                          setSettings({
                            ...settings,
                            targetRoleKeywords: [...settings.targetRoleKeywords, val],
                          });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-keyword-input') as HTMLInputElement;
                      if (input && input.value.trim() && settings) {
                        setSettings({
                          ...settings,
                          targetRoleKeywords: [...settings.targetRoleKeywords, input.value.trim()],
                        });
                        input.value = '';
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold cursor-pointer"
                  >
                    Add Keyword
                  </button>
                </div>
              </div>

              {/* Minimum Target Salary */}
              <div className="space-y-1.5 text-xs max-w-sm">
                <label className="font-bold text-[#20242B]">Minimum Target Salary ($ / yr)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#69717D]" />
                  <input
                    type="number"
                    step="5000"
                    value={settings?.minimumSalaryTarget || 95000}
                    onChange={(e) => {
                      if (!settings) return;
                      setSettings({ ...settings, minimumSalaryTarget: parseFloat(e.target.value) || 0 });
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
              </div>
            </div>

            {/* Priority Weightings Configuration */}
            <div className="bg-white border border-[#E1E4E8] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#20242B]">Company Priority Scoring Weights</h3>
                <p className="text-xs text-[#69717D]">
                  Custom weights for computing company ranking scores (0–100)
                </p>
              </div>

              {settings?.priorityWeights && (
                <div className="space-y-3 text-xs">
                  {[
                    { key: 'roleRelevance', label: 'Role Relevance & Tech Keywords' },
                    { key: 'industryFit', label: 'Industry Fit (Shopify Apps & SaaS)' },
                    { key: 'openingsAvailability', label: 'Active Job Openings in Database' },
                    { key: 'verifiedWebsite', label: 'Verified Company Domain / Website' },
                    { key: 'productQuality', label: 'Product Quality & App Store Ratings' },
                    { key: 'personalInterest', label: 'Personal Interest / Target Employer Tag' },
                  ].map((field) => {
                    const weightVal = (settings.priorityWeights as any)[field.key] || 0;

                    return (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[#20242B]">
                          <span className="font-medium">{field.label}</span>
                          <span className="font-mono font-bold text-[#626B78]">{weightVal} pts</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={weightVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setSettings({
                              ...settings,
                              priorityWeights: {
                                ...settings.priorityWeights,
                                [field.key]: val,
                              },
                            });
                          }}
                          className="w-full accent-[#626B78]"
                        />
                      </div>
                    );
                  })}

                  <div className="pt-3 border-t border-[#E1E4E8] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#20242B]">
                      Total Scoring Capacity:{' '}
                      <span className="font-mono text-emerald-700 font-bold">
                        {Object.values(settings.priorityWeights).reduce((a, b) => a + b, 0)} pts max
                      </span>
                    </span>
                    <button
                      onClick={async () => {
                        if (!settings) return;
                        setSettingsSaving(true);
                        try {
                          const res = await fetch('/api/jobs/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(settings),
                          });
                          if (res.ok) {
                            showToast('Search settings & priority weights saved', 'success');
                            fetchCompanies();
                          }
                        } catch (e: any) {
                          showToast('Error saving: ' + e.message, 'error');
                        } finally {
                          setSettingsSaving(false);
                        }
                      }}
                      disabled={settingsSaving}
                      className="px-4 py-2 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      {settingsSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: ADD JOB OPPORTUNITY                             */}
      {/* ======================================================== */}
      {addJobModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E1E4E8] rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E1E4E8] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#20242B]">Add New Job Opportunity</h3>
                <p className="text-xs text-[#69717D]">
                  Enter details to track a new opening in your job database
                </p>
              </div>
              <button
                onClick={() => setAddJobModalOpen(false)}
                className="text-[#69717D] hover:text-[#20242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                const newJob = {
                  title: String(formData.get('title')),
                  companyName: String(formData.get('companyName')),
                  companyWebsite: String(formData.get('companyWebsite')),
                  industry: String(formData.get('industry')) as IndustryType,
                  workArrangement: String(formData.get('workArrangement')) as WorkArrangement,
                  employmentType: String(formData.get('employmentType')) as EmploymentType,
                  experienceLevel: String(formData.get('experienceLevel')) as ExperienceLevel,
                  location: String(formData.get('location')),
                  salaryRaw: String(formData.get('salaryRaw')),
                  jobUrl: String(formData.get('jobUrl')),
                  requiredSkills: String(formData.get('skills'))
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                  description: String(formData.get('description')),
                  notes: String(formData.get('notes')),
                };

                try {
                  const res = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newJob),
                  });

                  if (res.ok) {
                    showToast('Job opportunity created successfully', 'success');
                    setAddJobModalOpen(false);
                    fetchJobs();
                    fetchDashboard();
                  } else {
                    const err = await res.json();
                    showToast(err.error || 'Failed to create job', 'error');
                  }
                } catch (err: any) {
                  showToast('Error: ' + err.message, 'error');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Job Title *</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Company Name *</label>
                  <input
                    name="companyName"
                    required
                    placeholder="e.g. Loox or Klaviyo"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Industry</label>
                  <select
                    name="industry"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  >
                    <option value="Shopify Apps">Shopify Apps</option>
                    <option value="SaaS">SaaS</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Fintech">Fintech</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Work Arrangement</label>
                  <select
                    name="workArrangement"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Experience Level</label>
                  <select
                    name="experienceLevel"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  >
                    <option value="Senior">Senior</option>
                    <option value="Mid">Mid-Level</option>
                    <option value="Lead">Lead / Architect</option>
                    <option value="Entry">Entry Level</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Salary Range</label>
                  <input
                    name="salaryRaw"
                    placeholder="e.g. $125,000 - $155,000"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Location</label>
                  <input
                    name="location"
                    defaultValue="Remote"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Job Posting URL</label>
                  <input
                    name="jobUrl"
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Company Website</label>
                  <input
                    name="companyWebsite"
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#20242B]">Required Skills (comma separated)</label>
                <input
                  name="skills"
                  placeholder="React, TypeScript, Shopify Liquid, GraphQL"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#20242B]">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Summary of role responsibilities..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E1E4E8]">
                <button
                  type="button"
                  onClick={() => setAddJobModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#F0F2F5] border border-[#D6DAE0] text-xs font-semibold text-[#20242B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Save Job Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SPREADSHEET IMPORT WITH VALIDATION PREVIEW       */}
      {/* ======================================================== */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E1E4E8] rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E1E4E8] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#20242B]">Import Jobs from Spreadsheet / CSV</h3>
                <p className="text-xs text-[#69717D]">
                  Paste comma-separated rows. Validates required fields and checks duplicates before commit.
                </p>
              </div>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview(null);
                }}
                className="text-[#69717D] hover:text-[#20242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importPreview ? (
              <div className="space-y-3 text-xs">
                <p className="text-[#69717D]">
                  Format columns:{' '}
                  <span className="font-mono text-[#20242B] font-semibold">
                    Title, Company, Location, Arrangement, Salary, Job URL, Website, Skills
                  </span>
                </p>
                <textarea
                  rows={8}
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder={`Senior React Engineer, Loox, Remote, Remote, $130000 - $160000, https://loox.app/careers/react, https://loox.app, React;TypeScript
Product Designer, Shopify, Remote, Remote, $140000 - $175000, https://shopify.com/careers/designer, https://shopify.com, Figma;Shopify UX`}
                  className="w-full p-3 rounded-lg border border-[#D6DAE0] font-mono text-xs bg-white text-[#20242B] focus:outline-none focus:ring-2 focus:ring-[#7B8491]"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-[#69717D]">
                    Duplicates against existing job URLs and company titles will be flagged
                  </span>
                  <button
                    onClick={handlePreviewImport}
                    disabled={importLoading || !importRawText.trim()}
                    className="px-4 py-2 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {importLoading ? 'Validating...' : 'Preview Validation'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Validation Summary Bar */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-[#F5F6F8] border border-[#E1E4E8] rounded-lg text-center">
                  <div>
                    <span className="text-emerald-700 font-bold text-base font-mono">
                      {importPreview.validCount}
                    </span>
                    <p className="text-[10px] text-[#69717D] uppercase font-semibold">Ready to Import</p>
                  </div>
                  <div>
                    <span className="text-amber-700 font-bold text-base font-mono">
                      {importPreview.duplicateCount}
                    </span>
                    <p className="text-[10px] text-[#69717D] uppercase font-semibold">Duplicates Detected</p>
                  </div>
                  <div>
                    <span className="text-rose-700 font-bold text-base font-mono">
                      {importPreview.invalidCount}
                    </span>
                    <p className="text-[10px] text-[#69717D] uppercase font-semibold">Invalid Rows</p>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-[#E1E4E8] rounded-lg max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F5F6F8] border-b border-[#E1E4E8] text-[#69717D] font-semibold">
                        <th className="p-2">Status</th>
                        <th className="p-2">Job Title</th>
                        <th className="p-2">Company</th>
                        <th className="p-2">Validation Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E4E8]">
                      {importPreview.rows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F0F2F5]">
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                r.status === 'valid'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : r.status === 'duplicate'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2 font-semibold text-[#20242B]">{r.data.title || '(Empty)'}</td>
                          <td className="p-2 text-[#626B78]">{r.data.companyName || '(Empty)'}</td>
                          <td className="p-2 text-[11px] text-[#69717D]">
                            {r.errors.length > 0
                              ? r.errors.join('; ')
                              : r.warnings.length > 0
                              ? r.warnings.join('; ')
                              : 'All checks passed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E1E4E8]">
                  <button
                    onClick={() => setImportPreview(null)}
                    className="px-3 py-1.5 rounded-lg border border-[#D6DAE0] text-xs font-semibold text-[#20242B]"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleCommitImport}
                    disabled={importLoading || importPreview.validCount === 0}
                    className="px-4 py-2 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {importLoading
                      ? 'Committing...'
                      : `Commit ${importPreview.validCount} Valid Jobs`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD CUSTOM COMPANY                              */}
      {/* ======================================================== */}
      {addCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E1E4E8] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4E8] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#20242B]">Add Custom SaaS Company</h3>
                <p className="text-xs text-[#69717D]">
                  Track a company outside the Shopify App Store crawler
                </p>
              </div>
              <button
                onClick={() => setAddCompanyModalOpen(false)}
                className="text-[#69717D] hover:text-[#20242B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);

                try {
                  const res = await fetch('/api/companies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: String(formData.get('name')),
                      website: String(formData.get('website')),
                      industry: String(formData.get('industry')) as IndustryType,
                      address: String(formData.get('address')),
                      contactName: String(formData.get('contactName')),
                      contactRole: String(formData.get('contactRole')),
                      notes: String(formData.get('notes')),
                      isPotentialEmployer: formData.get('isPotentialEmployer') === 'on',
                    }),
                  });

                  if (res.ok) {
                    showToast('Company profile added', 'success');
                    setAddCompanyModalOpen(false);
                    fetchCompanies();
                    fetchDashboard();
                  } else {
                    const err = await res.json();
                    showToast(err.error || 'Failed to add company', 'error');
                  }
                } catch (err: any) {
                  showToast('Error: ' + err.message, 'error');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-[#20242B]">Company Name *</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Stripe, Postman, Vercel"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Website URL *</label>
                  <input
                    name="website"
                    required
                    placeholder="https://company.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Industry</label>
                  <select
                    name="industry"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  >
                    <option value="SaaS">SaaS</option>
                    <option value="Shopify Apps">Shopify Apps</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Fintech">Fintech</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Contact Person</label>
                  <input
                    name="contactName"
                    placeholder="e.g. Recruiter or Hiring Manager"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Contact Role</label>
                  <input
                    name="contactRole"
                    placeholder="e.g. Head of Talent"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#20242B]">Research Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Key products, funding, hiring signals..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPotentialEmployer"
                  defaultChecked
                  className="rounded border-[#D6DAE0] text-[#626B78]"
                />
                <span className="font-medium text-[#20242B]">Mark as Potential Target Employer</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1E4E8]">
                <button
                  type="button"
                  onClick={() => setAddCompanyModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D6DAE0] text-xs font-semibold text-[#20242B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold shadow-xs"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER / MODAL: JOB DETAILS DRAWER                       */}
      {/* ======================================================== */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white border-l border-[#E1E4E8] w-full max-w-xl h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-[#E1E4E8] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#69717D]">
                    {selectedJob.industry} • {selectedJob.workArrangement}
                  </span>
                  <h3 className="font-bold text-lg text-[#20242B] mt-1">{selectedJob.title}</h3>
                  <p className="text-sm font-semibold text-[#626B78]">{selectedJob.companyName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSaveJob(selectedJob.id)}
                    className="p-2 rounded-lg border border-[#D6DAE0] hover:bg-[#F0F2F5] transition text-[#69717D]"
                    title="Bookmark"
                  >
                    {selectedJob.isSaved ? (
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-2 rounded-lg border border-[#D6DAE0] hover:bg-[#F0F2F5] transition text-[#69717D]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Compensation & Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F5F6F8] rounded-xl border border-[#E1E4E8] text-xs">
                <div>
                  <span className="text-[10px] text-[#69717D] uppercase font-bold">Salary Range</span>
                  <p className="font-mono font-bold text-sm text-[#20242B] mt-0.5">
                    {selectedJob.salaryRaw ||
                      (selectedJob.salaryMin && selectedJob.salaryMax
                        ? `$${selectedJob.salaryMin.toLocaleString()} - $${selectedJob.salaryMax.toLocaleString()}`
                        : 'Not published')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#69717D] uppercase font-bold">Location & Model</span>
                  <p className="font-semibold text-xs text-[#20242B] mt-0.5">
                    {selectedJob.location} ({selectedJob.workArrangement})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#69717D] uppercase font-bold">Level / Type</span>
                  <p className="font-semibold text-xs text-[#20242B] mt-0.5">
                    {selectedJob.experienceLevel} • {selectedJob.employmentType}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#69717D] uppercase font-bold">Discovery Source</span>
                  <p className="font-semibold text-xs text-[#20242B] mt-0.5">{selectedJob.source}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-[#20242B]">Job Description</h4>
                <div className="p-3.5 rounded-xl border border-[#E1E4E8] bg-white text-[#20242B] leading-relaxed whitespace-pre-line text-xs">
                  {selectedJob.description}
                </div>
              </div>

              {/* Required Skills */}
              {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-[#20242B]">Required Technologies & Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.requiredSkills.map((sk, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-[#F0F2F5] text-[#20242B] text-xs font-mono border border-[#E1E4E8]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#E1E4E8] flex items-center justify-between gap-3 text-xs">
              <button
                onClick={() => handleDeleteJob(selectedJob.id)}
                className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedJob.jobUrl && (
                  <a
                    href={selectedJob.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-lg border border-[#D6DAE0] text-[#20242B] font-semibold hover:bg-[#F0F2F5] flex items-center gap-1.5"
                  >
                    <span>View Posting</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {selectedJob.applicationId ? (
                  <button
                    onClick={() => {
                      const app = applications.find((a) => a.id === selectedJob.applicationId);
                      if (app) setSelectedApplication(app);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Open Application Tracker
                  </button>
                ) : (
                  <button
                    onClick={() => handleCreateApplicationFromJob(selectedJob)}
                    className="px-4 py-2 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Track in Application Pipeline</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER / MODAL: APPLICATION DETAILS & STATUS HISTORY     */}
      {/* ======================================================== */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-white border-l border-[#E1E4E8] w-full max-w-xl h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-[#E1E4E8] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#69717D]">
                    Job Application Management
                  </span>
                  <h3 className="font-bold text-lg text-[#20242B] mt-1">
                    {selectedApplication.jobTitle}
                  </h3>
                  <p className="text-sm font-semibold text-[#626B78]">
                    {selectedApplication.companyName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="p-2 rounded-lg border border-[#D6DAE0] hover:bg-[#F0F2F5] transition text-[#69717D]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Selector Banner */}
              <div className="p-3.5 bg-[#F5F6F8] rounded-xl border border-[#E1E4E8] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#20242B]">Current Pipeline Stage:</span>
                  <select
                    value={selectedApplication.status}
                    onChange={(e) =>
                      handleUpdateApplicationStatus(
                        selectedApplication.id,
                        e.target.value as ApplicationStatus
                      )
                    }
                    className="border border-[#D6DAE0] rounded-lg px-2.5 py-1.5 bg-white text-xs font-bold text-[#20242B]"
                  >
                    {PIPELINE_STATUSES.map((ps) => (
                      <option key={ps.status} value={ps.status}>
                        {ps.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-[#69717D]">
                  <div>Date Applied: {selectedApplication.dateApplied || 'Not recorded'}</div>
                  <div>Interview: {selectedApplication.interviewDate || 'None scheduled'}</div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#20242B]">Interview Date</label>
                    <input
                      type="date"
                      defaultValue={selectedApplication.interviewDate || ''}
                      onChange={(e) =>
                        handleUpdateApplicationStatus(selectedApplication.id, selectedApplication.status, `Updated interview date to ${e.target.value}`)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#20242B]">Follow-Up Date</label>
                    <input
                      type="date"
                      defaultValue={selectedApplication.followUpDate || ''}
                      onChange={(e) => {
                        fetch(`/api/applications/${selectedApplication.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ followUpDate: e.target.value }),
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#20242B]">Contact Person</label>
                    <input
                      defaultValue={selectedApplication.contactPerson || ''}
                      onBlur={(e) => {
                        fetch(`/api/applications/${selectedApplication.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ contactPerson: e.target.value }),
                        });
                      }}
                      placeholder="e.g. Recruiter name"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#20242B]">Contact Email</label>
                    <input
                      defaultValue={selectedApplication.contactEmail || ''}
                      onBlur={(e) => {
                        fetch(`/api/applications/${selectedApplication.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ contactEmail: e.target.value }),
                        });
                      }}
                      placeholder="recruiter@company.com"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#20242B]">Application Notes</label>
                  <textarea
                    rows={3}
                    defaultValue={selectedApplication.notes || ''}
                    onBlur={(e) => {
                      fetch(`/api/applications/${selectedApplication.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: e.target.value }),
                      });
                      showToast('Notes updated', 'info');
                    }}
                    placeholder="Interview questions, salary expectations, follow-up feedback..."
                    className="w-full p-2.5 rounded-lg border border-[#D6DAE0] bg-white text-xs text-[#20242B]"
                  />
                </div>
              </div>

              {/* Status Change History Audit Trail */}
              <div className="space-y-2 pt-2 border-t border-[#E1E4E8]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#20242B]">
                  <History className="w-3.5 h-3.5 text-[#626B78]" />
                  <span>Pipeline Audit History</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(selectedApplication.statusHistory || []).map((hist) => (
                    <div
                      key={hist.id}
                      className="p-2 rounded-lg bg-[#F5F6F8] border border-[#E1E4E8] text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#69717D]">
                        <span className="font-semibold text-[#20242B]">
                          {hist.fromStatus ? `${hist.fromStatus} → ${hist.toStatus}` : `Created in ${hist.toStatus}`}
                        </span>
                        <span className="font-mono">
                          {new Date(hist.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {hist.note && <p className="text-[11px] text-[#69717D]">{hist.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-[#E1E4E8] flex items-center justify-between">
              <button
                onClick={async () => {
                  if (!confirm('Delete this application record?')) return;
                  await fetch(`/api/applications/${selectedApplication.id}`, { method: 'DELETE' });
                  showToast('Application deleted', 'info');
                  setSelectedApplication(null);
                  fetchApplications();
                  fetchDashboard();
                }}
                className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedApplication(null)}
                className="px-4 py-2 rounded-lg bg-[#626B78] hover:bg-[#525B67] text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
