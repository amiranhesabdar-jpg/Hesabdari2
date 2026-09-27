import React, { useState } from 'react';
import {
  Package,
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  Layers,
  Edit2,
  X,
  CheckCircle,
} from 'lucide-react';
import { AppState, Product, ProductType } from '../types';
import { formatCurrency, formatNumber, toPersianDigits, generateId } from '../utils/persian';

interface InventoryViewProps {
  state: AppState;
  onSaveProduct: (product: Product) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ state, onSaveProduct }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<'all' | 'materials' | 'finished' | 'commercial'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);

  // New Product Form State
  const [newProductName, setNewProductName] = useState('');
  const [newProductCode, setNewProductCode] = useState('');
  const [newProductType, setNewProductType] = useState<ProductType>('commercial_good');
  const [newProductUnit, setNewProductUnit] = useState('عدد');
  const [newProductBuyPrice, setNewProductBuyPrice] = useState(100000);
  const [newProductSellPrice, setNewProductSellPrice] = useState(140000);
  const [newProductStock, setNewProductStock] = useState(10);
  const [newProductMinStock, setNewProductMinStock] = useState(3);
  const [newProductCategory, setNewProductCategory] = useState('عمومی');
  const [newProductBarcode, setNewProductBarcode] = useState('');

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    let warehouse: 'materials' | 'finished' | 'commercial' = 'commercial';
    if (newProductType === 'raw_material') warehouse = 'materials';
    else if (newProductType === 'finished_good') warehouse = 'finished';

    const newProd: Product = {
      id: generateId('PRD'),
      code: newProductCode || `PRD-${Date.now().toString().slice(-4)}`,
      name: newProductName,
      type: newProductType,
      unit: newProductUnit,
      buyPrice: Number(newProductBuyPrice),
      sellPrice: Number(newProductSellPrice),
      stock: Number(newProductStock),
      minStockAlert: Number(newProductMinStock),
      warehouse,
      category: newProductCategory,
      barcode: newProductBarcode || `626${Date.now().toString().slice(-9)}`,
    };

    onSaveProduct(newProd);
    setShowProductModal(false);
    setNewProductName('');
    setNewProductCode('');
  };

  const handleApplyAdjustment = () => {
    if (!adjustingProduct) return;
    const updated: Product = {
      ...adjustingProduct,
      stock: Math.max(0, adjustingProduct.stock + adjustQuantity),
    };
    onSaveProduct(updated);
    setAdjustingProduct(null);
    setAdjustQuantity(0);
  };

  // Filter products
  const filteredProducts = state.products.filter((p) => {
    const matchesWarehouse = selectedWarehouse === 'all' || p.warehouse === selectedWarehouse;
    const matchesSearch =
      p.name.includes(searchQuery) ||
      p.code.includes(searchQuery) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      p.category.includes(searchQuery);
    return matchesWarehouse && matchesSearch;
  });

  // Calculate totals
  const totalValue = filteredProducts.reduce((sum, p) => sum + p.stock * p.buyPrice, 0);

  return (
    <div className="space-y-5">
      {/* Top Warehouse Switcher & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            onClick={() => setSelectedWarehouse('all')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              selectedWarehouse === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            همه انبارها ({toPersianDigits(state.products.length)})
          </button>

          <button
            onClick={() => setSelectedWarehouse('materials')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              selectedWarehouse === 'materials'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            انبار مواد اولیه (تولیدی)
          </button>

          <button
            onClick={() => setSelectedWarehouse('finished')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              selectedWarehouse === 'finished'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            انبار محصولات ساخته‌شده
          </button>

          <button
            onClick={() => setSelectedWarehouse('commercial')}
            className={`px-3.5 py-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${
              selectedWarehouse === 'commercial'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            انبار کالاهای بازرگانی
          </button>
        </div>

        <button
          onClick={() => setShowProductModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف کالا / ماده اولیه جدید</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام کالا، کد، بارکد یا گروه..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs focus:outline-hidden focus:border-indigo-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 w-full sm:w-auto flex justify-between sm:justify-start gap-4">
          <span>ارزش دفتری اقلام فیلترشده:</span>
          <strong className="text-indigo-900 font-bold">{formatCurrency(totalValue, state.settings.currency)}</strong>
        </div>
      </div>

      {/* Products & Inventory List / Table */}
      <div className="space-y-3">
        {/* Mobile View: Product Cards (< md screens) */}
        <div className="md:hidden space-y-3">
          {filteredProducts.map((p) => {
            const isLow = p.stock <= p.minStockAlert;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                      {p.type === 'raw_material'
                        ? 'ماده اولیه'
                        : p.type === 'finished_good'
                        ? 'محصول نهایی'
                        : 'کالای بازرگانی'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{p.code}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 block">موجودی فعلی:</span>
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {formatNumber(p.stock)} {p.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">قیمت فروش:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {p.sellPrice > 0 ? formatCurrency(p.sellPrice, state.settings.currency) : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3 h-3" />
                        کسری انبار (حداقل: {formatNumber(p.minStockAlert)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        موجودی کافی
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setAdjustingProduct(p);
                      setAdjustQuantity(0);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition min-h-[38px]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعدیل موجودی</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Table (>= md screens) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">کد و بارکد</th>
                  <th className="py-3 px-4">نام کالا / ماده</th>
                  <th className="py-3 px-4">نوع ماهیت</th>
                  <th className="py-3 px-4">انبار مستقر</th>
                  <th className="py-3 px-4">موجودی فعلی</th>
                  <th className="py-3 px-4">حداقل مجاز (هشدار)</th>
                  <th className="py-3 px-4">بهای خرید / تمام‌شده</th>
                  <th className="py-3 px-4">قیمت فروش</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-4 text-center">تعدیل موجودی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        <div>{p.code}</div>
                        {p.barcode && <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.name}
                        <span className="block text-[10px] font-normal text-slate-500">{p.category}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                          {p.type === 'raw_material'
                            ? 'ماده اولیه'
                            : p.type === 'finished_good'
                            ? 'محصول نهایی'
                            : 'کالای بازرگانی'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.warehouse === 'materials'
                          ? 'انبار مواد اولیه'
                          : p.warehouse === 'finished'
                          ? 'انبار محصول'
                          : 'انبار بازرگانی'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                        {formatNumber(p.stock)} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {formatNumber(p.minStockAlert)} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {formatCurrency(p.buyPrice, state.settings.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                        {p.sellPrice > 0 ? formatCurrency(p.sellPrice, state.settings.currency) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            کسری انبار
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            موجود
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustQuantity(0);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="انبارگردانی و اصلاح موجودی"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: New Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">تعریف کالای جدید در سیستم انبار</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">نام کامل کالا یا ماده اولیه</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: موتور تک‌فاز ۱.۵ اسب موتوژن"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع ماهیت کالا</label>
                  <select
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="commercial_good">کالای بازرگانی (خرید و فروش)</option>
                    <option value="raw_material">ماده اولیه تولید (انبار مواد)</option>
                    <option value="finished_good">محصول تولیدی نهایی</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">واحد سنجش</label>
                  <input
                    type="text"
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                    placeholder="عدد، کیلوگرم، متر، حلقه..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">قیمت خرید یا بهای تمام‌شده (تومان)</label>
                  <input
                    type="number"
                    value={newProductBuyPrice}
                    onChange={(e) => setNewProductBuyPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">قیمت فروش مصوب (تومان)</label>
                  <input
                    type="number"
                    value={newProductSellPrice}
                    onChange={(e) => setNewProductSellPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">موجودی اولیه در انبار</label>
                  <input
                    type="number"
                    value={newProductStock}
                    onChange={(e) => setNewProductStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">حداقل مجاز (نقطه سفارش هشدار)</label>
                  <input
                    type="number"
                    value={newProductMinStock}
                    onChange={(e) => setNewProductMinStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">دسته‌بندی / گروه کالا</label>
                  <input
                    type="text"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">بارکد یا کد استاندارد</label>
                  <input
                    type="text"
                    value={newProductBarcode}
                    onChange={(e) => setNewProductBarcode(e.target.value)}
                    placeholder="مثال: 626001002001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-slate-600 font-medium"
                >
                  انصراف
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                  ثبت در انبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Stock */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-right">
            <h3 className="text-sm font-bold text-slate-900 mb-2">تعدیل موجودی و انبارگردانی</h3>
            <p className="text-xs text-slate-600 mb-4">{adjustingProduct.name}</p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                <span>موجودی فعلی سیستم:</span>
                <span className="font-bold">
                  {formatNumber(adjustingProduct.stock)} {adjustingProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  میزان تغییر (مثبت برای ورود، منفی برای کسر):
                </label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                />
              </div>

              <div className="flex justify-between py-1 bg-slate-50 p-2 rounded-lg font-bold text-slate-900">
                <span>موجودی نهایی پس از ثبت:</span>
                <span>
                  {formatNumber(adjustingProduct.stock + adjustQuantity)} {adjustingProduct.unit}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleApplyAdjustment}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  ثبت اصلاحیه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
