import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Cloud,
  Download,
  Terminal,
  QrCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  Shield,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { AppState } from '../types';

interface DesktopExportViewProps {
  state: AppState;
  onTriggerSync: () => void;
}

export const DesktopExportView: React.FC<DesktopExportViewProps> = ({ state, onTriggerSync }) => {
  const [copiedPythonCmd, setCopiedPythonCmd] = useState(false);
  const [downloadingScript, setDownloadingScript] = useState(false);

  const pythonScriptUrl = '/api/v1/python-bridge/desktop-script';
  const pyinstallerCommand = 'pyinstaller --noconsole --onefile --icon=icon.ico --name "AmiranAccounting" desktop_app.py';

  const handleDownloadPythonScript = async () => {
    setDownloadingScript(true);
    try {
      const res = await fetch(pythonScriptUrl);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'desktop_app.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('خطا در دریافت اسکریپت');
    } finally {
      setDownloadingScript(false);
    }
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(pyinstallerCommand);
    setCopiedPythonCmd(true);
    setTimeout(() => setCopiedPythonCmd(false), 2000);
  };

  const handleDownloadBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `amiran_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-300">خروجی چندسکویی (Cross-Platform) با موتور پایتون</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black">خروجی ویندوز (EXE) و دسترسی آسان با گوشی موبایل</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          این سیستم به گونه‌ای طراحی شده که می‌توانید آن را به صورت یک برنامه مستقل ویندوزی (بدون نیاز به مرورگر)، یا به صورت وب‌اپلیکیشن نصب‌شونده (PWA) روی گوشی‌های اندروید و آیفون استفاده کنید، در حالی که پایگاه داده به صورت لحظه‌ای با سرور همگام است.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Windows Native Output with Python PyWebView */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">تولید فایل اجرایی ویندوز (Windows .exe) با پایتون</h3>
                <span className="text-[11px] text-slate-500">استفاده از کتابخانه قدرتمند PyWebView و موتور Edge WebView2</span>
              </div>
            </div>

            <div className="space-y-3 text-xs mt-4">
              <p className="text-slate-600 leading-relaxed">
                برای اجرای برنامه در قالب یک پنجره دسکتاپ بومی ویندوز، اسکریپت پایتون زیر را دریافت کنید. این اسکریپت وب‌اپلیکیشن حسابداری را در یک پنجره Native تمام‌صفحه و با امنیت بالا اجرا می‌کند.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">مراحل ۳ گانه خروجی فایل EXE در ویندوز:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>نصب کتابخانه‌های پایتون: <code className="font-mono bg-white px-1 rounded border border-slate-200">pip install pywebview pyinstaller</code></li>
                  <li>دانلود فایل <code className="font-mono bg-white px-1 rounded border border-slate-200">desktop_app.py</code> با دکمه زیر</li>
                  <li>اجرای دستور بیلد PyInstaller در خط فرمان (CMD)</li>
                </ol>
              </div>

              {/* Command box */}
              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>دستور کامپایل نهایی در CMD / PowerShell:</span>
                  <button onClick={handleCopyCommand} className="hover:text-white flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    <span>{copiedPythonCmd ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
                <code className="text-xs font-mono text-emerald-400 block dir-ltr text-left overflow-x-auto py-1">
                  {pyinstallerCommand}
                </code>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleDownloadPythonScript}
              disabled={downloadingScript}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingScript ? 'در حال دریافت...' : 'دانلود اسکریپت پایتون (desktop_app.py)'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Mobile Access & PWA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">دسترسی و نصب روی گوشی موبایل (Android & iOS)</h3>
                <span className="text-[11px] text-slate-500">وب‌اپلیکیشن پیش‌رونده (PWA) با کارکرد آفلاین و آنلاین</span>
              </div>
            </div>

            <div className="space-y-3 text-xs mt-4">
              <p className="text-slate-600 leading-relaxed">
                این اپلیکیشن به صورت استاندارد PWA کامپایل شده است و بدون نیاز به کافه بازار یا گوگل پلی، مستقیماً روی گوشی نصب می‌شود:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                  <span className="font-bold text-emerald-950 block">📱 در گوشی‌های اندروید (Android):</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    آدرس برنامه را در مرورگر Chrome باز کنید. سپس روی بنر "نصب برنامه حسابداری" یا دکمه ۳ نقطه و سپس <strong>افزودن به صفحه اصلی (Install App)</strong> کلیک کنید.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">🍏 در گوشی‌های آیفون (iOS):</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    آدرس برنامه را در Safari باز کرده و دکمه <strong>Share (اشتراک‌گذاری)</strong> را بزنید، سپس گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">پایگاه داده ابری و کش محلی</span>
                  <span className="text-[11px] text-slate-500">اطلاعات روی دستگاه کش شده و هنگام اتصال اینترنت خودکار همگام می‌شوند.</span>
                </div>
                <button
                  onClick={onTriggerSync}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>همگام‌سازی ابری</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <FileCode className="w-4 h-4" />
              <span>پشتیبان‌گیری کامل از پایگاه داده (JSON Backup)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
