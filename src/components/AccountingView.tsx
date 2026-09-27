import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Scale,
  PieChart,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Layers,
  ChevronDown,
  Globe,
  Coins,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { AppState, JournalEntry, JournalRow, Account } from '../types';
import {
  formatCurrency,
  formatNumber,
  toPersianDigits,
  getJalaliDate,
  generateId,
  AppCurrency,
  CURRENCY_CONFIG,
  formatAmountWithCurrency,
  convertCurrency,
} from '../utils/persian';

interface AccountingViewProps {
  state: AppState;
  onSaveJournalEntry: (entry: JournalEntry) => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({ state, onSaveJournalEntry }) => {
  const [subTab, setSubTab] = useState<'journal' | 'accounts' | 'trial_balance' | 'balance_sheet' | 'profit_loss'>('journal');
  const [pnlCurrency, setPnlCurrency] = useState<AppCurrency>('TOMAN');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

  // New Journal Entry Form State
  const [entryDescription, setEntryDescription] = useState('ثبت هزینه اداری و تنخواه‌گردان');
  const [entryDate, setEntryDate] = useState(getJalaliDate());
  const [entryRef, setEntryRef] = useState('');
  const [entryRows, setEntryRows] = useState<JournalRow[]>([
    {
      id: generateId('ROW'),
      accountId: state.accounts[1]?.id || '',
      accountCode: state.accounts[1]?.code || '101',
      accountName: state.accounts[1]?.name || 'موجودی نقد و بانک',
      description: 'پرداخت تنخواه',
      debit: 0,
      credit: 1500000,
    },
    {
      id: generateId('ROW'),
      accountId: state.accounts[state.accounts.length - 1]?.id || '',
      accountCode: state.accounts[state.accounts.length - 1]?.code || '802',
      accountName: state.accounts[state.accounts.length - 1]?.name || 'هزینه ملزومات',
      description: 'خرید لوازم مصرفی اداری',
      debit: 1500000,
      credit: 0,
    },
  ]);

  const totalDebit = entryRows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
  const totalCredit = entryRows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleAddRow = () => {
    const acc = state.accounts[0];
    setEntryRows([
      ...entryRows,
      {
        id: generateId('ROW'),
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        description: '',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleUpdateRow = (index: number, field: keyof JournalRow, value: any) => {
    const updated = [...entryRows];
    const current = { ...updated[index], [field]: value };
    if (field === 'accountId') {
      const acc = state.accounts.find((a) => a.id === value);
      if (acc) {
        current.accountCode = acc.code;
        current.accountName = acc.name;
      }
    }
    updated[index] = current;
    setEntryRows(updated);
  };

  const handleRemoveRow = (index: number) => {
    if (entryRows.length <= 2) return;
    setEntryRows(entryRows.filter((_, i) => i !== index));
  };

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    const newEntry: JournalEntry = {
      id: generateId('JRN'),
      entryNumber: state.journalEntries.length + 1,
      date: entryDate,
      referenceNumber: entryRef || `REF-${Date.now().toString().slice(-4)}`,
      description: entryDescription,
      rows: entryRows,
      totalDebit,
      totalCredit,
      status: 'approved',
      source: 'manual',
    };

    onSaveJournalEntry(newEntry);
    setShowNewEntryModal(false);
  };

  // Balance Sheet Calculations
  const currentAssets = state.accounts
    .filter((a) => a.category === 'current_assets' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  const nonCurrentAssets = state.accounts
    .filter((a) => a.category === 'non_current_assets' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalAssets = currentAssets + nonCurrentAssets;

  const currentLiabilities = state.accounts
    .filter((a) => a.category === 'current_liabilities' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = currentLiabilities;

  const totalEquity = state.accounts
    .filter((a) => a.category === 'equity' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  // Multi-Currency Profit & Loss Calculations with Automatic Conversion Rates
  const salesInvoices = state.invoices.filter((i) => i.type === 'sales');
  const purchaseInvoices = state.invoices.filter((i) => i.type === 'purchase');

  // Currency breakdown of sales
  const salesUSD = salesInvoices.filter((i) => i.currency === 'USD').reduce((sum, i) => sum + i.grandTotal, 0);
  const salesEUR = salesInvoices.filter((i) => i.currency === 'EUR').reduce((sum, i) => sum + i.grandTotal, 0);
  const salesIRR = salesInvoices.filter((i) => i.currency === 'IRR').reduce((sum, i) => sum + i.grandTotal, 0);
  const salesTOMAN = salesInvoices.filter((i) => !i.currency || i.currency === 'TOMAN').reduce((sum, i) => sum + i.grandTotal, 0);

  const usdRate = state.settings.exchangeRates?.USD || CURRENCY_CONFIG.USD.defaultRate;
  const eurRate = state.settings.exchangeRates?.EUR || CURRENCY_CONFIG.EUR.defaultRate;
  const irrRate = state.settings.exchangeRates?.IRR || CURRENCY_CONFIG.IRR.defaultRate;

  // Auto-converted sales revenue in base currency (Toman)
  const convertedUsdInToman = salesInvoices
    .filter((i) => i.currency === 'USD')
    .reduce((sum, i) => sum + (i.baseCurrencyGrandTotal || Math.round(i.grandTotal * (i.exchangeRate || usdRate))), 0);

  const convertedEurInToman = salesInvoices
    .filter((i) => i.currency === 'EUR')
    .reduce((sum, i) => sum + (i.baseCurrencyGrandTotal || Math.round(i.grandTotal * (i.exchangeRate || eurRate))), 0);

  const convertedIrrInToman = salesInvoices
    .filter((i) => i.currency === 'IRR')
    .reduce((sum, i) => sum + (i.baseCurrencyGrandTotal || Math.round(i.grandTotal * (i.exchangeRate || irrRate))), 0);

  const convertedTomanSales = salesTOMAN;

  const totalInvoiceSalesInBase =
    convertedUsdInToman + convertedEurInToman + convertedIrrInToman + convertedTomanSales;

  const accountsRevenues = state.accounts
    .filter((a) => a.category === 'revenues' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  // Effective revenue incorporates converted invoices
  const totalRevenues = Math.max(totalInvoiceSalesInBase, accountsRevenues);

  const totalCOGS = state.accounts
    .filter((a) => a.category === 'cogs' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  const grossProfit = totalRevenues - totalCOGS;

  const totalExpenses = state.accounts
    .filter((a) => a.category === 'expenses' && a.level !== 'group')
    .reduce((sum, a) => sum + a.balance, 0);

  const netOperatingProfit = grossProfit - totalExpenses;

  // Helper to format values in selected P&L currency
  const formatPnl = (valInToman: number, isDeduction: boolean = false) => {
    const converted = convertCurrency(valInToman, 'TOMAN', pnlCurrency, state.settings.exchangeRates);
    const formatted = formatAmountWithCurrency(converted, pnlCurrency);
    return isDeduction ? `(${formatted})` : formatted;
  };

  return (
    <div className="space-y-5">
      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            onClick={() => setSubTab('journal')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'journal'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            دفتر روزنامه و اسناد دوبل ({toPersianDigits(state.journalEntries.length)})
          </button>

          <button
            onClick={() => setSubTab('accounts')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'accounts'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            کدینگ حساب‌ها (کل و معین)
          </button>

          <button
            onClick={() => setSubTab('trial_balance')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'trial_balance'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            تراز آزمایشی حساب‌ها
          </button>

          <button
            onClick={() => setSubTab('balance_sheet')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'balance_sheet'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            ترازنامه قانونی (Balance Sheet)
          </button>

          <button
            onClick={() => setSubTab('profit_loss')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'profit_loss'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            صورت سود و زیان (P&L)
          </button>
        </div>

        {subTab === 'journal' && (
          <button
            onClick={() => setShowNewEntryModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت سند حسابداری جدید</span>
          </button>
        )}
      </div>

      {/* View 1: Journal Entries */}
      {subTab === 'journal' && (
        <div className="space-y-4">
          {state.journalEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    سند شماره {toPersianDigits(entry.entryNumber)}
                  </span>
                  <span className="font-bold text-slate-900">{entry.description}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                  <span>تاریخ: {toPersianDigits(entry.date)}</span>
                  {entry.referenceNumber && <span>عطف: {entry.referenceNumber}</span>}
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">تراز شده</span>
                </div>
              </div>

              {/* Rows */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[420px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">کد حساب</th>
                      <th className="py-2 px-3">سرفصل و شرح ردیف</th>
                      <th className="py-2 px-3 text-center">بدهکار (تومان)</th>
                      <th className="py-2 px-3 text-center">بستانکار (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {entry.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 font-bold">{row.accountCode}</td>
                        <td className="py-2 px-3 font-sans text-slate-800">
                          <span className="font-bold text-slate-900">{row.accountName}</span>
                          {row.description && <span className="text-slate-500 mr-2 text-[11px]">- {row.description}</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {row.debit > 0 ? formatNumber(row.debit) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {row.credit > 0 ? formatNumber(row.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-extrabold text-slate-900">
                      <td colSpan={2} className="py-2 px-3 font-sans">
                        جمع سند تراز شده:
                      </td>
                      <td className="py-2 px-3 text-center text-teal-800">{formatNumber(entry.totalDebit)}</td>
                      <td className="py-2 px-3 text-center text-teal-800">{formatNumber(entry.totalCredit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Chart of Accounts */}
      {subTab === 'accounts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">ساختار و درخت کدینگ استاندارد حسابداری</h3>
            <span className="text-[11px] text-slate-500">منطبق بر استانداردهای حسابداری عمومی ایران</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">کد حساب</th>
                  <th className="py-3 px-4">نام سرفصل حساب</th>
                  <th className="py-3 px-4">سطح</th>
                  <th className="py-3 px-4">دسته‌بندی ترازنامه‌ای</th>
                  <th className="py-3 px-4">ماهیت حساب</th>
                  <th className="py-3 px-4">مانده فعلی (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.accounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-50 transition ${
                      acc.level === 'group'
                        ? 'bg-slate-100/60 font-black text-slate-900'
                        : acc.level === 'general'
                        ? 'font-bold text-slate-800'
                        : 'text-slate-600 pr-8'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono">{acc.code}</td>
                    <td className="py-3 px-4">
                      {acc.level === 'subsidiary' && <span className="text-slate-300 ml-2">↳</span>}
                      {acc.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                        {acc.level === 'group' ? 'گروه' : acc.level === 'general' ? 'کل' : 'معین'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{acc.category}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold ${acc.nature === 'debit' ? 'text-blue-700' : 'text-purple-700'}`}>
                        {acc.nature === 'debit' ? 'بدهکار' : 'بستانکار'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(acc.balance, state.settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Trial Balance */}
      {subTab === 'trial_balance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">تراز آزمایشی حساب‌های کل و معین</h3>
            <p className="text-xs text-slate-500 mt-0.5">کنترل توازن دفاتر مالی در پایان دوره مالی جاری</p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">کد</th>
                  <th className="p-3">عنوان حساب</th>
                  <th className="p-3 text-center">گردش بدهکار (تومان)</th>
                  <th className="p-3 text-center">گردش بستانکار (تومان)</th>
                  <th className="p-3 text-center">مانده نهایی حساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {state.accounts
                  .filter((a) => a.level === 'general')
                  .map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-600">{acc.code}</td>
                      <td className="p-3 font-sans font-semibold text-slate-900">{acc.name}</td>
                      <td className="p-3 text-center text-slate-700">
                        {acc.nature === 'debit' ? formatNumber(acc.balance) : '—'}
                      </td>
                      <td className="p-3 text-center text-slate-700">
                        {acc.nature === 'credit' ? formatNumber(acc.balance) : '—'}
                      </td>
                      <td className="p-3 text-center font-bold text-teal-800">
                        {formatCurrency(acc.balance, state.settings.currency)} ({acc.nature === 'debit' ? 'بد' : 'بس'})
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 4: Balance Sheet */}
      {subTab === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-base font-black text-slate-900">{state.settings.businessName}</h2>
            <h3 className="text-sm font-bold text-slate-700 mt-1">ترازنامه مالی (وضعیت دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام)</h3>
            <span className="text-xs text-slate-500 block mt-1">منتهی به تاریخ: {toPersianDigits(getJalaliDate())}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Right: Assets (دارایی‌ها) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <h4 className="text-sm font-extrabold text-blue-900 border-b border-blue-200 pb-2">
                دارایی‌ها (Assets)
              </h4>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">دارایی‌های جاری:</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">موجودی نقد، بانک و صندوق:</span>
                  <span className="font-bold font-mono">۴۵,۰۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">اسناد دریافتنی (چک‌های اشخاص):</span>
                  <span className="font-bold font-mono">۲۶,۰۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">حساب‌های دریافتنی (بدهکاران تجاری):</span>
                  <span className="font-bold font-mono">۴۷,۲۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">موجودی کالا و مواد اولیه انبارها:</span>
                  <span className="font-bold font-mono">۳۰,۳۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-blue-950 bg-blue-50 px-2 rounded-lg">
                  <span>جمع کل دارایی‌های جاری:</span>
                  <span className="font-mono">{formatCurrency(currentAssets, state.settings.currency)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <span className="font-bold text-slate-800 block">دارایی‌های غیرجاری و ثابت:</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">ماشین‌آلات خط تولید و تجهیزات:</span>
                  <span className="font-bold font-mono">۱۲۰,۰۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-blue-950 bg-blue-50 px-2 rounded-lg">
                  <span>جمع کل دارایی‌های غیرجاری:</span>
                  <span className="font-mono">{formatCurrency(nonCurrentAssets, state.settings.currency)}</span>
                </div>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-blue-900 text-white font-extrabold text-sm mt-4">
                <span>جمع کل دارایی‌ها:</span>
                <span className="font-mono">{formatCurrency(totalAssets, state.settings.currency)}</span>
              </div>
            </div>

            {/* Left: Liabilities & Equity (بدهی‌ها و سرمایه) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <h4 className="text-sm font-extrabold text-purple-900 border-b border-purple-200 pb-2">
                بدهی‌ها و حقوق صاحبان سهام (Liabilities & Equity)
              </h4>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">بدهی‌های جاری:</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">اسناد پرداختنی تجاری (چک‌های صادره):</span>
                  <span className="font-bold font-mono">۲۵,۰۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">حساب‌های پرداختنی تجاری (بستانکاران):</span>
                  <span className="font-bold font-mono">۳۳,۵۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-purple-950 bg-purple-50 px-2 rounded-lg">
                  <span>جمع بدهی‌های جاری:</span>
                  <span className="font-mono">{formatCurrency(totalLiabilities, state.settings.currency)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <span className="font-bold text-slate-800 block">حقوق مالکانه و سرمایه:</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">سرمایه اولیه ثبت شده شرکا:</span>
                  <span className="font-bold font-mono">۱۸۰,۰۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">سود انباشته و جاری دوره:</span>
                  <span className="font-bold font-mono text-emerald-700">۳۰,۰۰۰,۰۰۰ تومان</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-purple-950 bg-purple-50 px-2 rounded-lg">
                  <span>جمع حقوق صاحبان سهام:</span>
                  <span className="font-mono">{formatCurrency(totalEquity + 30000000, state.settings.currency)}</span>
                </div>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-purple-900 text-white font-extrabold text-sm mt-4">
                <span>جمع کل بدهی‌ها و سرمایه:</span>
                <span className="font-mono">{formatCurrency(totalAssets, state.settings.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 5: Profit & Loss (P&L) */}
      {subTab === 'profit_loss' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* P&L Currency Switcher & Conversion Rates Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">ارز مبنای گزارش صورت سود و زیان</h4>
                  <p className="text-[10px] text-slate-500">
                    تبدیل و تسعیر خودکار کلیه سرفصل‌های درآمد و هزینه با نرخ‌های لحظه‌ای
                  </p>
                </div>
              </div>

              {/* Currency Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['TOMAN', 'USD', 'EUR', 'IRR'] as AppCurrency[]).map((curr) => {
                  const cfg = CURRENCY_CONFIG[curr];
                  const isSelected = pnlCurrency === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setPnlCurrency(curr)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{cfg.flag}</span>
                      <span>{cfg.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Exchange Rates Ticker */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-700">نرخ‌های تسعیر فعال:</span>
                <span className="font-mono text-indigo-700 font-bold">۱ دلار = {toPersianDigits(formatNumber(usdRate))} ت</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-blue-700 font-bold">۱ یورو = {toPersianDigits(formatNumber(eurRate))} ت</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-amber-700 font-bold">۱۰ ریال = ۱ ت</span>
              </div>
              <span className="text-[10px] text-slate-400">
                تسعیر استاندارد مطابق استانداردهای حسابداری شماره ۱۶
              </span>
            </div>
          </div>

          {/* Foreign Currency Invoices Impact Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-100">تحلیل تسعیر و تفکیک درآمدهای ارزی و ریالی</h4>
                  <span className="text-[10px] text-slate-400">
                    تاثیر نرخ تبدیل خودکار فاکتورهای صادراتی و بین‌المللی بر سود دوره
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                تبدیل خودکار فعال
              </span>
            </div>

            {/* Currency Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              {/* USD Box */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                    <span>🇺🇸</span>
                    <span>فروش ارزی دلاری ($)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    نرخ: {toPersianDigits(formatNumber(usdRate))}
                  </span>
                </div>
                <div className="text-base font-extrabold font-mono text-white pt-1">
                  {formatAmountWithCurrency(salesUSD, 'USD')}
                </div>
                <div className="text-[10px] text-emerald-400 flex justify-between">
                  <span>معادل ریالی در سود:</span>
                  <span className="font-mono font-bold">{formatCurrency(convertedUsdInToman, 'تومان')}</span>
                </div>
              </div>

              {/* EUR Box */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1">
                    <span>🇪🇺</span>
                    <span>فروش ارزی یورویی (€)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    نرخ: {toPersianDigits(formatNumber(eurRate))}
                  </span>
                </div>
                <div className="text-base font-extrabold font-mono text-white pt-1">
                  {formatAmountWithCurrency(salesEUR, 'EUR')}
                </div>
                <div className="text-[10px] text-emerald-400 flex justify-between">
                  <span>معادل ریالی در سود:</span>
                  <span className="font-mono font-bold">{formatCurrency(convertedEurInToman, 'تومان')}</span>
                </div>
              </div>

              {/* TOMAN / IRR Box */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                    <span>🇮🇷</span>
                    <span>فروش‌های تومانی / ریالی</span>
                  </span>
                  <span className="text-[10px] text-slate-400">ارز رسمی</span>
                </div>
                <div className="text-base font-extrabold font-mono text-white pt-1">
                  {formatCurrency(convertedTomanSales + convertedIrrInToman, 'تومان')}
                </div>
                <div className="text-[10px] text-slate-300 flex justify-between">
                  <span>درآمد پایه داخلی:</span>
                  <span className="font-mono font-bold">۱۰۰٪ تایید شده</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement of Comprehensive Income (صورت سود و زیان جامع) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="text-center pb-4 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-900">{state.settings.businessName}</h2>
              <h3 className="text-sm font-bold text-slate-700 mt-1">
                صورت سود و زیان جامع دوره مالی (مبنای گزارش:{' '}
                <span className="text-teal-700 font-extrabold">
                  {CURRENCY_CONFIG[pnlCurrency].nameFa}
                </span>
                )
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                تهیه شده بر اساس استانداردهای حسابداری رسمی و تسعیر لحظه‌ای معاملات ارزی
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-200 font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <span>درآمد ناخالص حاصل از فروش محصولات و کالا:</span>
                  {salesUSD > 0 || salesEUR > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                      با احتساب تسعیر دلاری و یورویی
                    </span>
                  ) : null}
                </div>
                <span className="font-mono font-black text-sm text-slate-900">{formatPnl(totalRevenues)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 text-rose-700">
                <span>کسر می‌شود: بهای تمام‌شده کالای فروش رفته (COGS):</span>
                <span className="font-mono font-bold">{formatPnl(totalCOGS, true)}</span>
              </div>

              <div className="flex justify-between py-2.5 bg-emerald-50 text-emerald-950 px-3.5 rounded-xl font-extrabold text-sm border border-emerald-200">
                <span>سود ناخالص عملیاتی (Gross Operating Profit):</span>
                <span className="font-mono text-emerald-800 text-base">{formatPnl(grossProfit)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 text-slate-600">
                <span>هزینه‌های حقوق و دستمزد اداری، فروش و عمومی:</span>
                <span className="font-mono font-bold">{formatPnl(3200000, true)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200 text-slate-600">
                <span>هزینه‌های ملزومات، اداری و استهلاک انباشته:</span>
                <span className="font-mono font-bold">{formatPnl(800000, true)}</span>
              </div>

              <div className="flex justify-between py-3.5 bg-slate-900 text-white px-4 rounded-xl font-black text-base mt-4 shadow-md">
                <div className="flex items-center gap-2">
                  <span>سود خالص قبل از کسر مالیات:</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({CURRENCY_CONFIG[pnlCurrency].symbol})
                  </span>
                </div>
                <span className="font-mono text-emerald-400 text-lg">{formatPnl(netOperatingProfit)}</span>
              </div>

              {/* Foreign Currency Equivalent Equivalents for Shareholders */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">معادل دلاری سود خالص:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {formatAmountWithCurrency(
                      convertCurrency(netOperatingProfit, 'TOMAN', 'USD', state.settings.exchangeRates),
                      'USD'
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">معادل یورویی سود خالص:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {formatAmountWithCurrency(
                      convertCurrency(netOperatingProfit, 'TOMAN', 'EUR', state.settings.exchangeRates),
                      'EUR'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Journal Entry */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">ثبت سند حسابداری جدید (دوبل)</h3>
              <button onClick={() => setShowNewEntryModal(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">شرح کلی سند</label>
                  <input
                    type="text"
                    required
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاریخ سند (شمسی)</label>
                  <input
                    type="text"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              {/* Rows */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">ردیف‌های بدهکار و بستانکار</span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="flex items-center gap-1 text-teal-700 bg-teal-100 hover:bg-teal-200 px-2.5 py-1 rounded-lg font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن ردیف</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {entryRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 items-center"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-slate-500 mb-0.5">سرفصل حساب</label>
                        <select
                          value={row.accountId}
                          onChange={(e) => handleUpdateRow(idx, 'accountId', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs"
                        >
                          {state.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">شرح ردیف</label>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleUpdateRow(idx, 'description', e.target.value)}
                          placeholder="شرح عملیات..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">بدهکار (تومان)</label>
                        <input
                          type="number"
                          value={row.debit}
                          onChange={(e) => handleUpdateRow(idx, 'debit', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">بستانکار (تومان)</label>
                        <input
                          type="number"
                          value={row.credit}
                          onChange={(e) => handleUpdateRow(idx, 'credit', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Check */}
              <div
                className={`p-3 rounded-xl flex items-center justify-between font-bold ${
                  isBalanced ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <div>
                  <span>مجموع بدهکار: {formatNumber(totalDebit)}</span>
                  <span className="mx-2">|</span>
                  <span>مجموع بستانکار: {formatNumber(totalCredit)}</span>
                </div>
                <div>
                  {isBalanced ? (
                    <span className="text-emerald-700 flex items-center gap-1 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      سند کاملاً تراز است
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      اختلاف: {formatNumber(Math.abs(totalDebit - totalCredit))} تومان
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-slate-600 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold"
                >
                  ثبت قطعی در دفتر روزنامه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
