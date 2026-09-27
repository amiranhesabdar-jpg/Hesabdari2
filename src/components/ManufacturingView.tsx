import React, { useState } from 'react';
import {
  Factory,
  Boxes,
  Layers,
  Plus,
  Play,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  X,
  Trash2,
  Cpu,
  Hammer,
} from 'lucide-react';
import { AppState, BOM, BOMItem, ProductionOrder } from '../types';
import { formatCurrency, formatNumber, toPersianDigits, getJalaliDate, generateId } from '../utils/persian';

interface ManufacturingViewProps {
  state: AppState;
  onSaveBOM: (bom: BOM) => void;
  onSaveProductionOrder: (order: ProductionOrder) => void;
  isCreateOrderModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const ManufacturingView: React.FC<ManufacturingViewProps> = ({
  state,
  onSaveBOM,
  onSaveProductionOrder,
  isCreateOrderModalOpen = false,
  onCloseCreateModal,
}) => {
  const [subTab, setSubTab] = useState<'boms' | 'orders' | 'costing'>('boms');
  const [showNewBOMModal, setShowNewBOMModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(isCreateOrderModalOpen);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(state.boms[0] || null);

  // Sync prop modal
  React.useEffect(() => {
    if (isCreateOrderModalOpen) {
      setShowNewOrderModal(true);
    }
  }, [isCreateOrderModalOpen]);

  // Production Order Modal State
  const [selectedBomIdForOrder, setSelectedBomIdForOrder] = useState(state.boms[0]?.id || '');
  const [orderPlannedQty, setOrderPlannedQty] = useState(5);
  const [orderStartDate, setOrderStartDate] = useState(getJalaliDate());

  // BOM Creator Modal State
  const finishedGoods = state.products.filter((p) => p.type === 'finished_good');
  const rawMaterials = state.products.filter((p) => p.type === 'raw_material');

  const [newBomName, setNewBomName] = useState('');
  const [newBomFinishedGoodId, setNewBomFinishedGoodId] = useState(finishedGoods[0]?.id || '');
  const [newBomItems, setNewBomItems] = useState<BOMItem[]>([
    {
      rawMaterialId: rawMaterials[0]?.id || '',
      rawMaterialName: rawMaterials[0]?.name || '',
      quantity: 1,
      unit: rawMaterials[0]?.unit || 'کیلوگرم',
      unitCost: rawMaterials[0]?.buyPrice || 10000,
      totalCost: rawMaterials[0]?.buyPrice || 10000,
    },
  ]);
  const [newBomDirectLabor, setNewBomDirectLabor] = useState(150000);
  const [newBomOverhead, setNewBomOverhead] = useState(75000);

  // BOM Creator calculations
  const totalDirectMaterialCost = newBomItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const totalBomUnitCost = totalDirectMaterialCost + Number(newBomDirectLabor || 0) + Number(newBomOverhead || 0);

  const handleAddBOMItem = () => {
    const mat = rawMaterials[0];
    if (!mat) return;
    setNewBomItems([
      ...newBomItems,
      {
        rawMaterialId: mat.id,
        rawMaterialName: mat.name,
        quantity: 1,
        unit: mat.unit,
        unitCost: mat.buyPrice,
        totalCost: mat.buyPrice,
      },
    ]);
  };

  const handleUpdateBOMItem = (index: number, field: keyof BOMItem, value: any) => {
    const updated = [...newBomItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'rawMaterialId') {
      const mat = rawMaterials.find((m) => m.id === value);
      if (mat) {
        item.rawMaterialName = mat.name;
        item.unit = mat.unit;
        item.unitCost = mat.buyPrice;
      }
    }
    item.totalCost = Number(item.quantity || 0) * Number(item.unitCost || 0);
    updated[index] = item;
    setNewBomItems(updated);
  };

  const handleRemoveBOMItem = (index: number) => {
    if (newBomItems.length <= 1) return;
    setNewBomItems(newBomItems.filter((_, i) => i !== index));
  };

  const handleSubmitBOM = (e: React.FormEvent) => {
    e.preventDefault();
    const fg = finishedGoods.find((p) => p.id === newBomFinishedGoodId);
    if (!fg) return;

    const newBOM: BOM = {
      id: generateId('BOM'),
      code: `BOM-${Date.now().toString().slice(-4)}`,
      name: newBomName || `فرمول ساخت ${fg.name}`,
      finishedGoodId: fg.id,
      finishedGoodName: fg.name,
      outputQuantity: 1,
      items: newBomItems,
      directLaborCost: Number(newBomDirectLabor),
      overheadCost: Number(newBomOverhead),
      totalDirectMaterialCost,
      totalCost: totalBomUnitCost,
      unitCost: totalBomUnitCost,
      notes: 'استاندارد کنترل کیفیت QC کارخانه',
    };

    onSaveBOM(newBOM);
    setShowNewBOMModal(false);
  };

  const handleCreateProductionOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const bom = state.boms.find((b) => b.id === selectedBomIdForOrder);
    if (!bom) return;

    const newOrder: ProductionOrder = {
      id: generateId('PRD-ORD'),
      orderNumber: `PRD-${Date.now().toString().slice(-5)}`,
      bomId: bom.id,
      finishedGoodId: bom.finishedGoodId,
      finishedGoodName: bom.finishedGoodName,
      plannedQuantity: Number(orderPlannedQty),
      actualQuantity: Number(orderPlannedQty),
      status: 'completed', // Immediately execute and update stocks + auto double entry journal!
      startDate: orderStartDate,
      endDate: orderStartDate,
      totalCost: bom.unitCost * Number(orderPlannedQty),
      unitCost: bom.unitCost,
    };

    onSaveProductionOrder(newOrder);
    setShowNewOrderModal(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  return (
    <div className="space-y-5">
      {/* Sub Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            onClick={() => setSubTab('boms')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'boms'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>فرمولاسیون ساخت و BOM</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
              {toPersianDigits(state.boms.length)}
            </span>
          </button>

          <button
            onClick={() => setSubTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'orders'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>دستورات تولید کارخانه</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
              {toPersianDigits(state.productionOrders.length)}
            </span>
          </button>

          <button
            onClick={() => setSubTab('costing')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              subTab === 'costing'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>آنالیز بهای تمام‌شده (COGM)</span>
          </button>
        </div>

        <div className="w-full sm:w-auto">
          {subTab === 'boms' && (
            <button
              id="btn-add-bom"
              onClick={() => setShowNewBOMModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف فرمول ساخت جدید (BOM)</span>
            </button>
          )}

          {subTab === 'orders' && (
            <button
              id="btn-add-production-order"
              onClick={() => setShowNewOrderModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              <span>صدور دستور تولید جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* View 1: BOM List & Detailed Inspector */}
      {subTab === 'boms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 1 Col: List of BOMs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
              لیست فرمول‌های تعریف شده
            </h3>
            <div className="space-y-2">
              {state.boms.map((bom) => (
                <div
                  key={bom.id}
                  onClick={() => setSelectedBOM(bom)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                    selectedBOM?.id === bom.id
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{bom.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{bom.code}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">محصول: {bom.finishedGoodName}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-500">بهای هر دستگاه:</span>
                    <span className="font-bold text-amber-800">
                      {formatCurrency(bom.unitCost, state.settings.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 2 Cols: BOM Detail Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            {selectedBOM ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedBOM.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      محصول خروجی: <strong>{selectedBOM.finishedGoodName}</strong> (تیراژ پایه: {selectedBOM.outputQuantity} عدد)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBomIdForOrder(selectedBOM.id);
                      setShowNewOrderModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>تولید این محصول</span>
                  </button>
                </div>

                {/* Ingredients table */}
                <h4 className="text-xs font-bold text-slate-700">۱. مواد اولیه مصرفی مستقیم (Direct Materials)</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">ماده اولیه</th>
                        <th className="py-2.5 px-3">مقدار مصرف</th>
                        <th className="py-2.5 px-3">نرخ واحد خرید</th>
                        <th className="py-2.5 px-3">بهای مصرفی کل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBOM.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{item.rawMaterialName}</td>
                          <td className="py-2 px-3 font-mono">
                            {toPersianDigits(item.quantity)} {item.unit}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">{formatNumber(item.unitCost)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {formatCurrency(item.totalCost, state.settings.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Labor & Overhead Split */}
                <h4 className="text-xs font-bold text-slate-700 mt-4">۲. دستمزد مستقیم و سربار ساخت</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Hammer className="w-4 h-4 text-amber-700" />
                      <span>دستمزد مستقیم نیروی کار خط تولید:</span>
                    </div>
                    <span className="font-bold font-mono text-amber-950">
                      {formatCurrency(selectedBOM.directLaborCost, state.settings.currency)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Cpu className="w-4 h-4 text-slate-600" />
                      <span>هزینه‌های سربار ساخت (برق، استهلاک):</span>
                    </div>
                    <span className="font-bold font-mono text-slate-950">
                      {formatCurrency(selectedBOM.overheadCost, state.settings.currency)}
                    </span>
                  </div>
                </div>

                {/* Final Cost summary box */}
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div>
                    <span className="text-xs text-slate-400">بهای تمام‌شده هر واحد محصول نهایی (COGM):</span>
                    <h4 className="text-xl font-extrabold text-amber-400">
                      {formatCurrency(selectedBOM.unitCost, state.settings.currency)}
                    </h4>
                  </div>
                  <div className="text-left text-xs text-slate-300">
                    <span className="block">حاشیه سود نسبت به قیمت فروش:</span>
                    {(() => {
                      const prod = state.products.find((p) => p.id === selectedBOM.finishedGoodId);
                      if (prod && prod.sellPrice) {
                        const profit = prod.sellPrice - selectedBOM.unitCost;
                        const margin = Math.round((profit / prod.sellPrice) * 100);
                        return (
                          <span className="font-bold text-emerald-400 text-sm">
                            +{formatCurrency(profit, state.settings.currency)} ({toPersianDigits(margin)}٪ سود ناخالص)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">یک فرمول ساخت را انتخاب کنید.</p>
            )}
          </div>
        </div>
      )}

      {/* View 2: Production Orders */}
      {subTab === 'orders' && (
        <div className="space-y-3">
          {/* Mobile View: Production Order Cards (< md screens) */}
          <div className="md:hidden space-y-3">
            {state.productionOrders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{ord.finishedGoodName}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {ord.orderNumber}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3 h-3" />
                    تکمیل ساخت
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 block">تیراژ تولید:</span>
                    <span className="font-mono font-bold text-amber-800">
                      {formatNumber(ord.actualQuantity || ord.plannedQuantity)} دستگاه
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">بهای هر واحد:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(ord.unitCost, state.settings.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">مجموع بهای تمام‌شده:</span>
                  <span className="font-extrabold text-sm text-slate-900 font-mono">
                    {formatCurrency(ord.totalCost, state.settings.currency)}
                  </span>
                </div>

                {ord.journalEntryId && (
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center justify-between font-mono">
                    <span>سند دفتر روزنامه:</span>
                    <span className="font-bold">{ord.journalEntryId} (صادر شد)</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop View: Production Orders Table (>= md screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">شماره دستور</th>
                    <th className="py-3 px-4">محصول تولیدی</th>
                    <th className="py-3 px-4">تیراژ تولید</th>
                    <th className="py-3 px-4">تاریخ شروع / پایان</th>
                    <th className="py-3 px-4">هزینه واحد (COGM)</th>
                    <th className="py-3 px-4">بهای تمام‌شده کل</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">سند حسابداری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.productionOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ord.orderNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{ord.finishedGoodName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-800">
                        {formatNumber(ord.actualQuantity || ord.plannedQuantity)} دستگاه
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{toPersianDigits(ord.startDate)}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {formatCurrency(ord.unitCost, state.settings.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {formatCurrency(ord.totalCost, state.settings.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          تکمیل و ثبت در انبار
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {ord.journalEntryId ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {ord.journalEntryId} (صادر شد)
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Costing & Accounting Breakdown */}
      {subTab === 'costing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              اصول حسابداری صنعتی و ثبت سند اتوماتیک بهای تمام‌شده
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            در سیستم حسابداری امیران، با صدور هر دستور تولید و کلیک روی پایان ساخت:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">۱. کسر خودکار مواد اولیه</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                تمام مواد اولیه قید شده در فرمول BOM به نسبت تیراژ تولید، بلافاصله از کاردکس انبار مواد کسر می‌گردند.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">۲. ورود محصول به انبار محصول</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                کالای ساخته شده با بهای تمام‌شده دقیق (COGM) محاسبه شده، به موجودی انبار محصول نهایی اضافه می‌شود.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">۳. صدور سند دوبل در دفتر روزنامه</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                سند حسابداری چهار ردیفه شامل بدهکار شدن موجودی محصول و بستانکار شدن کنترل مواد، دستمزد و سربار صادر می‌شود.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Production Order */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">صدور دستور تولید در خط کارخانه</h3>
              </div>
              <button
                onClick={() => {
                  setShowNewOrderModal(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="text-slate-400 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductionOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">انتخاب فرمول ساخت (BOM)</label>
                <select
                  value={selectedBomIdForOrder}
                  onChange={(e) => setSelectedBomIdForOrder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                >
                  {state.boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (بهای واحد: {formatCurrency(b.unitCost, state.settings.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">تیراژ تولید (تعداد دستگاه)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={orderPlannedQty}
                  onChange={(e) => setOrderPlannedQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">تاریخ شروع و ثبت تولید (شمسی)</label>
                <input
                  type="text"
                  value={orderStartDate}
                  onChange={(e) => setOrderStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>

              {/* Cost Preview */}
              {(() => {
                const b = state.boms.find((item) => item.id === selectedBomIdForOrder);
                if (!b) return null;
                const total = b.unitCost * orderPlannedQty;
                return (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span>بهای تمام‌شده هر واحد:</span>
                      <span className="font-bold">{formatCurrency(b.unitCost, state.settings.currency)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-amber-900 pt-1 border-t border-amber-200">
                      <span>کل بهای این دستور تولید:</span>
                      <span>{formatCurrency(total, state.settings.currency)}</span>
                    </div>
                    <span className="text-[10px] text-amber-700 block mt-1">
                      * مواد اولیه بر اساس BOM از انبار کسر و سند حسابداری صادر خواهد شد.
                    </span>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewOrderModal(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-slate-600 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/20"
                >
                  تایید و شروع تولید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New BOM Creation */}
      {showNewBOMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">تعریف فرمول ساخت جدید (BOM)</h3>
              </div>
              <button onClick={() => setShowNewBOMModal(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBOM} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">عنوان فرمول ساخت</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فرمول ساخت باکس صنعتی تیپ A"
                    value={newBomName}
                    onChange={(e) => setNewBomName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">محصول ساخته‌شده خروجی</label>
                  <select
                    value={newBomFinishedGoodId}
                    onChange={(e) => setNewBomFinishedGoodId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    {finishedGoods.map((fg) => (
                      <option key={fg.id} value={fg.id}>
                        {fg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items in BOM */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">مواد اولیه مصرفی برای یک واحد محصول</span>
                  <button
                    type="button"
                    onClick={handleAddBOMItem}
                    className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن ماده اولیه</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newBomItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 items-center"
                    >
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-slate-500 mb-0.5">ماده اولیه</label>
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => handleUpdateBOMItem(idx, 'rawMaterialId', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs"
                        >
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({formatNumber(m.buyPrice)} تومان)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">مقدار مصرف ({item.unit})</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateBOMItem(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">هزینه ردیف (تومان)</label>
                        <span className="font-mono text-slate-900 block pt-1.5 font-bold">
                          {formatNumber(item.totalCost)}
                        </span>
                      </div>

                      <div className="sm:col-span-1 flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveBOMItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Labor & Overhead input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">هزینه دستمزد مستقیم هر واحد (تومان)</label>
                  <input
                    type="number"
                    value={newBomDirectLabor}
                    onChange={(e) => setNewBomDirectLabor(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">هزینه سربار ساخت هر واحد (تومان)</label>
                  <input
                    type="number"
                    value={newBomOverhead}
                    onChange={(e) => setNewBomOverhead(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <span className="font-bold text-amber-900">کل بهای تمام‌شده برآوردی یک واحد (COGM):</span>
                <span className="text-base font-extrabold text-amber-950 font-mono">
                  {formatCurrency(totalBomUnitCost, state.settings.currency)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBOMModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-slate-600 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  ذخیره فرمول ساخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
