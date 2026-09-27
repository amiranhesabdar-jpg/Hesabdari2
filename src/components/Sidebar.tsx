import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Package,
  BookOpen,
  Terminal,
  Puzzle,
  Download,
  X,
  Building2,
  FileSpreadsheet,
  Crown,
  ShieldAlert,
  KeyRound,
  Lock,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'backup_analyzer'
  | 'commercial'
  | 'manufacturing'
  | 'inventory'
  | 'accounting'
  | 'api_hub'
  | 'plugins'
  | 'desktop_export'
  | 'admin_panel';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pluginCount: number;
  isAdminUnlocked?: boolean;
  onOpenAdminLogin?: () => void;
  onOpenSubscription?: () => void;
  pendingReceiptsCount?: number;
  subscriptionDays?: number;
  subscriptionPlanName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  pluginCount,
  isAdminUnlocked = false,
  onOpenAdminLogin,
  onOpenSubscription,
  pendingReceiptsCount = 0,
  subscriptionDays = 0,
  subscriptionPlanName = 'پلن حرفه‌ای',
}) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'داشبورد مدیریتی',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-sky-500',
    },
    {
      id: 'backup_analyzer' as TabType,
      label: 'تحلیل و تطبیق بکاپ',
      icon: FileSpreadsheet,
      badge: 'سپیدار، هلو و...',
      color: 'text-emerald-500',
    },
    {
      id: 'commercial' as TabType,
      label: 'حسابداری بازرگانی',
      icon: ShoppingCart,
      badge: 'فروش و خرید',
      color: 'text-emerald-500',
    },
    {
      id: 'manufacturing' as TabType,
      label: 'حسابداری صنعتی و تولیدی',
      icon: Factory,
      badge: 'BOM و بهای تمام‌شده',
      color: 'text-amber-500',
    },
    {
      id: 'inventory' as TabType,
      label: 'انبارداری و کاردکس کالا',
      icon: Package,
      badge: 'چند انباره',
      color: 'text-indigo-500',
    },
    {
      id: 'accounting' as TabType,
      label: 'دفاتر مالی و اسناد دوبل',
      icon: BookOpen,
      badge: 'ترازنامه و P&L',
      color: 'text-teal-500',
    },
    {
      id: 'api_hub' as TabType,
      label: 'مرکز API و اتصال پایتون / سایت',
      icon: Terminal,
      badge: 'REST / Webhook',
      color: 'text-cyan-500',
    },
    {
      id: 'plugins' as TabType,
      label: 'سیستم افزونه‌ها',
      icon: Puzzle,
      badge: `${pluginCount} افزونه`,
      color: 'text-purple-500',
    },
    {
      id: 'desktop_export' as TabType,
      label: 'خروجی ویندوز و موبایل',
      icon: Download,
      badge: 'EXE و PWA',
      color: 'text-rose-500',
    },
  ];

  const handleSelect = (tab: TabType) => {
    onTabChange(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col border-l border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header in mobile */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <span className="font-bold text-sm text-white">منوی سیستم حسابداری</span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business & Subscription Status Badge */}
        <div
          onClick={onOpenSubscription}
          className="px-4 py-3 mx-3 my-3 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700/80 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition group shadow-md"
          title="مشاهده و تمدید اشتراک"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <Crown className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{subscriptionPlanName}</p>
              <span className="text-[10px] text-amber-400 font-medium">
                {subscriptionDays} روز اعتبار باقیمانده
              </span>
            </div>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
            تمدید
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {/* Main system menu */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-white' : item.color
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-normal ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Subscription & Payment Direct Access */}
          <button
            onClick={() => {
              if (onOpenSubscription) onOpenSubscription();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-950/30 hover:text-amber-200 transition border border-amber-500/20 mt-2"
          >
            <div className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>اشتراک و درگاه پرداخت</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              خرید و تمدید
            </span>
          </button>

          {/* DYNAMIC ADMIN SECTION: UNLOCKED vs LOCKED */}
          <div className="pt-3 mt-3 border-t border-slate-800">
            {isAdminUnlocked ? (
              <button
                id="nav-admin-panel"
                onClick={() => handleSelect('admin_panel')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                  activeTab === 'admin_panel'
                    ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400/50'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>پنل مدیریت کل سیستم</span>
                </div>
                <div className="flex items-center gap-1">
                  {pendingReceiptsCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                      {pendingReceiptsCount}
                    </span>
                  )}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/30 text-rose-200">
                    فعال
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onOpenAdminLogin) onOpenAdminLogin();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition border border-dashed border-slate-700/80"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>ورود با رمز مدیریت</span>
                </div>
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>نسخه نرم‌افزار: ۳.۵.۰</span>
            <span className="text-emerald-400 font-mono">Cloud Synced</span>
          </div>
          <div className="truncate text-slate-400 font-mono text-[10px]" title="کاربر سیستم">
            حسابدار: amiranhesabdar@gmail.com
          </div>
        </div>
      </aside>
    </>
  );
};

