import React from 'react';
import {
  TrendingUp,
  Package,
  Factory,
  Wallet,
  AlertTriangle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  FileText,
  Boxes,
} from 'lucide-react';
import { AppState } from '../types';
import { formatCurrency, formatNumber, toPersianDigits } from '../utils/persian';

interface DashboardViewProps {
  state: AppState;
  onNavigate: (tab: any) => void;
  onNewInvoice: () => void;
  onNewProduction: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onNavigate,
  onNewInvoice,
  onNewProduction,
}) => {
  // Multi-Currency Converted Calculations
  const totalSales = state.invoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + (i.baseCurrencyGrandTotal || (i.grandTotal * (i.exchangeRate || 1))), 0);

  const totalReceived = state.invoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + (i.baseCurrencyPaidAmount || (i.paidAmount * (i.exchangeRate || 1))), 0);

  const totalReceivables = state.invoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + (i.baseCurrencyRemainingAmount || (i.remainingAmount * (i.exchangeRate || 1))), 0);

  // Cash & Bank balance from chart of accounts
  const cashAndBank = state.accounts
    .filter((a) => a.parentId === 'ACC-101' || a.id === 'ACC-101')
    .reduce((sum, a) => sum + (a.level === 'subsidiary' ? a.balance : 0), 0) || 45000000;

  // Inventory valuation
  const inventoryValue = state.products.reduce((sum, p) => {
    const cost = p.buyPrice || p.sellPrice * 0.7;
    return sum + p.stock * cost;
  }, 0);

  // Low stock products
  const lowStockProducts = state.products.filter((p) => p.stock <= p.minStockAlert);

  // Completed production orders
  const completedOrders = state.productionOrders.filter((o) => o.status === 'completed');
  const totalProducedUnits = completedOrders.reduce((sum, o) => sum + (o.actualQuantity || o.plannedQuantity), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-semibold text-emerald-300">سیستم مدیریت مالی و تولیدی فعال</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{state.settings.businessName}</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            سیستم ابری حسابداری یکپارچه: پوشش کامل فرآیندهای فرمولاسیون تولید (BOM)، انبارداری چندگانه، فاکتورهای بازرگانی، اسناد دوبل مالی و اتصال وب‌سرویس.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-quick-new-invoice"
            onClick={onNewInvoice}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-700/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>فاکتور فروش جدید</span>
          </button>

          <button
            id="btn-quick-new-production"
            onClick={onNewProduction}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-amber-700/30"
          >
            <Factory className="w-4 h-4" />
            <span>دستور تولید جدید</span>
          </button>

          <button
            id="btn-quick-backup-migrate"
            onClick={() => onNavigate('backup_analyzer')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-700/30"
          >
            <span>انتقال بکاپ سپیدار/هلو</span>
          </button>

          <button
            id="btn-quick-export"
            onClick={() => onNavigate('desktop_export')}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium transition border border-slate-600"
          >
            <span>خروجی ویندوز</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">مجموع فروش دوره‌ای</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900">
              {formatCurrency(totalSales, state.settings.currency)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>تسویه‌شده: {formatCurrency(totalReceived, state.settings.currency)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Receivables / Debtors */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">مطالبات و بدهکاران تجاری</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900">
              {formatCurrency(totalReceivables, state.settings.currency)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
              <span>{toPersianDigits(state.contacts.filter((c) => c.currentBalance > 0).length)} طرف‌حساب بدهکار</span>
            </div>
          </div>
        </div>

        {/* Card 3: Inventory Valuation */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ارزش موجودی انبارها</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900">
              {formatCurrency(inventoryValue, state.settings.currency)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-600 font-medium">
              <span>{toPersianDigits(state.products.length)} قلم کالا و ماده اولیه</span>
            </div>
          </div>
        </div>

        {/* Card 4: Manufacturing Production Output */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">تیراژ تولیدات کارخانه</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900">
              {formatNumber(totalProducedUnits)} <span className="text-xs font-normal text-slate-500">دستگاه</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{toPersianDigits(state.boms.length)} فرمول ساخت استاندارد (BOM)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Manufacturing vs Trading Split & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Invoices & Commercial Flow */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">آخرین فاکتورهای صادر شده</h2>
            </div>
            <button
              onClick={() => onNavigate('commercial')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              مشاهده همه فاکتورها &larr;
            </button>
          </div>

          {/* Mobile View: Cards */}
          <div className="sm:hidden space-y-2.5">
            {state.invoices.slice(0, 5).map((inv) => (
              <div
                key={inv.id}
                onClick={() => onNavigate('commercial')}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 active:bg-slate-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-slate-800">{inv.invoiceNumber}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        inv.type === 'sales' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {inv.type === 'sales' ? 'فروش' : 'خرید'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{toPersianDigits(inv.date)}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="font-medium text-slate-900 truncate max-w-[150px]">{inv.contactName}</span>
                  <span className="font-extrabold text-emerald-700 font-mono">
                    {formatCurrency(inv.grandTotal, state.settings.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      inv.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.paymentStatus === 'partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {inv.paymentStatus === 'paid'
                      ? 'تسویه کامل'
                      : inv.paymentStatus === 'partial'
                      ? 'تسویه ناقص'
                      : 'پرداخت نشده'}
                  </span>
                  <span className="text-[10px] text-slate-400">لمس جهت جزئیات &larr;</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">شماره فاکتور</th>
                  <th className="py-2.5 px-3">نوع</th>
                  <th className="py-2.5 px-3">طرف‌حساب</th>
                  <th className="py-2.5 px-3">تاریخ</th>
                  <th className="py-2.5 px-3">مبلغ کل</th>
                  <th className="py-2.5 px-3">وضعیت تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-medium text-slate-800">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        inv.type === 'sales' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {inv.type === 'sales' ? 'فروش' : 'خرید'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{inv.contactName}</td>
                    <td className="py-3 px-3 text-slate-500">{toPersianDigits(inv.date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal, state.settings.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.paymentStatus === 'paid' ? 'تسویه کامل' : inv.paymentStatus === 'partial' ? 'تسویه ناقص' : 'پرداخت نشده'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Production Orders & Low Stock Alerts */}
        <div className="space-y-4">
          {/* Low Stock Warning Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>هشدار کسری انبار (نقطه سفارش)</span>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {toPersianDigits(lowStockProducts.length)} مورد
              </span>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">تمام اقلام بالاتر از حداقل موجودی هستند.</p>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">{p.name}</p>
                      <span className="text-[10px] text-slate-500">حداقل مجاز: {formatNumber(p.minStockAlert)} {p.unit}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-[11px] border border-rose-200">
                        {formatNumber(p.stock)} {p.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Production Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold">
                <Factory className="w-4 h-4 text-amber-600" />
                <span>وضعیت سفارش‌های تولید کارخانه</span>
              </div>
              <button
                onClick={() => onNavigate('manufacturing')}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-medium"
              >
                مدیریت خط تولید &larr;
              </button>
            </div>

            <div className="space-y-2.5">
              {state.productionOrders.map((ord) => (
                <div key={ord.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{ord.finishedGoodName}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      تکمیل شده
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>شماره دستور: {ord.orderNumber}</span>
                    <span>تیراژ: {formatNumber(ord.actualQuantity || ord.plannedQuantity)} عدد</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">بهای تمام‌شده هر واحد (COGM):</span>
                    <span className="font-bold text-slate-900">{formatCurrency(ord.unitCost, state.settings.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
