export type VerificationStatus = 'Verified' | 'Partially Verified' | 'Could not be verified';

export interface ShopifyAppRecord {
  id: string; // unique slug or ID
  appName: string;
  rating: number | string;
  primaryCategory: string;
  secondaryCategory: string;
  devName: string;
  devPartnerHandle?: string;
  devAddress: string;
  devWebsite: string;
  launchDate: string;
  sasiUrl: string;
  shopifyUrl: string;
  status: VerificationStatus;
  notes: string;
  pageNum: number;
  posOnPage: number;
  overallOrder: number;
  lastVerifiedDate: string;
}

export interface GroupedDeveloperApp {
  id: string;
  appName: string;
  rating: number | string;
  primaryCategory: string;
  secondaryCategory: string;
  categories?: string[];
  shopifyUrl: string;
  sasiUrl: string;
  status: VerificationStatus;
  overallOrder: number;
  pageNum: number;
}

export interface GroupedDeveloper {
  id: string;
  key?: string;
  devName: string;
  partnerHandle?: string;
  devWebsite: string;
  devAddress: string;
  appCount: number;
  apps: GroupedDeveloperApp[];
  categories: string[];
  avgRating: number | string;
  hasMultipleApps: boolean;
  lastVerifiedDate: string;
}

export interface CrawlErrorRecord {
  id: string;
  appName?: string;
  sasiUrl: string;
  shopifyUrl?: string;
  pageNum: number;
  failedField: string;
  errorDescription: string;
  attempts: number;
  lastAttemptTimestamp: string;
  suggestedAction: string;
}

export interface CrawlConfig {
  directoryUrl: string;
  startPage: number;
  endPage?: number | null;
  maxApps?: number | null;
  batchSize: number;
  requestDelayMs: number;
  maxRetries: number;
  testMode: boolean;
  exportVerifiedOnly: boolean;
}

export type CrawlStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';

export interface CrawlStats {
  totalPagesDiscovered: number;
  pagesCompleted: number;
  pagesRemaining: number;
  appsDiscovered: number;
  appsProcessed: number;
  appsVerified: number;
  appsPartiallyVerified: number;
  appsFailed: number;
  duplicateCount: number;
  currentPage: number;
  currentApp?: string;
  currentAppSlug?: string;
  startTime?: string | null;
  endTime?: string | null;
  elapsedSeconds: number;
  status: CrawlStatus;
  statusMessage: string;
  lastCheckpointTimestamp?: string;
  estimatedSecondsRemaining?: number | null;
  recentAverageAppSeconds?: number | null;
  recentAppsSampleCount?: number;
  appsRemaining?: number | null;
  appsPerMinute?: number | null;
}

export interface CrawlState {
  config: CrawlConfig;
  stats: CrawlStats;
  lastCompletedPage: number;
  processedSlugs: string[];
}

export interface CrawlerEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'rate-limit';
  message: string;
  details?: string;
}

export interface CategoryFrequency {
  category: string;
  count: number;
  percentage: number;
}

export interface DashboardKPIs {
  totalApps: number;
  uniqueDevelopersCount: number;
  verifiedApps: number;
  partiallyVerifiedApps: number;
  unverifiedApps: number;
  missingDevWebsitesCount: number;
  totalPrimaryCategoriesCount: number;
  averageMarketplaceRating: number | null;
  totalRatedApps: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
  percentage: number;
  avgRating: number | null;
  minRating: number | null;
  maxRating: number | null;
  ratedCount: number;
}

export interface RatingBandItem {
  band: '4.5–5.0' | '4.0–4.4' | '3.0–3.9' | '0.0–2.9' | 'Missing rating';
  count: number;
  percentage: number;
  color: string;
}

export interface DeveloperLeaderboardItem {
  id: string;
  devName: string;
  partnerHandle?: string;
  appCount: number;
  avgRating: number | string;
  missingWebsitesCount: number;
  devWebsite: string;
  devAddress: string;
}

export interface LaunchYearTrendItem {
  year: number;
  count: number;
  percentage: number;
}

export interface CategoryComparisonItem {
  category: string;
  totalApps: number;
  ratedApps: number;
  avgRating: number | string;
  highestRating: number | string;
  lowestRating: number | string;
}

export interface DataQualitySummary {
  totalRecords: number;
  fullyVerifiedCount: number;
  fullyVerifiedPercent: number;
  partiallyVerifiedCount: number;
  partiallyVerifiedPercent: number;
  unverifiedCount: number;
  unverifiedPercent: number;
  missingPrimaryCategoryCount: number;
  missingPrimaryCategoryPercent: number;
  missingDevNameCount: number;
  missingDevNamePercent: number;
  missingDevWebsiteCount: number;
  missingDevWebsitePercent: number;
  missingLaunchDateCount: number;
  missingLaunchDatePercent: number;
  duplicateCount: number;
  failedRecordsCount: number;
}

export interface DashboardAnalyticsResponse {
  kpis: DashboardKPIs;
  topCategories: CategoryDistributionItem[];
  allCategories: CategoryDistributionItem[];
  ratingDistribution: RatingBandItem[];
  topDevelopers: DeveloperLeaderboardItem[];
  launchYearTrends: {
    trends: LaunchYearTrendItem[];
    excludedCount: number;
    hasSufficientData: boolean;
  };
  categoryComparison: CategoryComparisonItem[];
  dataQuality: DataQualitySummary;
  availableCategories: string[];
  availableDevelopers: string[];
  lastUpdatedTimestamp?: string;
}

// ==========================================
// Job Search & Employer Tracking Module Types
// ==========================================

export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
export type ExperienceLevel = 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive';
export type JobStatus = 'Active' | 'Closed' | 'Expired' | 'Unverified';
export type IndustryType = 'Shopify Apps' | 'SaaS' | 'E-commerce' | 'Digital Marketing' | 'Fintech' | 'Other';
export type JobSource = 'LinkedIn' | 'Indeed' | 'Company Site' | 'Referral' | 'Job Board' | 'Manual' | 'Import' | 'Other';
export type ApplicationStatus =
  | 'Interested'
  | 'To Research'
  | 'Ready to Apply'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type CompanyPriority = 'High' | 'Medium' | 'Low' | 'Unranked';
export type ResearchStatus = 'Not Started' | 'In Progress' | 'Contact Identified' | 'Outreach Sent' | 'Archived';

export interface JobOpportunity {
  id: string;
  title: string;
  companyId?: string; // Links to CompanyResearch / Developer id
  companyName: string;
  companyWebsite: string;
  description: string;
  requiredSkills: string[];
  location: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  industry: IndustryType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  salaryPeriod?: 'Yearly' | 'Monthly' | 'Hourly';
  salaryRaw?: string;
  jobUrl: string;
  source: JobSource;
  datePosted: string;
  deadline?: string | null;
  dateDiscovered: string;
  lastVerifiedDate: string;
  status: JobStatus;
  isSaved?: boolean;
  savedDate?: string | null;
  applicationId?: string | null;
  notes?: string;
  tags?: string[];
}

export interface CompanyResearch {
  id: string; // partner handle or 'comp-<uuid>' or slug
  name: string;
  website: string;
  isShopifyDeveloper: boolean;
  partnerHandle?: string;
  address: string;
  industry: IndustryType;
  appCount: number;
  apps: GroupedDeveloperApp[];
  categories: string[];
  avgRating: number | string;
  isPotentialEmployer: boolean;
  priority: CompanyPriority;
  priorityScore: number; // 0–100 calculated score
  priorityReasons: string[];
  researchStatus: ResearchStatus;
  contactName?: string;
  contactEmail?: string;
  contactLinkedIn?: string;
  contactRole?: string;
  notes: string;
  followUpDate?: string | null;
  activeJobsCount: number;
  lastUpdated: string;
  isCustom: boolean; // true if manually added outside Shopify crawler
}

export interface StatusHistoryItem {
  id: string;
  timestamp: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyId?: string;
  companyName: string;
  companyWebsite: string;
  jobUrl: string;
  status: ApplicationStatus;
  dateApplied?: string | null;
  interviewDate?: string | null;
  followUpDate?: string | null;
  contactPerson?: string;
  contactEmail?: string;
  salaryOffered?: string | null;
  notes: string;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PriorityWeights {
  roleRelevance: number; // 0-100
  industryFit: number;
  openingsAvailability: number;
  verifiedWebsite: number;
  productQuality: number;
  personalInterest: number;
}

export interface SavedSearchFilter {
  id: string;
  name: string;
  targetRole?: string;
  industry?: string;
  arrangement?: string;
  experience?: string;
  location?: string;
  skills?: string[];
  createdAt: string;
}

export interface JobSearchSettings {
  targetRoleKeywords: string[];
  preferredLocations: string[];
  preferredArrangements: WorkArrangement[];
  preferredIndustries: IndustryType[];
  priorityWeights: PriorityWeights;
  savedFilters: SavedSearchFilter[];
  minimumSalaryTarget?: number | null;
}

export interface UpcomingFollowUpItem {
  id: string;
  type: 'company' | 'application';
  targetId: string;
  title?: string;
  targetName?: string;
  companyName: string;
  date: string;
  status: string;
  notes?: string;
  isOverdue?: boolean;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  type: string;
  title?: string;
  message?: string;
  description?: string;
  details?: string;
  metadata?: any;
}

export interface JobDashboardMetrics {
  kpis: {
    totalCompaniesTracked: number;
    potentialEmployersCount?: number;
    totalJobsDiscovered: number;
    jobsSaved: number;
    applicationsSubmitted: number;
    interviewsScheduled: number;
    offersReceived: number;
    followUpsDue: number;
  };
  totalCompaniesTracked?: number;
  potentialEmployersCount?: number;
  totalJobsDiscovered?: number;
  jobsSaved?: number;
  applicationsSubmitted?: number;
  interviewsScheduled?: number;
  offersReceived?: number;
  followUpsDue?: number;
  applicationsByStatus: { status: ApplicationStatus; count: number; color?: string }[];
  jobsByIndustry: { industry: string; count: number }[];
  jobsByWorkArrangement: { arrangement: string; count: number }[];
  jobsByArrangement?: { arrangement: string; count: number }[];
  applicationsOverTime: { period: string; date?: string; count: number }[];
  opportunitiesBySource: { source: string; count: number }[];
  upcomingFollowUps: UpcomingFollowUpItem[];
  recentActivity: ActivityFeedItem[];
}

export interface JobImportRow {
  title: string;
  companyName: string;
  companyWebsite?: string;
  description?: string;
  requiredSkills?: string | string[];
  location?: string;
  workArrangement?: string;
  employmentType?: string;
  experienceLevel?: string;
  industry?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryRange?: string;
  salaryRaw?: string;
  jobUrl?: string;
  source?: string;
  datePosted?: string;
  deadline?: string | null;
  status?: string;
  notes?: string;
}

export interface JobImportPreviewRow {
  index: number;
  data: JobImportRow;
  status: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
  warnings: string[];
}

export interface JobImportPreviewResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: JobImportPreviewRow[];
  validRows?: JobOpportunity[];
  duplicateRows?: {
    row: JobOpportunity;
    reason: string;
    existingJobId: string;
  }[];
  invalidRows?: {
    rowIndex: number;
    errors: string[];
    raw: Record<string, any>;
  }[];
}


