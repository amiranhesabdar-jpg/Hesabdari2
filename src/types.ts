export type BusinessType = 'manufacturing' | 'commercial' | 'both';

export type ProductType = 'raw_material' | 'finished_good' | 'commercial_good' | 'service';

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStockAlert: number;
  warehouse: 'materials' | 'finished' | 'commercial';
  category: string;
  barcode?: string;
  description?: string;
}

export interface BOMItem {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface BOM {
  id: string;
  code: string;
  name: string;
  finishedGoodId: string;
  finishedGoodName: string;
  outputQuantity: number;
  items: BOMItem[];
  directLaborCost: number; // هزینه دستمزد مستقیم
  overheadCost: number; // هزینه سربار تولید
  totalDirectMaterialCost: number;
  totalCost: number;
  unitCost: number; // بهای تمام شده هر واحد
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  bomId: string;
  finishedGoodId: string;
  finishedGoodName: string;
  plannedQuantity: number;
  actualQuantity: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  totalCost: number;
  unitCost: number;
  journalEntryId?: string;
}

export type InvoiceType = 'sales' | 'purchase' | 'sales_return' | 'purchase_return' | 'proforma';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number; // درصد مالیات (مثلا 10%)
  taxAmount: number;
  total: number;
}

export type CurrencyCode = 'TOMAN' | 'USD' | 'EUR' | 'IRR';

export interface ExchangeRates {
  TOMAN: number;
  USD: number;
  EUR: number;
  IRR: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  contactId: string;
  contactName: string;
  date: string; // تاریخ شمسی
  dueDate?: string;
  items: InvoiceItem[];
  currency?: CurrencyCode; // ارز فاکتور: دلار، یورو، ریال، تومان
  exchangeRate?: number; // نرخ تبدیل به تومان
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCost: number;
  grandTotal: number;
  baseCurrencyGrandTotal?: number; // مبلغ کل تبدیل شده به تومان
  paidAmount: number;
  baseCurrencyPaidAmount?: number;
  remainingAmount: number;
  baseCurrencyRemainingAmount?: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'credit';
  notes?: string;
  journalEntryId?: string;
}

export interface Contact {
  id: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  phone: string;
  mobile: string;
  nationalId?: string;
  economicCode?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number; // مثبت = بدهکار، منفی = بستانکار
}

export interface Cheque {
  id: string;
  chequeNumber: string;
  sayadNumber: string;
  type: 'received' | 'issued'; // دریافتی یا پرداختی
  contactId: string;
  contactName: string;
  bankName: string;
  branch: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'pending' | 'cleared' | 'bounced' | 'returned';
  notes?: string;
}

export type AccountCategory = 
  | 'current_assets' // دارایی‌های جاری
  | 'non_current_assets' // دارایی‌های غیرجاری
  | 'current_liabilities' // بدهی‌های جاری
  | 'long_term_liabilities' // بدهی‌های بلندمدت
  | 'equity' // حقوق صاحبان سهام / سرمایه
  | 'revenues' // درآمدها و فروش
  | 'cogs' // بهای تمام شده کالای فروش رفته
  | 'expenses'; // هزینه‌های اداری، عمومی و توزیع

export interface Account {
  id: string;
  code: string;
  name: string;
  level: 'group' | 'general' | 'subsidiary'; // گروه، کل، معین
  parentId?: string;
  category: AccountCategory;
  nature: 'debit' | 'credit'; // ماهیت: بدهکار یا بستانکار
  balance: number;
}

export interface JournalRow {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number; // بدهکار
  credit: number; // بستانکار
}

export interface JournalEntry {
  id: string;
  entryNumber: number;
  date: string; // تاریخ شمسی
  referenceNumber?: string;
  description: string;
  rows: JournalRow[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'approved';
  source?: 'manual' | 'invoice' | 'production' | 'cheque';
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  permissions: ('read' | 'write' | 'admin')[];
  status: 'active' | 'revoked';
}

export interface Webhook {
  id: string;
  url: string;
  event: 'product.updated' | 'invoice.created' | 'stock.low' | 'production.completed';
  active: boolean;
  secret: string;
  lastTriggered?: string;
}

export interface PluginItem {
  id: string;
  name: string;
  slug?: string;
  version: string;
  description: string;
  category: string;
  author: string;
  enabled: boolean;
  installed: boolean;
  settings?: Record<string, any>;
  config?: Record<string, any>;
  icon: string;
}

export type Plugin = PluginItem;

export interface AccountMappingRule {
  sourceCode: string;
  sourceName: string;
  targetAccountId: string;
  targetAccountCode: string;
  targetAccountName: string;
  isAutoMatched: boolean;
  createIfNotExists?: boolean;
}

export interface ParsedSanadRow {
  id: string;
  sourceAccountCode: string;
  sourceAccountName: string;
  targetAccountId: string;
  targetAccountCode: string;
  targetAccountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface ParsedSanad {
  entryNumber: number;
  date: string;
  referenceNumber?: string;
  description: string;
  rows: ParsedSanadRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  discrepancy: number;
}

export interface ParsedContact {
  code?: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  phone?: string;
  balance: number;
  nationalId?: string;
}

export interface ParsedProduct {
  code: string;
  name: string;
  stock: number;
  unit: string;
  buyPrice?: number;
  sellPrice?: number;
  warehouse?: string;
}

export interface BackupAnalysisResult {
  sourceSystem: string;
  sourceSystemName: string;
  fileFormat: string;
  fileName: string;
  totalSanads: number;
  totalRows: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  discrepancy: number;
  mappingRules: AccountMappingRule[];
  sanads: ParsedSanad[];
  contacts: ParsedContact[];
  products: ParsedProduct[];
  warnings: string[];
  recommendations: string[];
  aiAssisted?: boolean;
  aiNotes?: string;
}

export interface BackupCommitOptions {
  autoCreateAccounts: boolean;
  importContacts: boolean;
  importProducts: boolean;
  autoBalanceDiscrepancy: boolean;
  overrideExistingNumbers: boolean;
}

export interface BackupCommitResult {
  success: boolean;
  message: string;
  importedSanadsCount: number;
  importedContactsCount: number;
  importedProductsCount: number;
  createdAccountsCount: number;
  hasRollback: boolean;
}

export type UserRole =
  | 'super_admin' // مدیر کل سیستم
  | 'chief_accountant' // مدیر مالی و حسابدار ارشد
  | 'sales_cashier' // کارشناس فروش و فاکتور
  | 'warehouse_manager' // مسئول انبار
  | 'production_supervisor' // سرپرست تولید
  | 'auditor'; // ناظر و بازرس

export interface UserPermissions {
  canViewFinancials: boolean; // دسترسی به سود و زیان و ترازنامه
  canIssueInvoices: boolean; // صدور و ویرایش فاکتور
  canDeleteEntries: boolean; // حذف اسناد و فاکتورها
  canManageProduction: boolean; // مدیریت BOM و دستورات تولید
  canManageInventory: boolean; // تعدیل موجودی و کاردکس
  canAccessApi: boolean; // کار با کلیدهای API و پایتون
  canManageBackup: boolean; // دریافت و بازگردانی پشتیبان
  canManagePlugins: boolean; // فعال‌سازی افزونه‌ها
  canManageUsers: boolean; // مدیریت کاربران و دسترسی‌ها
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number; // تومان
  quarterlyPrice: number; // با تخفیف
  annualPrice: number; // با تخفیف ویژه
  features: string[];
  maxUsers: number; // -1 = unlimited
  maxInvoicesPerMonth: number; // -1 = unlimited
  maxWarehouses: number;
  allowAI: boolean;
  allowCustomPlugins: boolean;
  allowPythonApi: boolean;
  isPopular?: boolean;
  badge?: string;
  isActive: boolean;
}

export interface BusinessSubscription {
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'expired' | 'pending_payment';
  startDate: string; // تاریخ شمسی
  endDate: string; // تاریخ شمسی
  daysRemaining: number;
  autoRenew: boolean;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  invoicesUsedThisMonth: number;
  maxInvoicesLimit: number;
}

export type PaymentMethod = 'online_gateway' | 'card_to_card' | 'admin_grant';
export type PaymentStatus = 'successful' | 'pending_verification' | 'rejected' | 'failed';

export interface PaymentTransaction {
  id: string;
  planId: string;
  planName: string;
  durationMonths: number;
  amount: number;
  currency: 'تومان' | 'ریال';
  paymentMethod: PaymentMethod;
  gatewayName?: string;
  transactionCode?: string;
  cardLast4?: string;
  receiptNumber?: string;
  senderName?: string;
  senderCard?: string;
  createdAt: string; // تاریخ شمسی
  paidAt?: string;
  status: PaymentStatus;
  reviewedBy?: string;
  notes?: string;
}

export interface AdminSettings {
  masterPassword: string; // رمز ورود مدیریت سیستم
  companyCardNumber: string;
  companyCardHolder: string;
  companyIban: string;
  companyBankName: string;
  gatewayMerchantId: string;
  isSandboxGateway: boolean;
  defaultTrialDays: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target?: string;
  timestamp: string;
  details?: string;
  type: 'auth' | 'subscription' | 'permission' | 'financial' | 'system';
}

export interface AppState {
  products: Product[];
  boms: BOM[];
  productionOrders: ProductionOrder[];
  invoices: Invoice[];
  contacts: Contact[];
  cheques: Cheque[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  plugins: PluginItem[];
  subscription: BusinessSubscription;
  subscriptionPlans: SubscriptionPlan[];
  paymentTransactions: PaymentTransaction[];
  users: SystemUser[];
  adminSettings: AdminSettings;
  auditLogs: AuditLog[];
  settings: {
    businessName: string;
    taxNumber: string;
    phone: string;
    address: string;
    currency: 'تومان' | 'ریال';
    vatRate: number;
    autoJournal: boolean;
    exchangeRates?: ExchangeRates;
  };
}
