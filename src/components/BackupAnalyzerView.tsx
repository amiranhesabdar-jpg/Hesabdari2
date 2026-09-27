import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Users,
  Package,
  Eye,
  Check,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  HelpCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  AppState,
  BackupAnalysisResult,
  AccountMappingRule,
  BackupCommitOptions,
} from '../types';
import { apiService } from '../services/api';
import { STANDARD_AMIRAN_ACCOUNTS } from '../data/standardAccounts';

interface Props {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onNavigateTab: (tabId: string) => void;
}

export const BackupAnalyzerView: React.FC<Props> = ({ state, onUpdateState, onNavigateTab }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] = useState<BackupAnalysisResult | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'sanads' | 'mapping' | 'contacts' | 'products'>('sanads');
  const [customMappings, setCustomMappings] = useState<AccountMappingRule[]>([]);

  const [commitOptions, setCommitOptions] = useState<BackupCommitOptions>({
    autoCreateAccounts: true,
    importContacts: true,
    importProducts: true,
    autoBalanceDiscrepancy: true,
    overrideExistingNumbers: false,
  });

  const [selectedSanadIndex, setSelectedSanadIndex] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState('');

  // Handle uploaded file (Excel, CSV, JSON, XML, TXT)
  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAnalyzing(true);

    try {
      const fileName = file.name;
      const ext = fileName.toLowerCase().split('.').pop() || '';

      if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = (e.target?.result as string) || '';
            const result = await apiService.analyzeBackupFile(base64Data, fileName);
            setAnalysisResult(result);
            setCustomMappings(result.mappingRules);
            setAnalyzing(false);
          } catch (err: any) {
            setErrorMsg(`خطا در خواندن فایل اکسل: ${err.message}`);
            setAnalyzing(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        const result = await apiService.analyzeBackupFile(text, fileName);
        setAnalysisResult(result);
        setCustomMappings(result.mappingRules);
        setAnalyzing(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در تحلیل فایل پشتیبان');
      setAnalyzing(false);
    }
  };

  // Quick preset sample loader
  const handleLoadSample = async (type: 'sepidar' | 'holoo' | 'excel') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAnalyzing(true);
    try {
      const sample = await apiService.getBackupSample(type);
      const result = await apiService.analyzeBackupFile(sample.content, sample.fileName);
      setAnalysisResult(result);
      setCustomMappings(result.mappingRules);
      setAnalyzing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در دریافت نمونه');
      setAnalyzing(false);
    }
  };

  // Modify account mapping
  const handleAccountMappingChange = (sourceCode: string, targetAccountCode: string) => {
    const std = STANDARD_AMIRAN_ACCOUNTS.find((a) => a.code === targetAccountCode);
    const existing = state.accounts.find((a) => a.code === targetAccountCode);

    const targetAccountName = existing?.name || std?.name || `حساب جدید ${targetAccountCode}`;
    const targetAccountId = existing?.id || std?.id || `ACC-${targetAccountCode}`;

    setCustomMappings((prev) =>
      prev.map((rule) => {
        if (rule.sourceCode === sourceCode) {
          return {
            ...rule,
            targetAccountCode,
            targetAccountName,
            targetAccountId,
            isAutoMatched: false,
            createIfNotExists: !existing && !std,
          };
        }
        return rule;
      })
    );
  };

  // Final Commit Import
  const handleCommit = async () => {
    if (!analysisResult) return;
    setCommitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiService.commitBackupImport(analysisResult, commitOptions, customMappings);
      setSuccessMsg(res.message);
      if (res.updatedState) {
        onUpdateState(res.updatedState);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در اعمال و ثبت اسناد');
    } finally {
      setCommitting(false);
    }
  };

  // Rollback to pre-import snapshot
  const handleRollback = async () => {
    if (!window.confirm('آیا از بازگردانی اطلاعات به وضعیت قبل از آخرین انتقال اطمینان دارید؟')) return;
    setRollingBack(true);
    setErrorMsg(null);
    try {
      const res = await apiService.rollbackBackup();
      setSuccessMsg(res.message);
      if (res.updatedState) {
        onUpdateState(res.updatedState);
      }
      setAnalysisResult(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در بازگردانی داده‌ها');
    } finally {
      setRollingBack(false);
    }
  };

  const filteredSanads = analysisResult?.sanads.filter((s) => {
    if (!searchFilter) return true;
    return (
      s.entryNumber.toString().includes(searchFilter) ||
      s.description.includes(searchFilter) ||
      s.date.includes(searchFilter) ||
      s.rows.some((r) => r.sourceAccountName.includes(searchFilter) || r.targetAccountName.includes(searchFilter))
    );
  }) || [];

  return (
    <div id="backup-analyzer-view" className="space-y-6">
      {/* Header & Commercial Pitch */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ماژول تجاری‌سازی و انتقال مهاجرتی
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                تضمین صفر مغایرت و ممیزی دوبل
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
              تحلیل و تطبیق هوشمند بکاپ نرم‌افزارهای حسابداری
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              انتقال ۱۰۰٪ دقیق اسناد مالی، تراز افتتاحیه، طرف‌حساب‌ها و موجودی کالاها از نرم‌افزارهای{' '}
              <strong className="text-white font-medium">سپیدار سیستم، هلو، همکاران سیستم، محک، پارسیان</strong> و فایل‌های اکسل/CSV، بدون از دست رفتن ریالی از سوابق مالی.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-rollback-backup"
              onClick={handleRollback}
              disabled={rollingBack}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="بازگشت به وضعیت قبل از آخرین انتقال داده‌ها"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${rollingBack ? 'animate-spin' : ''}`} />
              {rollingBack ? 'در حال بازیابی...' : 'بازگردانی به قبل انتقال'}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold">{successMsg}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('journal')}
                className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-md font-medium hover:bg-emerald-800 flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                مشاهده اسناد ثبت‌شده در دفتر روزنامه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Upload / Fast Demo Test Presets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
            ۱
          </span>
          بارگذاری فایل پشتیبان یا انتخاب نمونه برای تست فوری
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          فایل بکاپ را بکشید و رها کنید (فرمت‌های پشتیبانی شده: Excel .xlsx, .xls, .csv, .json, .txt, .xml) یا از نمونه‌های شبیه‌سازی شده زیر استفاده کنید.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drag & Drop Upload Card */}
          <div className="lg:col-span-2">
            <label
              htmlFor="backup-file-input"
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                analyzing
                  ? 'border-indigo-400 bg-indigo-50/50'
                  : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
              }`}
            >
              <input
                id="backup-file-input"
                type="file"
                className="hidden"
                accept=".json,.csv,.xlsx,.xls,.txt,.xml,.tsv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                disabled={analyzing}
              />
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                {analyzing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <span className="text-sm font-semibold text-slate-800 mb-1">
                {analyzing ? 'در حال پردازش و استخراج آرتیکل‌ها...' : 'انتخاب یا رها کردن فایل پشتیبان'}
              </span>
              <span className="text-xs text-slate-500 max-w-sm">
                پشتیبانی خودکار از فرمت‌های استخراجی سپیدار، هلو، همکاران سیستم و اکسل
              </span>
            </label>
          </div>

          {/* Quick Test Presets */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                تست فوری با نمونه‌های واقعی:
              </span>
              <div className="space-y-2">
                <button
                  id="btn-sample-sepidar"
                  onClick={() => handleLoadSample('sepidar')}
                  disabled={analyzing}
                  className="w-full text-right p-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-xs transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-indigo-700">
                      بکاپ سپیدار سیستم
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ۳ سند افتتاحیه، خرید و فروش + طرف‌حساب‌ها و انبار
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                    JSON
                  </span>
                </button>

                <button
                  id="btn-sample-holoo"
                  onClick={() => handleLoadSample('holoo')}
                  disabled={analyzing}
                  className="w-full text-right p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-xs transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-emerald-700">
                      دفتر روزنامه هلو (نسخه ۴۱)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ۴ سند مالی دوبل با کدهای کل و معین و اشخاص
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono">
                    CSV
                  </span>
                </button>

                <button
                  id="btn-sample-excel"
                  onClick={() => handleLoadSample('excel')}
                  disabled={analyzing}
                  className="w-full text-right p-2.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-amber-700">
                      شیت جامع اکسل حسابداری
                    </span>
                    <span className="text-[11px] text-slate-500">
                      اسناد تراز مالی با ردیف‌های بدهکار و بستانکار
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-mono">
                    XLSX/CSV
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>مجهز به سیستم ممیزی تراز قبل از اعمال به دیتابیس</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Analysis Overview (when file analyzed) */}
      {analysisResult && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* System Detected */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>سامانه مبدأ شناسایی‌شده</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                  {analysisResult.fileFormat}
                </span>
              </div>
              <div className="text-base font-bold text-slate-900 truncate">
                {analysisResult.sourceSystemName}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                فایل: <span className="font-mono text-[11px]">{analysisResult.fileName}</span>
              </div>
            </div>

            {/* Total Sanads & Rows */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>اسناد و آرتیکل‌ها</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-indigo-700">
                {analysisResult.totalSanads.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">سند</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                شامل {analysisResult.totalRows.toLocaleString('fa-IR')} ردیف مالی دوبل
              </div>
            </div>

            {/* Turnover Debits / Credits */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>گردش بدهکار / بستانکار</span>
                <span className="text-[10px] text-slate-400">ریال</span>
              </div>
              <div className="text-base font-bold text-slate-800 truncate">
                {analysisResult.totalDebit.toLocaleString('fa-IR')}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>بستانکار: {analysisResult.totalCredit.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* Balance Status (Zero-Loss) */}
            <div
              className={`rounded-xl border p-4 shadow-sm ${
                analysisResult.isBalanced
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold">وضعیت تراز دوبل</span>
                {analysisResult.isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="text-base font-bold">
                {analysisResult.isBalanced ? 'تراز ۱۰۰٪ - مغایرت صفر' : 'دارای مغایرت تراز'}
              </div>
              <div className="text-xs mt-1">
                {analysisResult.isBalanced ? (
                  <span className="text-emerald-700">تمام اسناد متوازن هستند</span>
                ) : (
                  <span className="text-amber-800 font-mono">
                    اختلاف: {analysisResult.discrepancy.toLocaleString('fa-IR')} ریال
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Accounting Notes & Recommendations */}
          {(analysisResult.aiAssisted || analysisResult.recommendations.length > 0) && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950">
              <div className="flex items-center gap-2 font-bold mb-1 text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>گزارش ممیزی و توصیه‌های تطبیق مالی امیران:</span>
              </div>
              {analysisResult.aiNotes && (
                <p className="mb-2 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-indigo-100">
                  {analysisResult.aiNotes}
                </p>
              )}
              <ul className="space-y-1 text-indigo-800">
                {analysisResult.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabs for Detailed Inspection */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-3 sm:px-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 py-2 overflow-x-auto no-scrollbar max-w-full">
                <button
                  id="tab-btn-sanads"
                  onClick={() => setActiveSubTab('sanads')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSubTab === 'sanads'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  اسناد حسابداری استخراج‌شده ({analysisResult.sanads.length})
                </button>

                <button
                  id="tab-btn-mapping"
                  onClick={() => setActiveSubTab('mapping')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSubTab === 'mapping'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  جدول تطبیق کدینگ حساب‌ها ({customMappings.length})
                </button>

                <button
                  id="tab-btn-contacts"
                  onClick={() => setActiveSubTab('contacts')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSubTab === 'contacts'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  طرف‌حساب‌ها ({analysisResult.contacts.length})
                </button>

                <button
                  id="tab-btn-products"
                  onClick={() => setActiveSubTab('products')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSubTab === 'products'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  کالاها و انبار ({analysisResult.products.length})
                </button>
              </div>

              {activeSubTab === 'sanads' && (
                <div className="py-2">
                  <input
                    type="text"
                    placeholder="جستجو در اسناد یا آرتیکل‌ها..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none w-52"
                  />
                </div>
              )}
            </div>

            {/* Sub-tab 1: Sanads Inspector */}
            {activeSubTab === 'sanads' && (
              <div className="p-4">
                {filteredSanads.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    سندی با این مشخصات یافت نشد.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Sanad List sidebar */}
                    <div className="lg:col-span-4 border border-slate-200 rounded-lg max-h-[480px] overflow-y-auto divide-y divide-slate-100">
                      {filteredSanads.map((s, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedSanadIndex(idx)}
                          className={`p-3 cursor-pointer text-xs transition-colors ${
                            selectedSanadIndex === idx
                              ? 'bg-indigo-50 border-r-4 border-indigo-600 font-semibold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">
                              سند شماره {s.entryNumber}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{s.date}</span>
                          </div>
                          <p className="text-slate-600 line-clamp-1 mb-1.5 font-normal">
                            {s.description}
                          </p>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">{s.rows.length} آرتیکل</span>
                            <span
                              className={`font-mono font-medium ${
                                s.isBalanced ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {s.totalDebit.toLocaleString('fa-IR')} ریال
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Active Sanad Rows Details */}
                    {filteredSanads[selectedSanadIndex] && (
                      <div className="lg:col-span-8 border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-slate-900">
                                  سند حسابداری شماره {filteredSanads[selectedSanadIndex].entryNumber}
                                </h3>
                                {filteredSanads[selectedSanadIndex].isBalanced ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    تراز کامل
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    مغایرت تراز
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {filteredSanads[selectedSanadIndex].description}
                              </p>
                            </div>
                            <div className="text-left text-xs">
                              <span className="text-slate-400 block text-[11px]">تاریخ سند</span>
                              <span className="font-mono font-semibold text-slate-700">
                                {filteredSanads[selectedSanadIndex].date}
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                  <th className="py-2 px-3">ردیف</th>
                                  <th className="py-2 px-3">کد و حساب مبدأ</th>
                                  <th className="py-2 px-3">تطبیق با حساب امیران</th>
                                  <th className="py-2 px-3">شرح آرتیکل</th>
                                  <th className="py-2 px-3 text-left">بدهکار (ریال)</th>
                                  <th className="py-2 px-3 text-left">بستانکار (ریال)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredSanads[selectedSanadIndex].rows.map((row, rIdx) => (
                                  <tr key={row.id || rIdx} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-mono text-slate-400">{rIdx + 1}</td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-mono font-semibold text-indigo-700 ml-1">
                                        {row.sourceAccountCode}
                                      </span>
                                      <span className="text-slate-700">{row.sourceAccountName}</span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-mono text-slate-600 ml-1">
                                        {row.targetAccountCode}
                                      </span>
                                      <span className="text-emerald-800 font-medium">
                                        {row.targetAccountName}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                      {row.description}
                                    </td>
                                    <td className="py-2.5 px-3 text-left font-mono font-semibold text-slate-800">
                                      {row.debit > 0 ? row.debit.toLocaleString('fa-IR') : '-'}
                                    </td>
                                    <td className="py-2.5 px-3 text-left font-mono font-semibold text-slate-800">
                                      {row.credit > 0 ? row.credit.toLocaleString('fa-IR') : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Sanad totals footer */}
                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg">
                          <span className="font-semibold text-slate-700">جمع گردش سند:</span>
                          <div className="flex items-center gap-6 font-mono text-xs">
                            <div>
                              <span className="text-slate-500 ml-2">جمع بدهکار:</span>
                              <span className="font-bold text-slate-900">
                                {filteredSanads[selectedSanadIndex].totalDebit.toLocaleString('fa-IR')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 ml-2">جمع بستانکار:</span>
                              <span className="font-bold text-slate-900">
                                {filteredSanads[selectedSanadIndex].totalCredit.toLocaleString('fa-IR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Chart of Accounts Mapping Table */}
            {activeSubTab === 'mapping' && (
              <div className="p-4">
                <div className="mb-3 text-xs text-slate-600">
                  کدهای حسابداری استخراج شده از فایل با کدینگ استاندارد امیران تطبیق داده شده‌اند. در صورت تمایل می‌توانید مقصد هر حساب را تغییر دهید:
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3">کد مبدأ</th>
                        <th className="py-2.5 px-3">عنوان در نرم‌افزار قبلی</th>
                        <th className="py-2.5 px-3">نگاشت به سرفصل حساب امیران</th>
                        <th className="py-2.5 px-3">وضعیت تطبیق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customMappings.map((rule) => (
                        <tr key={rule.sourceCode} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                            {rule.sourceCode}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {rule.sourceName}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={rule.targetAccountCode}
                              onChange={(e) =>
                                handleAccountMappingChange(rule.sourceCode, e.target.value)
                              }
                              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                              <optgroup label="سرفصل‌های استاندارد امیران">
                                {STANDARD_AMIRAN_ACCOUNTS.map((acc) => (
                                  <option key={acc.code} value={acc.code}>
                                    {acc.code} - {acc.name}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="سرفصل‌های موجود سیستم">
                                {state.accounts.map((acc) => (
                                  <option key={acc.id} value={acc.code}>
                                    {acc.code} - {acc.name}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            {rule.isAutoMatched ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                                تطبیق هوشمند دقیق
                              </span>
                            ) : rule.createIfNotExists ? (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-medium">
                                ایجاد حساب معین جدید
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">
                                تغییر دستی توسط کاربر
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Contacts */}
            {activeSubTab === 'contacts' && (
              <div className="p-4">
                <div className="mb-3 text-xs text-slate-600">
                  طرف‌حساب‌ها (مشتریان و تامین‌کنندگان) استخراج شده از فایل که در صورت تایید به دفتر اشخاص اضافه می‌شوند:
                </div>
                {analysisResult.contacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    طرف‌حساب مجزایی در فایل یافت نشد (اسناد به صورت دفتر کل هستند).
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2.5 px-3">کد</th>
                          <th className="py-2.5 px-3">نام طرف‌حساب</th>
                          <th className="py-2.5 px-3">نوع</th>
                          <th className="py-2.5 px-3">تلفن تماس</th>
                          <th className="py-2.5 px-3 text-left">مانده حساب اول دوره (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysisResult.contacts.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{c.code || idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{c.name}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {c.type === 'customer'
                                ? 'مشتری'
                                : c.type === 'supplier'
                                ? 'تامین‌کننده'
                                : 'مشتری و تامین‌کننده'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{c.phone || '-'}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-semibold">
                              <span
                                className={
                                  c.balance > 0
                                    ? 'text-emerald-700'
                                    : c.balance < 0
                                    ? 'text-rose-700'
                                    : 'text-slate-500'
                                }
                              >
                                {c.balance.toLocaleString('fa-IR')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 4: Products & Inventory */}
            {activeSubTab === 'products' && (
              <div className="p-4">
                <div className="mb-3 text-xs text-slate-600">
                  کالاها و اقلام انبار استخراج شده جهت تطبیق موجودی و کاردکس:
                </div>
                {analysisResult.products.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    فایل ارسالی حاوی فهرست اقلام انبار نبود.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2.5 px-3">کد کالا</th>
                          <th className="py-2.5 px-3">نام کالا / قطعه</th>
                          <th className="py-2.5 px-3">واحد</th>
                          <th className="py-2.5 px-3">موجودی انتقالی</th>
                          <th className="py-2.5 px-3 text-left">نرخ خرید</th>
                          <th className="py-2.5 px-3 text-left">نرخ فروش</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysisResult.products.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{p.code}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                            <td className="py-2.5 px-3 text-slate-500">{p.unit}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                              {p.stock.toLocaleString('fa-IR')}
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono text-slate-700">
                              {p.buyPrice ? p.buyPrice.toLocaleString('fa-IR') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono text-slate-700">
                              {p.sellPrice ? p.sellPrice.toLocaleString('fa-IR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 5: Commit Configuration & Final Execution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                ۳
              </span>
              تنظیمات نهایی و ثبت قطعی در پایگاه داده ابری
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={commitOptions.autoCreateAccounts}
                  onChange={(e) =>
                    setCommitOptions({ ...commitOptions, autoCreateAccounts: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    ایجاد خودکار حساب‌های معین جدید در صورت عدم وجود
                  </span>
                  <span className="text-slate-500">
                    اگر در نرم‌افزار قبلی حسابی وجود داشت که در امیران نبود، بدون حذف سند، حساب ساخته شود.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={commitOptions.autoBalanceDiscrepancy}
                  onChange={(e) =>
                    setCommitOptions({ ...commitOptions, autoBalanceDiscrepancy: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    تراز خودکار کسری‌های احتمالی با حساب تعدیلات (کد ۹۹۹)
                  </span>
                  <span className="text-slate-500">
                    در صورت وجود خطای گردکردن ریالی در نرم‌افزار مبدأ، آرتیکل تعدیل ثبت می‌شود تا تراز دفاتر حفظ شود.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={commitOptions.importContacts}
                  onChange={(e) =>
                    setCommitOptions({ ...commitOptions, importContacts: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    افزودن و به‌روزرسانی طرف‌حساب‌ها (مشتریان و تامین‌کنندگان)
                  </span>
                  <span className="text-slate-500">
                    افراد استخراج شده به همراه مانده حساب اولیه در دفتر اشخاص ثبت شوند.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={commitOptions.importProducts}
                  onChange={(e) =>
                    setCommitOptions({ ...commitOptions, importProducts: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    افزودن کالاها و تطبیق موجودی انبار
                  </span>
                  <span className="text-slate-500">
                    کالاهای یافت شده در بکاپ به سیستم انبار و کاردکس کالا اضافه شوند.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>قبل از ثبت، یک نسخه پشتیبان (Snapshot) جهت امکان بازگردانی آنی ذخیره می‌شود.</span>
              </div>

              <button
                id="btn-commit-import"
                onClick={handleCommit}
                disabled={committing || analysisResult.sanads.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال ثبت قطعی و تراز اسناد...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تایید ممیزی و ثبت قطعی در سیستم امیران</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
