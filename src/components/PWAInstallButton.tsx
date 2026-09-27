import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Monitor, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, show installed badge or hide
  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
        <Monitor className="w-3.5 h-3.5 text-emerald-600" />
        اپلیکیشن نصب‌شده
      </span>
    );
  }

  // Chromium / Android / Windows Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-install-pwa"
        onClick={install}
        className={`flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 ${
          compact ? 'py-1 px-2.5 text-xs' : ''
        }`}
        title="نصب نسخه ویندوز و موبایل با یک کلیک"
      >
        <Download className="w-4 h-4" />
        <span>نصب در ویندوز / گوشی</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          <span>نصب روی آیفون (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">نصب در آیفون / آیپد</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-600 space-y-2">
                <span className="block font-medium text-slate-800">۱. در مرورگر Safari دکمه Share (اشتراک‌گذاری) در پایین صفحه را بزنید.</span>
                <span className="block font-medium text-slate-800">۲. به پایین اسکرول کنید و گزینه <strong>Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کنید.</span>
                <span className="block font-medium text-emerald-600">۳. آیکون برنامه در صفحه اصلی آیفون شما مانند یک اپ نیتیو اضافه می‌شود.</span>
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback direct shortcut install hint button
  return (
    <button
      id="btn-install-shortcut"
      onClick={() => alert('برای نصب روی ویندوز یا موبایل، از منوی سه نقطه مرورگر (Chrome / Edge) گزینه «Install Amiran» یا «افزودن به صفحه اصلی» را کلیک کنید.')}
      className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
      title="نسخه ویندوز و موبایل"
    >
      <Monitor className="w-3.5 h-3.5 text-slate-500" />
      <span>نصب ویندوز / PWA</span>
    </button>
  );
};
