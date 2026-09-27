import React, { useState } from 'react';
import { Shield, KeyRound, Eye, EyeOff, Lock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { apiService } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('لطفاً رمز عبور مدیریت را وارد کنید');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiService.adminLogin(password.trim());
      setSuccess(true);
      setTimeout(() => {
        onSuccess(res.token, res.user);
        onClose();
        setPassword('');
        setSuccess(false);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'رمز عبور مدیریت نادرست است');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefaultPassword = () => {
    setPassword('admin@amiran2026');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with security gradient */}
        <div className="bg-gradient-to-r from-rose-900/40 via-purple-900/30 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-900/30">
              <Shield className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ورود به پنل مدیریت ارشد</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30">
                  Super Admin
                </span>
              </h3>
              <p className="text-xs text-slate-400">احراز هویت امن جهت دسترسی به تنظیمات کلان و اشتراک‌ها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>احراز هویت موفقیت‌آمیز بود. در حال انتقال به پنل مدیریت...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              رمز عبور اختصاصی مدیریت کل:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                dir="ltr"
                placeholder="رمز عبور مدیریت را وارد کنید"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-10 pl-11 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono transition"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Helper for Demo / Master Key */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span>رمز پیش‌فرض سیستم: <code className="text-amber-300 font-mono">admin@amiran2026</code></span>
            </div>
            <button
              type="button"
              onClick={handleUseDefaultPassword}
              className="text-[11px] font-medium text-rose-400 hover:text-rose-300 underline"
            >
              درج خودکار
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold hover:from-rose-500 hover:to-red-500 transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>درحال بررسی...</span>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>ورود به پنل مدیریت</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
