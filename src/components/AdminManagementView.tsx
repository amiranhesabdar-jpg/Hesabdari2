import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  CreditCard,
  Crown,
  KeyRound,
  FileCheck2,
  Activity,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Settings,
  AlertTriangle,
  Lock,
  RefreshCw,
  LogOut,
  Save,
  Check,
  Eye,
  EyeOff,
  UserCheck,
  Building,
} from 'lucide-react';
import { AppState, SystemUser, SubscriptionPlan, UserRole, UserPermissions } from '../types';
import { apiService } from '../services/api';

interface AdminManagementViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onLogoutAdmin: () => void;
  currentUser?: any;
}

type AdminTab =
  | 'overview'
  | 'users'
  | 'plans'
  | 'grants'
  | 'payments'
  | 'logs'
  | 'settings';

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  state,
  onUpdateState,
  onLogoutAdmin,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState<{
    username: string;
    fullName: string;
    phone: string;
    email: string;
    role: UserRole;
    status: 'active' | 'suspended';
    permissions: UserPermissions;
  }>({
    username: '',
    fullName: '',
    phone: '',
    email: '',
    role: 'sales_cashier',
    status: 'active',
    permissions: {
      canViewFinancials: false,
      canIssueInvoices: true,
      canDeleteEntries: false,
      canManageProduction: false,
      canManageInventory: false,
      canAccessApi: false,
      canManageBackup: false,
      canManagePlugins: false,
      canManageUsers: false,
    },
  });

  // Grant Subscription state
  const [grantPlanId, setGrantPlanId] = useState<string>(state.subscription?.planId || 'plan_pro');
  const [grantDays, setGrantDays] = useState<number>(30);
  const [grantReason, setGrantReason] = useState<string>('تمدید ویژه مدیریت');

  // Plan Edit/Create modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({
    name: '',
    tagline: '',
    monthlyPrice: 500000,
    quarterlyPrice: 1350000,
    annualPrice: 4200000,
    features: ['صدور فاکتور نامحدود', 'پشتیبان‌گیری ابری روزانه'],
    maxUsers: 5,
    maxInvoicesPerMonth: 1000,
    maxWarehouses: 2,
    allowAI: true,
    allowCustomPlugins: true,
    allowPythonApi: false,
    isActive: true,
  });

  // Settings State
  const [newMasterPassword, setNewMasterPassword] = useState(state.adminSettings?.masterPassword || 'admin@amiran2026');
  const [companyCardNumber, setCompanyCardNumber] = useState(state.adminSettings?.companyCardNumber || '');
  const [companyIban, setCompanyIban] = useState(state.adminSettings?.companyIban || '');
  const [companyCardHolder, setCompanyCardHolder] = useState(state.adminSettings?.companyCardHolder || '');
  const [companyBankName, setCompanyBankName] = useState(state.adminSettings?.companyBankName || '');
  const [showPassword, setShowPassword] = useState(false);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Stats calculation
  const successfulTxns = (state.paymentTransactions || []).filter((t) => t.status === 'successful');
  const totalRevenue = successfulTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingReceipts = (state.paymentTransactions || []).filter((t) => t.status === 'pending_verification');
  const activeUsersCount = (state.users || []).filter((u) => u.status === 'active').length;

  // --- Handlers ---
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      fullName: '',
      phone: '',
      email: '',
      role: 'sales_cashier',
      status: 'active',
      permissions: {
        canViewFinancials: false,
        canIssueInvoices: true,
        canDeleteEntries: false,
        canManageProduction: false,
        canManageInventory: false,
        canAccessApi: false,
        canManageBackup: false,
        canManagePlugins: false,
        canManageUsers: false,
      },
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      fullName: user.fullName,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      status: user.status,
      permissions: { ...user.permissions },
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.fullName) {
      showNotification('نام کاربری و نام کاربر الزامی است', true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...userForm,
        id: editingUser ? editingUser.id : undefined,
      };
      await apiService.saveUser(payload);
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      setIsUserModalOpen(false);
      showNotification(editingUser ? 'اطلاعات کاربر با موفقیت بروزرسانی شد' : 'کاربر جدید به سیستم اضافه شد');
    } catch (err: any) {
      showNotification(err.message || 'خطا در ثبت کاربر', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: SystemUser) => {
    if (user.role === 'super_admin') {
      showNotification('امکان حذف مدیر ارشد سیستم وجود ندارد', true);
      return;
    }
    if (!confirm(`آیا از حذف دسترسی کاربر ${user.fullName} مطمئن هستید؟`)) return;

    setLoading(true);
    try {
      await apiService.deleteUser(user.id);
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification('کاربر با موفقیت حذف گردید');
    } catch (err: any) {
      showNotification(err.message || 'خطا در حذف کاربر', true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    if (user.role === 'super_admin') return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await apiService.saveUser({ ...user, status: newStatus });
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification(`وضعیت کاربر به ${newStatus === 'active' ? 'فعال' : 'معلق'} تغییر کرد`);
    } catch (err: any) {
      showNotification(err.message || 'خطا در تغییر وضعیت', true);
    }
  };

  const handleGrantSubscription = async () => {
    setLoading(true);
    try {
      await apiService.grantSubscription({
        planId: grantPlanId,
        additionalDays: grantDays,
        reason: grantReason,
        actor: currentUser?.fullName || 'مدیریت کل',
      });
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification(`اشتراک با موفقیت ${grantDays} روز افزایش یافت`);
    } catch (err: any) {
      showNotification(err.message || 'خطا در تخصیص اشتراک', true);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    setLoading(true);
    try {
      await apiService.approvePayment(paymentId);
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification('فیش بانکی تایید شد و اشتراک بلافاصله تمدید گردید');
    } catch (err: any) {
      showNotification(err.message || 'خطا در تأیید فیش', true);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt('لطفاً دلیل رد فیش واریزی را وارد کنید:', 'عدم تطابق شماره پیگیری با گردش حساب');
    if (!reason) return;

    setLoading(true);
    try {
      await apiService.rejectPayment(paymentId, reason);
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification('فیش بانکی رد شد');
    } catch (err: any) {
      showNotification(err.message || 'خطا در رد فیش', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await apiService.updateAdminSettings({
        masterPassword: newMasterPassword,
        companyCardNumber,
        companyIban,
        companyCardHolder,
        companyBankName,
      });
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification('تنظیمات مدیریت و رمز عبور با موفقیت بروزرسانی شد');
    } catch (err: any) {
      showNotification(err.message || 'خطا در بروزرسانی تنظیمات', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name || !planForm.monthlyPrice) {
      showNotification('نام پلن و قیمت الزامی است', true);
      return;
    }

    setLoading(true);
    try {
      await apiService.savePlan({
        ...planForm,
        id: editingPlan ? editingPlan.id : undefined,
      });
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      setIsPlanModalOpen(false);
      showNotification('بسته اشتراک با موفقیت ذخیره شد');
    } catch (err: any) {
      showNotification(err.message || 'خطا در ذخیره پلن', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (state.subscription?.planId === planId) {
      showNotification('امکان حذف پلن در حال استفاده وجود ندارد', true);
      return;
    }
    if (!confirm('آیا از حذف این بسته اشتراک اطمینان دارید؟')) return;

    setLoading(true);
    try {
      await apiService.deletePlan(planId);
      const synced = await apiService.syncWithCloud(state);
      onUpdateState(synced);
      showNotification('پلن با موفقیت حذف گردید');
    } catch (err: any) {
      showNotification(err.message || 'خطا در حذف پلن', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner with Super Admin Brand */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/70 border border-rose-900/50 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">پنل مدیریت کل سیستم و دسترسی‌ها</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Super Admin Master
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              مدیریت دسترسی کاربران (RBAC)، کنترل بسته‌های اشتراک، تأیید فیش‌های واریزی و تنظیمات امنیتی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center">
          <button
            onClick={onLogoutAdmin}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
            title="خروج از حالت مدیریت و قفل پنل"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>خروج از پنل مدیریت</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Admin Tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-md">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>داشبورد کلان</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>کاربران و دسترسی‌ها ({state.users?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'plans'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>پلن‌های اشتراک ({state.subscriptionPlans?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('grants')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'grants'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>تخصیص دستی اشتراک</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'payments'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>تأیید فیش‌ها و تراکنش‌ها</span>
          {pendingReceipts.length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
              {pendingReceipts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'logs'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>لاگ‌های امنیتی ({state.auditLogs?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>تنظیمات مدیریت و رمز</span>
        </button>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>کل درآمد اشتراک‌ها</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white">
                {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">تومان</span>
              </div>
              <span className="text-[10px] text-emerald-400 mt-1 block font-medium">
                {successfulTxns.length} پرداخت موفق ثبت شده
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>کاربران فعال سیستم</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-black text-white">
                {activeUsersCount} <span className="text-xs font-normal text-slate-400">از {state.users?.length || 0} کاربر</span>
              </div>
              <span className="text-[10px] text-sky-400 mt-1 block font-medium">
                دسترسی‌های کنترل شده RBAC
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>فیش‌های در انتظار تأیید</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">
                {pendingReceipts.length} <span className="text-xs font-normal text-slate-400">فیش واریزی</span>
              </div>
              <span className={`text-[10px] mt-1 block font-medium ${pendingReceipts.length > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                {pendingReceipts.length > 0 ? 'نیاز به بررسی و تایید مالی' : 'همه فیش‌ها بررسی شده'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>اشتراک جاری شرکت</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-base font-black text-white truncate">
                {state.subscription?.planName}
              </div>
              <span className="text-[10px] text-emerald-400 mt-1 block font-medium">
                {state.subscription?.daysRemaining} روز اعتبار باقیمانده
              </span>
            </div>
          </div>

          {/* Quick Action Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending Receipts Alert Box */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>فیش‌های نیازمند اقدام فوری</span>
                </h3>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  مشاهده همه
                </button>
              </div>

              {pendingReceipts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs rounded-xl bg-slate-950/60 border border-slate-800/80">
                  هیچ فیش بانکی منتظر تأیید وجود ندارد.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingReceipts.slice(0, 3).map((txn) => (
                    <div
                      key={txn.id}
                      className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{txn.senderName || 'خریدار'}</div>
                        <div className="text-[11px] text-slate-400">
                          فیش: <code className="text-slate-300">{txn.receiptNumber}</code> • {txn.amount.toLocaleString()} ت
                        </div>
                      </div>
                      <button
                        onClick={() => handleApprovePayment(txn.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                      >
                        تأیید فوری
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Grant Panel */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>تمدید یا هدیه اشتراک فوری به شرکت</span>
              </h3>
              <p className="text-xs text-slate-400">
                می‌توانید بدون نیاز به درگاه، روزهای اعتبار نرم‌افزار را به صورت دستی افزایش دهید.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => {
                    setGrantDays(30);
                    handleGrantSubscription();
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium transition"
                >
                  +۳۰ روز هدیه
                </button>
                <button
                  onClick={() => {
                    setGrantDays(90);
                    handleGrantSubscription();
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium transition"
                >
                  +۹۰ روز هدیه
                </button>
                <button
                  onClick={() => {
                    setGrantDays(365);
                    handleGrantSubscription();
                  }}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/30"
                >
                  +۱ سال تمدید
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users & Permissions Management (RBAC) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                <span>مدیریت کاربران و دسترسی‌های دقیق (RBAC)</span>
              </h2>
              <p className="text-xs text-slate-400">تعیین نقش‌های سازمانی و محدودسازی دسترسی به بخش‌های حساس</p>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن کاربر جدید</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4">کاربر</th>
                    <th className="py-3 px-4">نقش سازمانی</th>
                    <th className="py-3 px-4">اطلاعات تماس</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">دسترسی‌های کلیدی</th>
                    <th className="py-3 px-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(state.users || []).map((u) => {
                    const isSuper = u.role === 'super_admin';
                    const isActive = u.status === 'active';

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-xs">{u.fullName}</div>
                          <div className="text-[11px] font-mono text-slate-400">@{u.username}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSuper
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : u.role === 'chief_accountant'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : u.role === 'warehouse_manager'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role === 'super_admin'
                              ? 'مدیر کل سیستم'
                              : u.role === 'chief_accountant'
                              ? 'مدیر مالی و حسابدار'
                              : u.role === 'warehouse_manager'
                              ? 'مسئول انبار'
                              : u.role === 'production_supervisor'
                              ? 'سرپرست تولید'
                              : u.role === 'auditor'
                              ? 'حسابرس و ناظر'
                              : 'کارشناس فروش و فاکتور'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                          <div>{u.phone || '---'}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isSuper}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isActive ? 'فعال' : 'معلق'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs text-[10px]">
                            {u.permissions?.canViewFinancials && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">سود و زیان</span>
                            )}
                            {u.permissions?.canIssueInvoices && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">فاکتور</span>
                            )}
                            {u.permissions?.canManageProduction && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">تولید BOM</span>
                            )}
                            {u.permissions?.canManageInventory && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">انبار</span>
                            )}
                            {u.permissions?.canDeleteEntries && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/60">حذف سند</span>
                            )}
                            {u.permissions?.canManageUsers && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300">مدیریت کاربران</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title="ویرایش کاربر و مجوزها"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isSuper && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                                title="حذف کاربر"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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

      {/* TAB 3: Subscription Plans Management & Builder */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>تعریف و تنظیم بسته‌های اشتراک (Plan Builder)</span>
              </h2>
              <p className="text-xs text-slate-400">قیمت‌گذاری، تعیین سقف‌ها، و قابلیت‌های هر پلن جهت فروش</p>
            </div>
            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  name: '',
                  tagline: '',
                  monthlyPrice: 500000,
                  quarterlyPrice: 1350000,
                  annualPrice: 4200000,
                  features: ['صدور فاکتور نامحدود', 'پشتیبان‌گیری ابری روزانه'],
                  maxUsers: 5,
                  maxInvoicesPerMonth: 1000,
                  maxWarehouses: 2,
                  allowAI: true,
                  allowCustomPlugins: true,
                  allowPythonApi: false,
                  isActive: true,
                });
                setIsPlanModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف پلن جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(state.subscriptionPlans || []).map((plan) => {
              const isCurrent = state.subscription?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-white">{plan.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          پلن فعال
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-4">{plan.tagline}</p>

                    <div className="space-y-1.5 mb-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ماهانه:</span>
                        <span className="font-bold text-white">{plan.monthlyPrice.toLocaleString()} ت</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">سه‌ماهه:</span>
                        <span className="font-bold text-white">{plan.quarterlyPrice.toLocaleString()} ت</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">سالانه:</span>
                        <span className="font-bold text-emerald-400">{plan.annualPrice.toLocaleString()} ت</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">سقف فاکتور:</span>
                        <span>{plan.maxInvoicesPerMonth === -1 ? 'نامحدود' : `${plan.maxInvoicesPerMonth}/ماه`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">سقف کاربر:</span>
                        <span>{plan.maxUsers === -1 ? 'نامحدود' : `${plan.maxUsers} کاربر`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">هوش مصنوعی:</span>
                        <span className={plan.allowAI ? 'text-emerald-400' : 'text-slate-500'}>
                          {plan.allowAI ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setPlanForm(plan);
                        setIsPlanModalOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>ویرایش پلن</span>
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition border border-rose-900/50"
                        title="حذف پلن"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Manual Subscription Grant */}
      {activeTab === 'grants' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              <span>تخصیص یا ارتقای مستقیم اشتراک</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              جهت فعال‌سازی رایگان، هدیه سال نو، تمدید مشتریان ویژه یا تغییر سطح دسترسی شرکت
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">انتخاب پلن اشتراک:</label>
              <select
                value={grantPlanId}
                onChange={(e) => setGrantPlanId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-rose-500"
              >
                {state.subscriptionPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.monthlyPrice.toLocaleString()} ت)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">تعداد روزهای تمدید / هدیه:</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[15, 30, 90, 365].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setGrantDays(days)}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      grantDays === days
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {days} روز
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                placeholder="یا تعداد روز دلخواه را وارد کنید"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">دلیل یا عنوان تخصیص:</label>
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                placeholder="مثال: قرارداد سالانه سازمانی با تخفیف ویژه"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>اعتبار باقیمانده فعلی:</span>
                <span className="font-bold text-white">{state.subscription?.daysRemaining} روز</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
                <span>اعتبار پس از اعمال:</span>
                <span>{(state.subscription?.daysRemaining || 0) + Number(grantDays)} روز</span>
              </div>
            </div>

            <button
              onClick={handleGrantSubscription}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>درحال اعمال تغییرات...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>تأیید و اعمال فوری در اشتراک کسب‌وکار</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Payments & Receipts Approvals */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-400" />
              <span>فیش‌های واریزی و تراکنش‌های بانکی اشتراک</span>
            </h2>
            <p className="text-xs text-slate-400">تأیید یا رد فیش‌های کارت به کارت و مشاهده گزارش‌های پرداخت شتاب</p>
          </div>

          <div className="space-y-3">
            {(!state.paymentTransactions || state.paymentTransactions.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-900 border border-slate-800">
                هنوز تراکنشی در سیستم ثبت نشده است.
              </div>
            ) : (
              state.paymentTransactions.map((txn) => {
                const isPending = txn.status === 'pending_verification';
                const isSuccess = txn.status === 'successful';
                const isRejected = txn.status === 'rejected';

                return (
                  <div
                    key={txn.id}
                    className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isPending
                        ? 'bg-amber-950/20 border-amber-600/60 shadow-lg shadow-amber-950/30'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-white">{txn.planName}</span>
                        <span className="text-xs text-slate-400">({txn.durationMonths} ماهه)</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isSuccess ? 'تأیید شده و فعال' : isPending ? 'در انتظار بررسی مدیریت' : 'رد شده'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>مبلغ: <strong className="text-white">{txn.amount.toLocaleString()} تومان</strong></span>
                        <span>تاریخ: {txn.createdAt}</span>
                        {txn.receiptNumber && (
                          <span>شماره فیش: <code className="text-amber-300 font-mono">{txn.receiptNumber}</code></span>
                        )}
                        {txn.senderName && <span>واریزکننده: <strong className="text-slate-300">{txn.senderName}</strong></span>}
                        {txn.senderCard && <span>کارت: <code className="font-mono text-slate-300">...{txn.senderCard}</code></span>}
                        {txn.transactionCode && <span>کد پیگیری شتاب: <code className="font-mono text-emerald-400">{txn.transactionCode}</code></span>}
                      </div>

                      {txn.notes && (
                        <p className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">{txn.notes}</p>
                      )}
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprovePayment(txn.id)}
                          disabled={loading}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>تأیید و فعال‌سازی فوری</span>
                        </button>
                        <button
                          onClick={() => handleRejectPayment(txn.id)}
                          disabled={loading}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 text-xs font-bold transition border border-rose-800/40 flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>رد فیش</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 shrink-0">
                        بررسی توسط: <span className="text-slate-400">{txn.reviewedBy || 'سیستم'}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-rose-400" />
                <span>گزارش کامل رخدادها و لاگ‌های امنیتی (Audit Trail)</span>
              </h2>
              <p className="text-xs text-slate-400">ثبت دقیق کلیه ورودها، تغییر دسترسی‌ها و تراکنش‌های مالی پلتفرم</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4">رخداد</th>
                    <th className="py-3 px-4">اقدام‌کننده</th>
                    <th className="py-3 px-4">هدف / موضوع</th>
                    <th className="py-3 px-4">زمان ثبت</th>
                    <th className="py-3 px-4">جزئیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-sans">
                  {(state.auditLogs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.type === 'auth'
                              ? 'bg-rose-400'
                              : log.type === 'subscription'
                              ? 'bg-amber-400'
                              : log.type === 'permission'
                              ? 'bg-sky-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span>{log.action}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{log.actor}</td>
                      <td className="py-3 px-4 text-slate-400">{log.target || '---'}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{log.timestamp}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{log.details || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Platform Settings & Master Password */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-rose-400" />
              <span>تنظیمات عمومی پنل مدیریت و امنیت پلتفرم</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">تغییر رمز ورود مدیریت و مشخصات کارت بانکی شرکت جهت دریافت فیش‌ها</p>
          </div>

          <div className="space-y-4">
            {/* Master Password Setting */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-white">رمز عبور اختصاصی ورود به پنل مدیریت</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                این رمز برای باز کردن منوی پنل مدیریت کل سیستم در نوبار استفاده می‌شود.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-rose-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bank Card / IBAN for Company */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">مشخصات حساب بانکی شرکت جهت دریافت واریز کارت به کارت</h4>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">شماره کارت ۱۶ رقمی:</label>
                <input
                  type="text"
                  value={companyCardNumber}
                  onChange={(e) => setCompanyCardNumber(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-rose-500"
                  placeholder="۶۰۳۷-۹۹۷۵-۱۱۲۲-۴۴۵۵"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">شماره شبا رسمی:</label>
                <input
                  type="text"
                  value={companyIban}
                  onChange={(e) => setCompanyIban(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-rose-500"
                  placeholder="IR980170000000100445566778"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">نام صاحب حساب:</label>
                  <input
                    type="text"
                    value={companyCardHolder}
                    onChange={(e) => setCompanyCardHolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                    placeholder="گروه بازرگانی امیران"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">نام بانک و شعبه:</label>
                  <input
                    type="text"
                    value={companyBankName}
                    onChange={(e) => setCompanyBankName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                    placeholder="بانک ملی ایران"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره کلیه تنظیمات مدیریت</span>
            </button>
          </div>
        </div>
      )}

      {/* USER EDIT / CREATE MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingUser ? `ویرایش دسترسی‌های ${editingUser.fullName}` : 'افزودن کاربر جدید به سیستم'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">نام و نام خانوادگی:</label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                    placeholder="مثال: سمیرا صادقی"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">نام کاربری (لاتین):</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    required
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-rose-500"
                    placeholder="sadeghi_acc"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">شماره تماس / موبایل:</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                    placeholder="۰۹۱۲..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ایمیل:</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نقش سازمانی:</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                >
                  <option value="super_admin">مدیر کل سیستم (دسترسی نامحدود)</option>
                  <option value="chief_accountant">مدیر مالی و حسابدار ارشد</option>
                  <option value="sales_cashier">کارشناس فروش و فاکتور</option>
                  <option value="warehouse_manager">مسئول انبار و موجودی</option>
                  <option value="production_supervisor">سرپرست خط تولید و کارخانه</option>
                  <option value="auditor">ناظر و حسابرس مالی</option>
                </select>
              </div>

              {/* Permissions Checkbox Matrix */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-200">
                  ماتریس مجوزهای دسترسی تفکیکی:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.canViewFinancials}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canViewFinancials: e.target.checked },
                        })
                      }
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span>مشاهده سود و زیان و ترازنامه</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.canIssueInvoices}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canIssueInvoices: e.target.checked },
                        })
                      }
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span>صدور و ویرایش فاکتورها</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.canManageProduction}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageProduction: e.target.checked },
                        })
                      }
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span>مدیریت تولید و فرمول ساخت</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.canManageInventory}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageInventory: e.target.checked },
                        })
                      }
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span>انبارداری و اصلاح موجودی</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.canDeleteEntries}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canDeleteEntries: e.target.checked },
                        })
                      }
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span className="text-rose-400 font-bold">حذف اسناد مالی و فاکتور</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.canManageUsers}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          permissions: { ...userForm.permissions, canManageUsers: e.target.checked },
                        })
                      }
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span className="text-purple-400 font-bold">مدیریت کاربران و دسترسی‌ها</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
                >
                  ذخیره اطلاعات کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAN EDIT / CREATE MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingPlan ? `ویرایش بسته ${editingPlan.name}` : 'تعریف بسته اشتراک جدید'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نام پلن اشتراک:</label>
                <input
                  type="text"
                  value={planForm.name || ''}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  placeholder="مثال: پلن رشد بازرگانی"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">توضیح کوتاه / شعار بسته:</label>
                <input
                  type="text"
                  value={planForm.tagline || ''}
                  onChange={(e) => setPlanForm({ ...planForm, tagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  placeholder="مناسب شرکت‌های تجاری با تراکنش بالا"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">قیمت ماهانه (تومان):</label>
                  <input
                    type="number"
                    value={planForm.monthlyPrice || 0}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">قیمت ۳ ماهه:</label>
                  <input
                    type="number"
                    value={planForm.quarterlyPrice || 0}
                    onChange={(e) => setPlanForm({ ...planForm, quarterlyPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">قیمت سالانه:</label>
                  <input
                    type="number"
                    value={planForm.annualPrice || 0}
                    onChange={(e) => setPlanForm({ ...planForm, annualPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">سقف فاکتور (-۱ = نامحدود):</label>
                  <input
                    type="number"
                    value={planForm.maxInvoicesPerMonth}
                    onChange={(e) => setPlanForm({ ...planForm, maxInvoicesPerMonth: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">سقف کاربر (-۱ = نامحدود):</label>
                  <input
                    type="number"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">سقف انبارها:</label>
                  <input
                    type="number"
                    value={planForm.maxWarehouses}
                    onChange={(e) => setPlanForm({ ...planForm, maxWarehouses: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
                >
                  ذخیره پلن اشتراک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
