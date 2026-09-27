import React from 'react';
import { Cloud, RefreshCw, Layers, ShieldCheck, Menu, CheckCircle2, Crown, ShieldAlert, KeyRound } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { getCurrentPersianTime, getJalaliDate } from '../utils/persian';

interface NavbarProps {
  businessName: string;
  isSyncing: boolean;
  cloudConnected: boolean;
  onManualSync: () => void;
  onToggleMobileMenu: () => void;
  onOpenSubscription?: () => void;
  onOpenAdminLogin?: () => void;
  onNavigateAdmin?: () => void;
  isAdminUnlocked?: boolean;
  subscriptionDays?: number;
  subscriptionPlanName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  businessName,
  isSyncing,
  cloudConnected,
  onManualSync,
  onToggleMobileMenu,
  onOpenSubscription,
  onOpenAdminLogin,
  onNavigateAdmin,
  isAdminUnlocked = false,
  subscriptionDays = 0,
  subscriptionPlanName = 'پلن حرفه‌ای',
}) => {
  const todayJalali = getJalaliDate();
  const nowTime = getCurrentPersianTime();

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-6 gap-2">
        {/* Right Section: Mobile toggle & Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="btn-mobile-menu"
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 lg:hidden focus:outline-hidden"
            aria-label="باز کردن منو"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">امیران حساب</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ابری</span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal hidden md:block truncate max-w-xs">{businessName}</p>
            </div>
          </div>
        </div>

        {/* Center Section: Subscription status & Admin Entry */}
        <div className="flex items-center gap-2">
          {/* Subscription Quick Badge */}
          <button
            onClick={onOpenSubscription}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition text-xs font-medium"
            title="مدیریت اشتراک و درگاه پرداخت"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">{subscriptionPlanName}:</span>
            <span className="font-bold text-amber-200">{subscriptionDays} روز</span>
          </button>

          {/* Super Admin Quick Button */}
          {isAdminUnlocked ? (
            <button
              onClick={onNavigateAdmin}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 animate-in fade-in"
              title="ورود مستقیم به پنل مدیریت کل سیستم"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>پنل مدیریت</span>
            </button>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
              title="ورود به پنل مدیریت ارشد با رمز عبور"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">ورود مدیریت</span>
            </button>
          )}

          {/* Date & Time in Persian (on larger screens) */}
          <div className="hidden xl:flex items-center gap-3 text-xs text-slate-300 bg-slate-800/70 py-1 px-3 rounded-full border border-slate-700/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{todayJalali}</span>
            </span>
            <span className="text-slate-500">|</span>
            <span>{nowTime}</span>
          </div>
        </div>

        {/* Left Section: Cloud Sync Status, PWA install, manual sync */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cloud Sync Badge */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition ${
              cloudConnected
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
            }`}
            title={cloudConnected ? 'پایگاه داده ابری متصل و همگام است' : 'درحال کار با کش محلی'}
          >
            {cloudConnected ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">ابری زنده</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>کش</span>
              </>
            )}
          </div>

          {/* Sync Button */}
          <button
            id="btn-sync-cloud"
            onClick={onManualSync}
            disabled={isSyncing}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
            title="همگام‌سازی دستی با سرور ابری"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">همگام‌سازی</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton compact />
        </div>
      </div>
    </header>
  );
};
