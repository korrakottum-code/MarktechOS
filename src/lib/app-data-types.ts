export type NotificationType =
  | "lead"
  | "performance"
  | "content"
  | "ads"
  | "hr"
  | "finance"
  | "ticket"
  | "system";

export type NotificationRole =
  | "admin"
  | "content"
  | "ads"
  | "am"
  | "ceo"
  | "finance"
  | "all";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  role: NotificationRole;
}

// --- Admin & Leads ---
export interface Admin {
  id: string;
  name: string;
  avatar: string;
  role: "admin" | "sale" | "operator" | "content" | "ads opt" | "accountant";
  leadsReceived: number;
  leadsClosed: number;
  closeRate: number;
  avgResponseTime: number;
  revenue: number;
  tier: "none" | "bronze" | "silver" | "gold";
  status: "online" | "busy" | "offline";
  managedClinics: string[];
  salary?: number;
  bankName?: string;
  bankAccount?: string;
  startDate?: string;
  roas?: number;
  completedTasks?: number;
  pipelineValue?: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  channel: "facebook" | "instagram" | "line" | "website";
  clinic: string;
  procedure: string;
  status: "new" | "contacted" | "negotiating" | "closed" | "lost";
  assignedTo: string;
  createdAt: string;
  value: number;
  notes: string;
}

export interface ClinicClient {
  id: string;
  name: string;
  revenue: number;
  adSpend: number;
  profit: number;
  leads: number;
  closeRate: number;
  facebookPageId?: string;
  facebookAdAccountId?: string;
  adBillingType?: "direct" | "agency";
  manualAdminCost?: number;
  manualProductionCost?: number;
  salesCommission?: number;
}

// --- Services & Sales ---
export interface ServiceProduct {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  features: { title: string; detail: string }[];
  priceLabel: string;
  category: "marketing" | "content" | "admin";
  activeClients: number;
}

export type DealStage = "prospect" | "contacted" | "demo" | "proposal" | "negotiation" | "won" | "lost";

export interface SalesDeal {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  businessType: string;
  services: string[];
  dealValue: number;
  stage: DealStage;
  probability: number;
  salesperson: string;
  createdAt: string;
  expectedClose: string;
  notes: string;
}

// --- Operations ---
export type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type ContentType = "caption" | "graphic" | "video" | "ad-copy" | "photo";

export interface OperationTask {
  id: string;
  title: string;
  description: string;
  clinic: string;
  type: ContentType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  assigneeAvatar: string;
  dueDate: string;
  createdAt: string;
  tags: string[];
}

export interface AdsMetric {
  id: string;
  clinic: string;
  campaign: string;
  spend: number;
  leads: number;
  cpl: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  status: "active" | "paused" | "ended";
}

// --- Clients & HR ---
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ClientRequirement {
  id: string;
  category: string;
  question: string;
  answer: string;
  filledAt: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  contractStart: string;
  contractEnd: string;
  monthlyFee: number;
  adBudget: number;
  services: string[];
  status: "active" | "warning" | "churning" | "offboarding";
  onboardingComplete: boolean;
  standardRequirements: {
    targetGroup: string;
    kpiGoal: string;
    brandTone: string;
    mainProcedure: string;
  };
  customRequirements: ClientRequirement[];
  assignedAdminIds: string[];
  salesPersonId?: string;
  opLeadId?: string;
  npsScore?: number;
  retentionPlan?: "none" | "monitor" | "retention" | "critical";
  offboardingReason?: string;
  onboardingChecklists: ChecklistItem[];
  offboardingChecklists: ChecklistItem[];
  adBillingType: "direct" | "agency";
  adminAllocatedCost: number;
  productionAllocatedCost: number;
  salesCommissionPercent: number;
}

export interface HRAlert {
  id: string;
  employeeName: string;
  type: "pip" | "late" | "absent" | "low-performance" | "contract-end";
  severity: "critical" | "warning" | "info";
  message: string;
  date: string;
  actionTaken: boolean;
}

// --- Finance ---
export interface MonthlyPnL {
  id: string;
  clinic: string;
  month: string;
  revenue: number;
  adSpend: number;
  adminCost: number;
  productionCost: number;
  adsOptSharedCost: number;
  commission: number;
  otherDirectCosts: number;
  netProfit: number;
  margin: number;
  adBillingType: "direct" | "agency";
}

export interface FinanceSettings {
  adsOptTeamTotalSalary: number;
  totalOfficeOverhead: number;
  generalOpsFixedSalary: number;
}

export interface AttendanceAdjustment {
  id: string;
  adminId: string;
  name: string;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  lateDeduction: number;
  absentDeduction: number;
  allowance: number;
  netAdjustment: number;
}

export type WalletStatus = "healthy" | "watch" | "critical";

export interface AdBudgetWallet {
  id: string;
  clinic: string;
  serviceFeeCollected: number;
  adWalletBalance: number;
  usedAdSpend: number;
  remainingAdBudget: number;
  billingDueDate: string;
  status: WalletStatus;
}

export type CashflowType = "income" | "expense";
export type CashflowCategory =
  | "service-fee"
  | "ad-topup"
  | "ad-spend"
  | "payroll"
  | "commission"
  | "operations";

export interface CashflowEntry {
  id: string;
  date: string;
  type: CashflowType;
  category: CashflowCategory;
  label: string;
  amount: number;
  reference?: string;
}

export type InvoiceType = "service-fee" | "ad-budget" | "deposit";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type OverdueLevel = "day1" | "day7" | "day14" | "day30";

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  type: InvoiceType;
  status: InvoiceStatus;
  paidDate?: string;
  overdueEscalation?: OverdueLevel;
  notes?: string;
}

// --- Ticketing ---
export type TicketCategory = "hr" | "it" | "ops" | "finance" | "general" | "crisis";
export type TicketPriority = "urgent" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  slaHours: number;
  slaBreached: boolean;
}

// --- Events ---
export type EventSource = "operation" | "crm" | "client" | "finance" | "hr" | "ticket";
export type EventPriority = "urgent" | "high" | "medium" | "low";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  source: EventSource;
  priority: EventPriority;
  clinic?: string;
  assignee?: string;
}

// --- Platform & AI ---
export type BackupStatus = "success" | "failed" | "warning";

export interface BackupJobLog {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: BackupStatus;
  sizeGb: number;
  recordsCount: number;
  primaryLocation: string;
  secondaryLocation: string;
  errorMessage?: string;
}

export interface BackupPolicy {
  schedule: string;
  retentionDaily: string;
  retentionMonthly: string;
  retentionYearly: string;
  primaryStorage: string;
  secondaryStorage: string;
  nextRunAt: string;
}

export interface MonthlyExecutiveReport {
  id: string;
  monthLabel: string;
  generatedAt: string;
  totalRevenue: number;
  netProfit: number;
  avgCloseRate: number;
  avgRoas: number;
  slaRate: number;
  recipients: string[];
  status: "sent" | "queued";
  actionItems: string[];
}

export type RecipientRole = "ceo" | "am" | "head_finance" | "head_ops";

export interface RecipientConfig {
  id: string;
  role: RecipientRole;
  label: string;
  scope: string;
  enabled: boolean;
  emails: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: "procedure" | "script" | "promotion" | "policy";
}

export interface AIKnowledgeEntry {
  id: string;
  prompt: string;
  answer: string;
  category: QuickAction["category"];
  updatedAt: string;
}

export interface HRPolicy {
  lateThreshold: number;
  absentThreshold: number;
  closeRatePipThreshold: number;
  responseTimeSla: number;
  autoEscalateToCeo: boolean;
}

// --- Main App Data ---
export interface AppData {
  admins: Admin[];
  leads: Lead[];
  clinicClients: ClinicClient[];
  serviceProducts: ServiceProduct[];
  salesDeals: SalesDeal[];
  operationTasks: OperationTask[];
  adsMetrics: AdsMetric[];
  clients: ClientProfile[];
  hrAlerts: HRAlert[];
  pnlRows: MonthlyPnL[];
  attendanceAdjustments: AttendanceAdjustment[];
  adBudgetWallets: AdBudgetWallet[];
  cashflowEntries: CashflowEntry[];
  tickets: Ticket[];
  events: CalendarEvent[];
  notifications: AppNotification[];
  backupPolicy: BackupPolicy;
  backupLogs: BackupJobLog[];
  monthlyReports: MonthlyExecutiveReport[];
  recipientConfigs: RecipientConfig[];
  aiQuickActions: QuickAction[];
  aiResponseLibrary: AIKnowledgeEntry[];
  invoices: Invoice[];
  financeSettings: FinanceSettings;
  hrPolicy?: HRPolicy;
  aiKnowledgeBase: {
    global: {
      label: string;
      items: { icon: string; label: string; count: number }[];
    };
    clinics: { name: string; docs: number; lastUpdated: string }[];
  };
}
