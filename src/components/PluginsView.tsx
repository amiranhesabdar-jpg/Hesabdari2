import React, { useState } from 'react';
import {
  Puzzle,
  Power,
  Settings,
  Download,
  Plus,
  CheckCircle2,
  ExternalLink,
  Code,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AppState, Plugin } from '../types';
import { generateId } from '../utils/persian';

interface PluginsViewProps {
  state: AppState;
  onTogglePlugin: (pluginId: string, enabled: boolean) => void;
  onInstallPlugin: (plugin: Plugin) => void;
}

export const PluginsView: React.FC<PluginsViewProps> = ({ state, onTogglePlugin, onInstallPlugin }) => {
  const [filter, setFilter] = useState<'all' | 'installed' | 'store'>('all');
  const [showCustomPluginModal, setShowCustomPluginModal] = useState(false);
  const [selectedPluginConfig, setSelectedPluginConfig] = useState<Plugin | null>(null);

  // Available Store Plugins
  const storePlugins: Plugin[] = [
    {
      id: 'PLG-PAYROLL',
      name: 'افزونه حقوق و دستمزد و ثبت پرسنل',
      description: 'محاسبه کارکرد، بیمه تامین اجتماعی، مالیات بر حقوق و صدور فیش حقوقی استاندارد.',
      version: '1.2.0',
      author: 'امیران سیستم',
      category: 'مالی و اداری',
      enabled: false,
      installed: false,
      icon: 'users',
      config: { autoJournal: true },
    },
    {
      id: 'PLG-BARCODE',
      name: 'افزونه چاپ لیبل بارکد و بارکدخوان بی‌سیم',
      description: 'پشتیبانی از انواع بارکدخوان‌های دوبعدی و چاپگرهای حرارتی لیبل انبارداری.',
      version: '2.0.1',
      author: 'سخت‌افزار پارس',
      category: 'سخت‌افزار و انبار',
      enabled: false,
      installed: false,
      icon: 'barcode',
    },
    {
      id: 'PLG-DIGIKALA',
      name: 'افزونه اتصال به پنل فروشندگان دیجی‌کالا',
      description: 'همگام‌سازی لحظه‌ای موجودی انبار با پنل سلر دیجی‌کالا و ثبت فاکتورهای فروش.',
      version: '1.0.4',
      author: 'مارکت‌پلیس وب',
      category: 'یکپارچه‌سازی وب',
      enabled: false,
      installed: false,
      icon: 'shopping-bag',
    },
  ];

  // Custom Plugin Form
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState('افزونه اختصاصی');
  const [customApiUrl, setCustomApiUrl] = useState('');

  const handleInstallCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newPlugin: Plugin = {
      id: generateId('PLG-CUSTOM'),
      name: customName,
      description: customDesc || 'افزونه توسعه‌یافته سفارشی با وب‌سرویس اختصاصی',
      version: '1.0.0',
      author: 'توسعه‌دهنده سازمان',
      category: customCategory,
      enabled: true,
      installed: true,
      icon: 'puzzle',
      config: { webhookUrl: customApiUrl },
    };

    onInstallPlugin(newPlugin);
    setShowCustomPluginModal(false);
    setCustomName('');
    setCustomDesc('');
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            همه افزونه‌ها
          </button>
          <button
            onClick={() => setFilter('installed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'installed'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            نصب‌شده ({state.plugins.length})
          </button>
          <button
            onClick={() => setFilter('store')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'store'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            فروشگاه افزونه‌ها
          </button>
        </div>

        <button
          onClick={() => setShowCustomPluginModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن افزونه اختصاصی جدید</span>
        </button>
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Installed Plugins */}
        {(filter === 'all' || filter === 'installed') &&
          state.plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition ${
                plugin.enabled ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-200 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        plugin.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {plugin.enabled ? 'فعال' : 'غیرفعال'}
                    </span>
                    <button
                      onClick={() => onTogglePlugin(plugin.id, !plugin.enabled)}
                      className={`p-1.5 rounded-lg transition ${
                        plugin.enabled
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={plugin.enabled ? 'غیرفعال کردن افزونه' : 'فعال‌سازی افزونه'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{plugin.name}</h3>
                <span className="inline-block text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md mt-1">
                  {plugin.category} | نگارش {plugin.version}
                </span>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{plugin.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>سازنده: {plugin.author}</span>
                <button
                  onClick={() => setSelectedPluginConfig(plugin)}
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>پیکربندی</span>
                </button>
              </div>
            </div>
          ))}

        {/* Store Plugins */}
        {(filter === 'all' || filter === 'store') &&
          storePlugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    موجود در مخزن
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{plugin.name}</h3>
                <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
                  {plugin.category} | نگارش {plugin.version}
                </span>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{plugin.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">سازنده: {plugin.author}</span>
                <button
                  onClick={() => onInstallPlugin({ ...plugin, installed: true, enabled: true })}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl font-bold transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>نصب روی سیستم</span>
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal: Custom Plugin Creation */}
      {showCustomPluginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">نصب و اتصال افزونه اختصاصی</h3>
              </div>
              <button onClick={() => setShowCustomPluginModal(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInstallCustom} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">نام افزونه</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: افزونه هوشمند اتصال به CRM سفارشی"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">دسته‌بندی یا موضوع</label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">آدرس وب‌هوک یا اندپوینت API افزونه</label>
                <input
                  type="url"
                  placeholder="https://my-domain.com/api/accounting-hook"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">توضیحات عملکرد افزونه</label>
                <textarea
                  rows={3}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="توضیح دهید این افزونه چه قابلیتی را مدیریت می‌کند..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomPluginModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-slate-600 font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                >
                  ثبت و فعال‌سازی افزونه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Plugin Config Details */}
      {selectedPluginConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">تنظیمات افزونه: {selectedPluginConfig.name}</h3>
              <button onClick={() => setSelectedPluginConfig(null)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">{selectedPluginConfig.description}</p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                <span className="block text-[10px] text-slate-400 font-sans mb-1">پارامترهای پیکربندی JSON:</span>
                {JSON.stringify(selectedPluginConfig.config || {}, null, 2)}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedPluginConfig(null)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
