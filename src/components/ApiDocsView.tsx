import React, { useState } from 'react';
import {
  Code,
  Key,
  Copy,
  Check,
  Send,
  Globe,
  Database,
  Terminal,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AppState } from '../types';

interface ApiDocsViewProps {
  state: AppState;
}

export const ApiDocsView: React.FC<ApiDocsViewProps> = ({ state }) => {
  const [apiKey, setApiKey] = useState('amiran_live_sec_8921df3489e1a7b88');
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('get_products');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [codeLang, setCodeLang] = useState<'curl' | 'python' | 'javascript'>('python');

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateNewKey = () => {
    const newKey = `amiran_live_sec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    setApiKey(newKey);
  };

  const endpoints = [
    {
      id: 'get_products',
      title: 'دریافت موجودی و قیمت کالاها (انبارها)',
      method: 'GET',
      path: '/api/v1/products',
      description: 'مناسب برای همگام‌سازی کاتالوگ، استعلام لحظه‌ای موجودی انبار در سایت یا اپلیکیشن فروشگاهی.',
      sampleBody: null,
    },
    {
      id: 'post_invoice',
      title: 'ثبت خودکار فاکتور فروش از وب‌سایت',
      method: 'POST',
      path: '/api/v1/invoices',
      description: 'ثبت خودکار سفارش مشتری در حسابداری، کسر موجودی از انبار و صدور سند بدهکار/بستانکار.',
      sampleBody: JSON.stringify(
        {
          contactName: 'مشتری وب‌سایت (وردپرس)',
          date: '1403/07/02',
          items: [
            {
              productId: 'PRD-01',
              quantity: 2,
              unitPrice: 3800000,
              discount: 0,
            },
          ],
          paidAmount: 7600000,
          notes: 'پرداخت شده از درگاه بانکی سامان سایت',
        },
        null,
        2
      ),
    },
    {
      id: 'get_contacts',
      title: 'استعلام مشتریان و مانده حساب بدهکاران',
      method: 'GET',
      path: '/api/v1/contacts',
      description: 'دریافت پرونده مالی مشتریان جهت نمایش در پنل کاربری یا سامانه CRM سازمان.',
      sampleBody: null,
    },
    {
      id: 'get_reports',
      title: 'گزارش خلاصه وضعیت مالی و سود (داشبورد)',
      method: 'GET',
      path: '/api/v1/reports/summary',
      description: 'دریافت ارقام کلیدی فروش، بهای تمام‌شده، موجودی نقد و انبار برای داشبوردهای هوش تجاری (BI).',
      sampleBody: null,
    },
  ];

  const currentEp = endpoints.find((e) => e.id === selectedEndpoint) || endpoints[0];

  const handleTestApi = async () => {
    setIsLoading(true);
    setTestResponse(null);
    try {
      let res;
      if (currentEp.method === 'GET') {
        res = await fetch(currentEp.path);
      } else {
        res = await fetch(currentEp.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: currentEp.sampleBody || '{}',
        });
      }
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: 'خطا در اتصال به وب‌سرویس', message: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const getSnippet = () => {
    const origin = window.location.origin;
    const url = `${origin}${currentEp.path}`;

    if (codeLang === 'python') {
      if (currentEp.method === 'GET') {
        return `import requests

url = "${url}"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print("نتایج دریافتی از امیران سیستم:", data)`;
      } else {
        return `import requests

url = "${url}"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
payload = ${currentEp.sampleBody}

response = requests.post(url, json=payload, headers=headers)
print("کد وضعیت:", response.status_code)
print("پاسخ سرور:", response.json())`;
      }
    } else if (codeLang === 'javascript') {
      if (currentEp.method === 'GET') {
        return `const response = await fetch("${url}", {
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Accept": "application/json"
  }
});
const data = await response.json();
console.log("پاسخ حسابداری:", data);`;
      } else {
        return `const response = await fetch("${url}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${currentEp.sampleBody})
});
const result = await response.json();
console.log("فاکتور ثبت شد:", result);`;
      }
    } else {
      // cURL
      if (currentEp.method === 'GET') {
        return `curl -X GET "${url}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Accept: application/json"`;
      } else {
        return `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${currentEp.sampleBody?.replace(/\n/g, '')}'`;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">مرکز اتصال وب‌سرویس و API یکپارچه</h2>
              <p className="text-xs text-slate-500">اتصال وب‌سایت، فروشگاه اینترنتی و سایر نرم‌افزارهای سازمان به سیستم حسابداری</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gateway فعال روی پورت ۳۰۰۰
            </span>
          </div>
        </div>

        {/* API Key management */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Key className="w-4 h-4 text-sky-600" />
              <span>کلید اختصاصی دسترسی امن (Secret API Key):</span>
            </div>
            <div className="font-mono text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 select-all">
              {apiKey}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
            >
              {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey ? 'کپی شد' : 'کپی کلید'}</span>
            </button>
            <button
              onClick={handleGenerateNewKey}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تولید کلید جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Documentation & Test Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Endpoints List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
            اندپوینت‌های استاندارد REST
          </h3>
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                onClick={() => {
                  setSelectedEndpoint(ep.id);
                  setTestResponse(null);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                  selectedEndpoint === ep.id
                    ? 'border-sky-500 bg-sky-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      ep.method === 'GET'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 font-bold">{ep.path}</span>
                </div>
                <p className="font-semibold text-slate-900 text-xs mt-1">{ep.title}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{ep.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Cols: Code Snippet & Live Runner */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                    currentEp.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {currentEp.method}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">{currentEp.path}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{currentEp.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{currentEp.description}</p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCodeLang('python')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  codeLang === 'python' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Python 🐍
              </button>
              <button
                onClick={() => setCodeLang('javascript')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  codeLang === 'javascript' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                JS / Node
              </button>
              <button
                onClick={() => setCodeLang('curl')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  codeLang === 'curl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                cURL
              </button>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-200">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700 text-xs">
              <span className="font-mono text-[11px] text-slate-400">کد نمونه جهت استفاده در برنامه شما</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getSnippet());
                  alert('کد در کلیپ‌بورد کپی شد.');
                }}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>کپی کد</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed dir-ltr text-left">
              {getSnippet()}
            </pre>
          </div>

          {/* Test Endpoint Action */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">تست زنده وب‌سرویس روی سرور فعلی:</span>
              <button
                onClick={handleTestApi}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLoading ? 'در حال ارسال درخواست...' : 'ارسال درخواست آزمایشی'}</span>
              </button>
            </div>

            {/* Test Response output */}
            {testResponse && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">پاسخ دریافتی زنده سرور (JSON Response 200 OK):</span>
                </div>
                <pre className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] font-mono overflow-x-auto text-slate-800 dir-ltr text-left max-h-60">
                  {testResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
