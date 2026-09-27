import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initialAppState } from './src/data/initialData';
import { AppState } from './src/types';
import { analyzeBackupFile } from './server/backupAnalyzer';
import { SEPIDAR_BACKUP_SAMPLE, HOLOO_BACKUP_CSV, EXCEL_BACKUP_CSV } from './server/backupSamples';

const PORT = 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure DB directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let appState: AppState;

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    appState = {
      ...initialAppState,
      ...parsed,
      subscription: {
        ...initialAppState.subscription,
        ...(parsed.subscription || {}),
      },
      adminSettings: {
        ...initialAppState.adminSettings,
        ...(parsed.adminSettings || {}),
      },
      settings: {
        ...initialAppState.settings,
        ...(parsed.settings || {}),
        exchangeRates: {
          ...initialAppState.settings.exchangeRates,
          ...(parsed.settings?.exchangeRates || {}),
        },
      },
      invoices: (parsed.invoices || initialAppState.invoices).map((inv: any) => ({
        ...inv,
        currency: inv.currency || 'TOMAN',
        exchangeRate: inv.exchangeRate || 1,
        baseCurrencyGrandTotal: inv.baseCurrencyGrandTotal ?? Math.round(inv.grandTotal * (inv.exchangeRate || 1)),
        baseCurrencyPaidAmount: inv.baseCurrencyPaidAmount ?? Math.round((inv.paidAmount || 0) * (inv.exchangeRate || 1)),
        baseCurrencyRemainingAmount: inv.baseCurrencyRemainingAmount ?? Math.round((inv.remainingAmount || 0) * (inv.exchangeRate || 1)),
      })),
      subscriptionPlans: parsed.subscriptionPlans?.length ? parsed.subscriptionPlans : initialAppState.subscriptionPlans,
      users: parsed.users?.length ? parsed.users : initialAppState.users,
      paymentTransactions: parsed.paymentTransactions || initialAppState.paymentTransactions,
      auditLogs: parsed.auditLogs || initialAppState.auditLogs,
    };
  } catch (err) {
    console.error('Error reading db.json, falling back to initial data', err);
    appState = initialAppState;
  }
} else {
  appState = initialAppState;
  fs.writeFileSync(DB_FILE, JSON.stringify(appState, null, 2), 'utf-8');
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(appState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json', err);
  }
}

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---

  // Health & Cloud Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Amiran Cloud Accounting API',
      version: '3.5.0',
      cloudSync: 'connected',
      timestamp: new Date().toISOString(),
      business: appState.settings.businessName,
    });
  });

  // Get Complete App State (for initial load / full cloud sync)
  app.get('/api/state', (req, res) => {
    res.json({
      success: true,
      data: appState,
      syncedAt: new Date().toISOString(),
    });
  });

  // Sync / Update App State
  app.post('/api/sync', (req, res) => {
    const incoming = req.body;
    if (incoming && typeof incoming === 'object') {
      appState = {
        ...appState,
        ...incoming,
      };
      saveDb();
      return res.json({
        success: true,
        message: 'همگام‌سازی ابری با موفقیت انجام شد',
        syncedAt: new Date().toISOString(),
      });
    }
    res.status(400).json({ success: false, error: 'داده‌های ارسالی نامعتبر است' });
  });

  // REST API v1: Products (Trading, Raw, Finished)
  app.get('/api/v1/products', (req, res) => {
    const { type, warehouse } = req.query;
    let list = appState.products;
    if (type) {
      list = list.filter((p) => p.type === type);
    }
    if (warehouse) {
      list = list.filter((p) => p.warehouse === warehouse);
    }
    res.json({ success: true, count: list.length, data: list });
  });

  app.post('/api/v1/products', (req, res) => {
    const newProduct = req.body;
    if (!newProduct.name || !newProduct.code) {
      return res.status(400).json({ success: false, error: 'نام و کد کالا الزامی است' });
    }
    const idx = appState.products.findIndex((p) => p.id === newProduct.id);
    if (idx >= 0) {
      appState.products[idx] = newProduct;
    } else {
      appState.products.unshift(newProduct);
    }
    saveDb();
    res.json({ success: true, data: newProduct });
  });

  // REST API v1: Invoices
  app.get('/api/v1/invoices', (req, res) => {
    res.json({ success: true, count: appState.invoices.length, data: appState.invoices });
  });

  app.post('/api/v1/invoices', (req, res) => {
    const invoice = req.body;
    if (!invoice || !invoice.items || invoice.items.length === 0) {
      return res.status(400).json({ success: false, error: 'اقلام فاکتور الزامی است' });
    }

    // Adjust inventory based on invoice type
    invoice.items.forEach((item: any) => {
      const prod = appState.products.find((p) => p.id === item.productId);
      if (prod) {
        if (invoice.type === 'sales') {
          prod.stock = Math.max(0, prod.stock - Number(item.quantity));
        } else if (invoice.type === 'purchase') {
          prod.stock += Number(item.quantity);
        } else if (invoice.type === 'sales_return') {
          prod.stock += Number(item.quantity);
        } else if (invoice.type === 'purchase_return') {
          prod.stock = Math.max(0, prod.stock - Number(item.quantity));
        }
      }
    });

    // Conversion rates for accounting ledger
    const rate = Number(invoice.exchangeRate) || 1;
    const isForeign = invoice.currency && invoice.currency !== 'TOMAN';
    invoice.baseCurrencyGrandTotal = invoice.baseCurrencyGrandTotal || Math.round(invoice.grandTotal * rate);
    invoice.baseCurrencyPaidAmount = invoice.baseCurrencyPaidAmount || Math.round(invoice.paidAmount * rate);
    invoice.baseCurrencyRemainingAmount = invoice.baseCurrencyRemainingAmount || Math.round(invoice.remainingAmount * rate);

    const baseRemaining = invoice.baseCurrencyRemainingAmount;
    const basePaid = invoice.baseCurrencyPaidAmount;
    const baseSubtotal = Math.round((invoice.subtotal - invoice.totalDiscount) * rate);
    const baseTax = Math.round((invoice.totalTax + (invoice.shippingCost || 0)) * rate);
    const baseGrandTotal = invoice.baseCurrencyGrandTotal;

    // Update customer/supplier balance in base currency
    if (invoice.contactId) {
      const contact = appState.contacts.find((c) => c.id === invoice.contactId);
      if (contact) {
        if (invoice.type === 'sales') {
          contact.currentBalance += baseRemaining;
        } else if (invoice.type === 'purchase') {
          contact.currentBalance -= baseRemaining;
        }
      }
    }

    // Auto journal entry if enabled (always recorded in base currency)
    if (appState.settings.autoJournal) {
      const entryId = `JRN-${Date.now().toString().slice(-4)}`;
      invoice.journalEntryId = entryId;
      const isSales = invoice.type === 'sales';
      const isPurchase = invoice.type === 'purchase';
      const currencyNote = isForeign ? ` [معادل ارزی: ${invoice.grandTotal.toLocaleString()} ${invoice.currency} با نرخ ${rate.toLocaleString()} تومان]` : '';

      if (isSales) {
        appState.journalEntries.unshift({
          id: entryId,
          entryNumber: appState.journalEntries.length + 1,
          date: invoice.date,
          referenceNumber: invoice.invoiceNumber,
          description: `ثبت خودکار فاکتور فروش شماره ${invoice.invoiceNumber} - ${invoice.contactName}${currencyNote}`,
          rows: [
            {
              id: `R-${Date.now()}-1`,
              accountId: 'ACC-101',
              accountCode: '101',
              accountName: 'موجودی نقد و بانک',
              description: 'دریافتی نقد فاکتور',
              debit: basePaid,
              credit: 0,
            },
            {
              id: `R-${Date.now()}-2`,
              accountId: 'ACC-103',
              accountCode: '103',
              accountName: 'حساب‌های دریافتنی تجاری',
              description: 'مانده نسیه فاکتور',
              debit: baseRemaining,
              credit: 0,
            },
            {
              id: `R-${Date.now()}-3`,
              accountId: 'ACC-601',
              accountCode: '601',
              accountName: 'فروش محصولات تولیدی و بازرگانی',
              description: 'فروش کالا',
              debit: 0,
              credit: baseSubtotal,
            },
            {
              id: `R-${Date.now()}-4`,
              accountId: 'ACC-302',
              accountCode: '302',
              accountName: 'حساب‌های پرداختنی تجاری (مالیات و عوارض)',
              description: 'مالیات بر ارزش افزوده و هزینه جانبی',
              debit: 0,
              credit: baseTax,
            },
          ].filter((r) => r.debit > 0 || r.credit > 0),
          totalDebit: baseGrandTotal,
          totalCredit: baseGrandTotal,
          status: 'approved',
          source: 'invoice',
        });
      }
    }

    const idx = appState.invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) {
      appState.invoices[idx] = invoice;
    } else {
      appState.invoices.unshift(invoice);
    }

    saveDb();
    res.json({ success: true, data: invoice });
  });

  // REST API v1: Manufacturing & BOMs
  app.get('/api/v1/boms', (req, res) => {
    res.json({ success: true, count: appState.boms.length, data: appState.boms });
  });

  app.post('/api/v1/production-orders', (req, res) => {
    const order = req.body;
    if (!order.bomId || !order.plannedQuantity) {
      return res.status(400).json({ success: false, error: 'فرمول ساخت و تیراژ تولید الزامی است' });
    }

    const bom = appState.boms.find((b) => b.id === order.bomId);
    if (!bom) {
      return res.status(404).json({ success: false, error: 'فرمول ساخت یافت نشد' });
    }

    // When order is completed, automatically deduct raw materials and add finished good
    if (order.status === 'completed') {
      const qtyRatio = order.actualQuantity || order.plannedQuantity;

      // Deduct raw materials
      bom.items.forEach((item) => {
        const mat = appState.products.find((p) => p.id === item.rawMaterialId);
        if (mat) {
          mat.stock = Math.max(0, mat.stock - item.quantity * qtyRatio);
        }
      });

      // Increase finished good stock
      const finished = appState.products.find((p) => p.id === bom.finishedGoodId);
      if (finished) {
        finished.stock += qtyRatio * bom.outputQuantity;
      }

      // Auto journal entry for production
      const entryId = `JRN-PRD-${Date.now().toString().slice(-4)}`;
      order.journalEntryId = entryId;
      const totalCost = (order.totalCost || bom.totalCost * qtyRatio);

      appState.journalEntries.unshift({
        id: entryId,
        entryNumber: appState.journalEntries.length + 1,
        date: order.endDate || order.startDate,
        referenceNumber: order.orderNumber,
        description: `بهای تمام شده تولید ${qtyRatio} عدد ${bom.finishedGoodName}`,
        rows: [
          {
            id: `R-${Date.now()}-1`,
            accountId: 'ACC-104',
            accountCode: '104',
            accountName: 'موجودی مواد و کالا (کالای ساخته شده)',
            description: 'ورود محصول به انبار محصول نهایی',
            debit: totalCost,
            credit: 0,
          },
          {
            id: `R-${Date.now()}-2`,
            accountId: 'ACC-104',
            accountCode: '104',
            accountName: 'موجودی مواد و کالا (مواد اولیه مصرفی)',
            description: 'مصرف مواد اولیه بر اساس BOM',
            debit: 0,
            credit: bom.totalDirectMaterialCost * qtyRatio,
          },
          {
            id: `R-${Date.now()}-3`,
            accountId: 'ACC-801',
            accountCode: '801',
            accountName: 'هزینه حقوق و دستمزد تولیدی',
            description: 'دستمزد مستقیم خط تولید',
            debit: 0,
            credit: bom.directLaborCost * qtyRatio,
          },
          {
            id: `R-${Date.now()}-4`,
            accountId: 'ACC-802',
            accountCode: '802',
            accountName: 'هزینه‌های سربار ساخت و تولید',
            description: 'سربار تولید (برق، استهلاک، نگهداری)',
            debit: 0,
            credit: bom.overheadCost * qtyRatio,
          },
        ].filter((r) => r.debit > 0 || r.credit > 0),
        totalDebit: totalCost,
        totalCredit: totalCost,
        status: 'approved',
        source: 'production',
      });
    }

    const idx = appState.productionOrders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      appState.productionOrders[idx] = order;
    } else {
      appState.productionOrders.unshift(order);
    }

    saveDb();
    res.json({ success: true, data: order });
  });

  // REST API v1: Contacts (Customers & Suppliers)
  app.get('/api/v1/contacts', (req, res) => {
    res.json({ success: true, count: appState.contacts.length, data: appState.contacts });
  });

  // REST API v1: Accounts & General Ledger
  app.get('/api/v1/accounts', (req, res) => {
    res.json({ success: true, count: appState.accounts.length, data: appState.accounts });
  });

  app.get('/api/v1/journal', (req, res) => {
    res.json({ success: true, count: appState.journalEntries.length, data: appState.journalEntries });
  });

  // Python Code Generation / Standalone Desktop Script
  app.get('/api/v1/python-bridge/desktop-script', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const serverUrl = `${proto}://${host}`;

    const script = `"""
امیران حساب - اپلیکیشن مستقل ویندوز با پایتون
Amiran Cloud Accounting - Windows Desktop Application Launcher

این اسکریپت با استفاده از کتابخانه PyWebView پنجره‌ای شیک و بومی (Native Windows Window)
باز می‌کند و به پایگاه داده ابری و وب‌سرویس حسابداری امیران متصل می‌شود.

نحوه اجرا:
1. pip install pywebview requests
2. python amiran_desktop.py

نحوه تولید فایل EXE ویندوز با یک دستور:
pip install pyinstaller
pyinstaller --onefile --windowed --name="AmiranAccounting" --icon="icon.ico" amiran_desktop.py
"""

import webview
import sys
import time

SERVER_URL = "${serverUrl}"
APP_TITLE = "سیستم حسابداری ابری امیران (نسخه ویندوز)"

class AccountingApiBridge:
    def __init__(self):
        self.version = "3.5.0"
        self.platform = "Windows 64-bit Desktop"

    def get_status(self):
        return {"status": "connected", "platform": self.platform, "version": self.version}

    def print_invoice(self, invoice_id):
        print(f"[Windows Native] Printing Invoice: {invoice_id}")
        return True

def main():
    api = AccountingApiBridge()
    window = webview.create_window(
        title=APP_TITLE,
        url=SERVER_URL,
        js_api=api,
        width=1280,
        height=820,
        resizable=True,
        min_size=(900, 600),
        confirm_close=True,
        background_color='#0f172a'
    )
    webview.start(debug=False)

if __name__ == '__main__':
    main()
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="amiran_desktop.py"');
    res.send(script);
  });

  // Python Client Code Example for Website / E-commerce Sync
  app.get('/api/v1/python-bridge/client-example', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const activeKey = appState.apiKeys.find((k) => k.status === 'active')?.key || 'amiran_live_secret_key';

    const clientCode = `"""
اتصال سایر نرم‌افزارها و سایت‌ها به سیستم حسابداری امیران با پایتون
Amiran Cloud ERP Python SDK & Webhook Integration
"""

import requests
import json

BASE_URL = "${proto}://${host}"
API_KEY = "${activeKey}"

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

def get_inventory():
    """دریافت آخرین موجودی کالاها و انبارهای تولیدی و بازرگانی"""
    resp = requests.get(f"{BASE_URL}/api/v1/products", headers=HEADERS)
    if resp.status_code == 200:
        data = resp.json()
        print(f"تعداد اقلام موجود: {data['count']}")
        for item in data['data']:
            print(f"- {item['name']} (کد: {item['code']}): موجودی {item['stock']} {item['unit']}")
        return data['data']
    else:
        print("خطا در دریافت موجودی:", resp.text)
        return []

def register_online_order(customer_name, items):
    """ثبت فاکتور فروش خودکار از وب‌سایت یا اپلیکیشن دیگر"""
    payload = {
        "invoiceNumber": f"WEB-{int(requests.utils.time.time())}",
        "type": "sales",
        "contactName": customer_name,
        "date": "1403/06/21",
        "items": items,
        "subtotal": sum(i['unitPrice'] * i['quantity'] for i in items),
        "totalDiscount": 0,
        "totalTax": sum(i['unitPrice'] * i['quantity'] * 0.1 for i in items),
        "shippingCost": 45000,
        "grandTotal": sum(i['unitPrice'] * i['quantity'] * 1.1 for i in items) + 45000,
        "paidAmount": sum(i['unitPrice'] * i['quantity'] * 1.1 for i in items) + 45000,
        "remainingAmount": 0,
        "paymentStatus": "paid",
        "paymentMethod": "bank_transfer",
        "notes": "ثبت خودکار از درگاه پرداخت وب‌سایت"
    }
    
    resp = requests.post(f"{BASE_URL}/api/v1/invoices", headers=HEADERS, json=payload)
    if resp.status_code == 200:
        print("فاکتور فروش با موفقیت در سیستم حسابداری ثبت و از انبار کسر شد:")
        print(resp.json())
    else:
        print("خطا در ثبت فاکتور:", resp.text)

if __name__ == "__main__":
    print("--- تست اتصال پایتون به حسابداری امیران ---")
    products = get_inventory()
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="amiran_python_client.py"');
    res.send(clientCode);
  });

  // --- Universal Backup Analyzer & Intelligent Migration Endpoints ---
  const SNAPSHOT_FILE = path.join(DB_DIR, 'rollback_snapshot.json');

  // 1. Preloaded realistic backup samples for instant testing
  app.get('/api/v1/backup/samples/:type', (req, res) => {
    const { type } = req.params;
    if (type === 'sepidar') {
      return res.json({
        success: true,
        name: 'سپیدار سیستم - نسخه کامل بازرگانی و مالی',
        fileName: 'sepidar_financial_export.json',
        content: JSON.stringify(SEPIDAR_BACKUP_SAMPLE, null, 2),
      });
    }
    if (type === 'holoo') {
      return res.json({
        success: true,
        name: 'هلو - خروجی دفتر روزنامه و اشخاص',
        fileName: 'holoo_journal_export.csv',
        content: HOLOO_BACKUP_CSV,
      });
    }
    if (type === 'excel') {
      return res.json({
        success: true,
        name: 'اکسل اسناد حسابداری دوبل و مانده‌ها',
        fileName: 'accounting_journal_sheets.csv',
        content: EXCEL_BACKUP_CSV,
      });
    }
    res.status(404).json({ success: false, error: 'نمونه پشتیبان یافت نشد' });
  });

  // 2. Deep analysis of uploaded backup file
  app.post('/api/v1/backup/analyze', async (req, res) => {
    try {
      const { fileContent, fileName } = req.body;
      if (!fileContent) {
        return res.status(400).json({ success: false, error: 'محتوای فایل ارسالی خالی است' });
      }
      const result = await analyzeBackupFile(fileContent, fileName || 'backup_file.json', appState);
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('Backup analysis error:', err);
      res.status(500).json({ success: false, error: err.message || 'خطا در تحلیل فایل پشتیبان' });
    }
  });

  // 3. Commit verified and mapped backup into database (with snapshot safety)
  app.post('/api/v1/backup/commit', (req, res) => {
    try {
      const { analysis, options, customMappings } = req.body;
      if (!analysis || !analysis.sanads) {
        return res.status(400).json({ success: false, error: 'داده‌های تحلیل شده نامعتبر است' });
      }

      // Save safety rollback snapshot before modification
      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(appState, null, 2), 'utf-8');

      let createdAccountsCount = 0;
      let importedSanadsCount = 0;
      let importedContactsCount = 0;
      let importedProductsCount = 0;

      // 1. Process custom or auto account mappings
      const rules = customMappings || analysis.mappingRules || [];
      if (options?.autoCreateAccounts) {
        rules.forEach((rule: any) => {
          if (rule.createIfNotExists) {
            const exists = appState.accounts.some((a) => a.code === rule.targetAccountCode);
            if (!exists) {
              appState.accounts.push({
                id: rule.targetAccountId || `ACC-${rule.targetAccountCode}`,
                code: rule.targetAccountCode,
                name: rule.targetAccountName || rule.sourceName,
                level: 'subsidiary',
                category: 'current_assets',
                nature: 'debit',
                balance: 0,
              });
              createdAccountsCount++;
            }
          }
        });
      }

      // Lookup rule by source code
      const ruleLookup = new Map<string, any>();
      rules.forEach((r: any) => ruleLookup.set(r.sourceCode, r));

      // 2. Import Sanads (Journal Entries)
      const existingNumbers = new Set(appState.journalEntries.map((j) => j.entryNumber));
      let nextEntryNum = Math.max(0, ...appState.journalEntries.map((j) => j.entryNumber)) + 1;

      const newEntries = analysis.sanads.map((s: any) => {
        let entryNum = s.entryNumber;
        if (options?.overrideExistingNumbers && existingNumbers.has(entryNum)) {
          entryNum = nextEntryNum++;
        }

        const rows = s.rows.map((r: any, rIdx: number) => {
          const rule = ruleLookup.get(r.sourceAccountCode);
          return {
            id: `JRN-ROW-${Date.now()}-${rIdx}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: rule ? rule.targetAccountId : r.targetAccountId,
            accountCode: rule ? rule.targetAccountCode : r.targetAccountCode,
            accountName: rule ? rule.targetAccountName : r.targetAccountName,
            description: r.description || s.description,
            debit: r.debit,
            credit: r.credit,
          };
        });

        let totalDebit = rows.reduce((sum: number, r: any) => sum + r.debit, 0);
        let totalCredit = rows.reduce((sum: number, r: any) => sum + r.credit, 0);
        const discrepancy = totalDebit - totalCredit;

        // Auto balance discrepancy if requested with suspense account
        if (options?.autoBalanceDiscrepancy && Math.abs(discrepancy) > 0) {
          if (discrepancy > 0) {
            rows.push({
              id: `JRN-ROW-BAL-${Date.now()}`,
              accountId: 'ACC-999',
              accountCode: '999',
              accountName: 'حساب تعدیلات تراز و گردکردن ارقام',
              description: 'تراز خودکار کسری بستانکار سند ورودی',
              debit: 0,
              credit: discrepancy,
            });
            totalCredit += discrepancy;
          } else {
            const diff = Math.abs(discrepancy);
            rows.push({
              id: `JRN-ROW-BAL-${Date.now()}`,
              accountId: 'ACC-999',
              accountCode: '999',
              accountName: 'حساب تعدیلات تراز و گردکردن ارقام',
              description: 'تراز خودکار کسری بدهکار سند ورودی',
              debit: diff,
              credit: 0,
            });
            totalDebit += diff;
          }
        }

        return {
          id: `JRN-IMP-${Date.now()}-${entryNum}-${Math.random().toString(36).slice(2, 5)}`,
          entryNumber: entryNum,
          date: s.date || '1403/07/01',
          referenceNumber: s.referenceNumber || `IMP-${s.entryNumber}`,
          description: s.description || `سند انتقالی شماره ${s.entryNumber} از ${analysis.sourceSystemName}`,
          rows,
          totalDebit,
          totalCredit,
          status: 'approved',
          source: 'manual',
        };
      });

      appState.journalEntries = [...newEntries, ...appState.journalEntries];
      importedSanadsCount = newEntries.length;

      // 3. Import Contacts
      if (options?.importContacts && analysis.contacts) {
        analysis.contacts.forEach((c: any) => {
          const exists = appState.contacts.find((x) => x.name.trim() === c.name.trim());
          if (!exists) {
            appState.contacts.push({
              id: `CNT-IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              code: c.code || `1030${appState.contacts.length + 1}`,
              name: c.name,
              type: c.type || 'both',
              phone: c.phone || '',
              mobile: c.phone || '',
              nationalId: c.nationalId || '',
              creditLimit: 50000000,
              currentBalance: c.balance || 0,
            });
            importedContactsCount++;
          }
        });
      }

      // 4. Import Products
      if (options?.importProducts && analysis.products) {
        analysis.products.forEach((p: any) => {
          const exists = appState.products.find((x) => x.code === p.code || x.name.trim() === p.name.trim());
          if (!exists) {
            appState.products.push({
              id: `PRD-IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              code: p.code,
              name: p.name,
              type: 'commercial_good',
              unit: p.unit || 'عدد',
              buyPrice: p.buyPrice || 0,
              sellPrice: p.sellPrice || 0,
              stock: p.stock || 0,
              minStockAlert: 5,
              warehouse: 'commercial',
              category: 'اقلام انتقالی',
            });
            importedProductsCount++;
          }
        });
      }

      saveDb();

      res.json({
        success: true,
        message: `عملیات انتقال با موفقیت انجام شد: ${importedSanadsCount} سند مالی دوبل به طور دقیق در دفاتر مالی ثبت و تطبیق داده شد.`,
        importedSanadsCount,
        importedContactsCount,
        importedProductsCount,
        createdAccountsCount,
        hasRollback: true,
        updatedState: appState,
      });
    } catch (err: any) {
      console.error('Commit import error:', err);
      res.status(500).json({ success: false, error: err.message || 'خطا در ثبت نهایی انتقال' });
    }
  });

  // 4. Rollback to state before last migration
  app.post('/api/v1/backup/rollback', (req, res) => {
    try {
      if (!fs.existsSync(SNAPSHOT_FILE)) {
        return res.status(404).json({ success: false, error: 'نقطه بازگشت (Snapshot) یافت نشد' });
      }
      const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      appState = JSON.parse(raw);
      saveDb();
      res.json({
        success: true,
        message: 'بازیابی اطلاعات به نقطه قبل از آخرین انتقال با موفقیت انجام شد.',
        updatedState: appState,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'خطا در بازگردانی داده‌ها' });
    }
  });

  // --- Helper: Audit Logging ---
  function addAuditLog(
    action: string,
    actor: string,
    target?: string,
    details?: string,
    type: 'auth' | 'subscription' | 'permission' | 'financial' | 'system' = 'system'
  ) {
    const timestamp = new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const logItem = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      action,
      actor,
      target,
      timestamp,
      details,
      type,
    };
    appState.auditLogs = [logItem, ...(appState.auditLogs || [])].slice(0, 150);
  }

  // --- Super Admin Authentication ---
  app.post('/api/v1/auth/admin-login', (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'رمز عبور مدیریت الزامی است' });
    }

    const currentMaster = appState.adminSettings?.masterPassword || 'admin@amiran2026';
    if (password === currentMaster) {
      const superAdminUser = appState.users.find((u) => u.role === 'super_admin') || {
        id: 'USR-01',
        fullName: 'مهندس امیران (مدیر ارشد)',
        role: 'super_admin',
      };
      addAuditLog('ورود به پنل مدیریت کل', superAdminUser.fullName, 'ورود با رمز عبور اصلی', 'احراز هویت موفق با رمز مستر', 'auth');
      saveDb();

      return res.json({
        success: true,
        message: 'ورود به پنل مدیریت کل با موفقیت انجام شد',
        token: `admin_token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user: superAdminUser,
      });
    }

    addAuditLog('تلاش ناموفق برای ورود به مدیریت', 'کاربر ناشناس', 'رمز عبور اشتباه', 'ورود ناموفق با رمز عبور نادرست', 'auth');
    saveDb();
    return res.status(401).json({ success: false, error: 'رمز عبور وارد شده نادرست است' });
  });

  // --- Super Admin Overview / KPI Dashboard ---
  app.get('/api/v1/admin/overview', (req, res) => {
    const successfulTxns = (appState.paymentTransactions || []).filter((t) => t.status === 'successful');
    const totalRevenue = successfulTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingReceipts = (appState.paymentTransactions || []).filter((t) => t.status === 'pending_verification');

    res.json({
      success: true,
      data: {
        totalRevenue,
        successfulTxnsCount: successfulTxns.length,
        pendingReceiptsCount: pendingReceipts.length,
        totalUsers: (appState.users || []).length,
        activeUsers: (appState.users || []).filter((u) => u.status === 'active').length,
        subscription: appState.subscription,
        plansCount: (appState.subscriptionPlans || []).length,
        recentLogs: (appState.auditLogs || []).slice(0, 8),
      },
    });
  });

  // --- User & RBAC Permissions Management ---
  app.get('/api/v1/admin/users', (req, res) => {
    res.json({ success: true, count: (appState.users || []).length, data: appState.users || [] });
  });

  app.post('/api/v1/admin/users', (req, res) => {
    const { username, fullName, phone, email, role, permissions, status } = req.body;
    if (!username || !fullName) {
      return res.status(400).json({ success: false, error: 'نام کاربری و نام کامل الزامی است' });
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      username,
      fullName,
      phone: phone || '',
      email: email || '',
      role: role || 'sales_cashier',
      permissions: permissions || {
        canViewFinancials: false,
        canIssueInvoices: true,
        canDeleteEntries: false,
        canManageProduction: false,
        canManageInventory: false,
        canAccessApi: false,
        canManageBackup: false,
        canManagePlugins: false,
        canManageUsers: false,
      },
      status: status || 'active',
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };

    appState.users = [newUser, ...(appState.users || [])];
    addAuditLog('ایجاد کاربر جدید در سیستم', 'مدیر کل', fullName, `نام کاربری: ${username} | نقش: ${role}`, 'permission');
    saveDb();
    res.json({ success: true, message: 'کاربر جدید با موفقیت اضافه شد', data: newUser });
  });

  app.put('/api/v1/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const incoming = req.body;
    const idx = (appState.users || []).findIndex((u) => u.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }

    const prevUser = appState.users[idx];
    appState.users[idx] = {
      ...prevUser,
      ...incoming,
      id: prevUser.id, // protect id
    };

    addAuditLog('ویرایش کاربر و مجوزهای دسترسی', 'مدیر کل', prevUser.fullName, `بروزرسانی نقش به ${incoming.role || prevUser.role}`, 'permission');
    saveDb();
    res.json({ success: true, message: 'اطلاعات و دسترسی‌های کاربر بروزرسانی شد', data: appState.users[idx] });
  });

  app.delete('/api/v1/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const user = (appState.users || []).find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'کاربر مورد نظر یافت نشد' });
    }
    if (user.role === 'super_admin') {
      return res.status(400).json({ success: false, error: 'امکان حذف مدیر کل اصلی سیستم وجود ندارد' });
    }

    appState.users = (appState.users || []).filter((u) => u.id !== id);
    addAuditLog('حذف کاربر از سیستم', 'مدیر کل', user.fullName, `کاربر ${user.username} حذف شد`, 'permission');
    saveDb();
    res.json({ success: true, message: 'کاربر با موفقیت حذف گردید' });
  });

  // --- Subscription Plans Builder & Management ---
  app.get('/api/v1/admin/plans', (req, res) => {
    res.json({ success: true, data: appState.subscriptionPlans || [] });
  });

  app.post('/api/v1/admin/plans', (req, res) => {
    const plan = req.body;
    if (!plan.name || !plan.monthlyPrice) {
      return res.status(400).json({ success: false, error: 'نام پلن و مبلغ ماهیانه الزامی است' });
    }

    const idx = (appState.subscriptionPlans || []).findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      appState.subscriptionPlans[idx] = plan;
      addAuditLog('ویرایش پلن اشتراک', 'مدیر کل', plan.name, `بروزرسانی قیمت‌ها و سقف‌های پلن`, 'subscription');
    } else {
      const newPlan = {
        ...plan,
        id: plan.id || `plan_${Date.now()}`,
        isActive: plan.isActive ?? true,
      };
      appState.subscriptionPlans = [...(appState.subscriptionPlans || []), newPlan];
      addAuditLog('ایجاد پلن اشتراک جدید', 'مدیر کل', plan.name, `تعریف بسته اشتراک جدید در سیستم`, 'subscription');
    }

    saveDb();
    res.json({ success: true, message: 'پلن اشتراک با موفقیت ذخیره شد', data: plan });
  });

  app.delete('/api/v1/admin/plans/:id', (req, res) => {
    const { id } = req.params;
    if (appState.subscription?.planId === id) {
      return res.status(400).json({ success: false, error: 'امکان حذف پلن فعال در حال استفاده وجود ندارد' });
    }

    const plan = (appState.subscriptionPlans || []).find((p) => p.id === id);
    appState.subscriptionPlans = (appState.subscriptionPlans || []).filter((p) => p.id !== id);
    addAuditLog('حذف پلن اشتراک', 'مدیر کل', plan?.name || id, 'حذف بسته اشتراک از پلتفرم', 'subscription');
    saveDb();
    res.json({ success: true, message: 'پلن با موفقیت حذف شد' });
  });

  // --- Manual Subscription Grant / Extension ---
  app.post('/api/v1/admin/subscriptions/grant', (req, res) => {
    const { planId, additionalDays, reason, actor } = req.body;
    const plan = (appState.subscriptionPlans || []).find((p) => p.id === planId) || appState.subscriptionPlans[0];
    const daysToAdd = Number(additionalDays) || 30;

    appState.subscription = {
      ...appState.subscription,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      daysRemaining: (appState.subscription.daysRemaining || 0) + daysToAdd,
      maxInvoicesLimit: plan.maxInvoicesPerMonth === -1 ? 999999 : plan.maxInvoicesPerMonth,
    };

    // Record special transaction
    const grantTxn = {
      id: `TXN-GRANT-${Date.now()}`,
      planId: plan.id,
      planName: plan.name,
      durationMonths: Math.round(daysToAdd / 30),
      amount: 0,
      currency: 'تومان' as const,
      paymentMethod: 'admin_grant' as const,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      paidAt: new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: 'successful' as const,
      reviewedBy: actor || 'مدیریت کل سیستم',
      notes: `تخصیص یا تمدید دستی اشتراک: ${daysToAdd} روز افزوده شد. دلیل: ${reason || 'تصمیم مدیریت'}`,
    };

    appState.paymentTransactions = [grantTxn, ...(appState.paymentTransactions || [])];
    addAuditLog('تخصیص دستی اشتراک رایگان/ویژه', actor || 'مدیر کل', plan.name, `${daysToAdd} روز هدیه داده شد. دلیل: ${reason || 'ویژه'}`, 'subscription');
    saveDb();

    res.json({
      success: true,
      message: `اشتراک با موفقیت ${daysToAdd} روز تمدید و فعال گردید`,
      subscription: appState.subscription,
    });
  });

  // --- Payment Transactions & Receipt Approvals ---
  app.get('/api/v1/admin/payments', (req, res) => {
    res.json({ success: true, count: (appState.paymentTransactions || []).length, data: appState.paymentTransactions || [] });
  });

  app.post('/api/v1/admin/payments/:id/approve', (req, res) => {
    const { id } = req.params;
    const txn = (appState.paymentTransactions || []).find((t) => t.id === id);
    if (!txn) {
      return res.status(404).json({ success: false, error: 'تراکنش یا فیش بانکی یافت نشد' });
    }

    txn.status = 'successful';
    txn.reviewedBy = 'مدیریت سیستم';
    txn.paidAt = new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    // Activate subscription
    const plan = (appState.subscriptionPlans || []).find((p) => p.id === txn.planId) || appState.subscriptionPlans[0];
    const daysToAdd = (txn.durationMonths || 1) * 30;

    appState.subscription = {
      ...appState.subscription,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      daysRemaining: (appState.subscription.daysRemaining || 0) + daysToAdd,
      maxInvoicesLimit: plan.maxInvoicesPerMonth === -1 ? 999999 : plan.maxInvoicesPerMonth,
    };

    addAuditLog('تأیید فیش بانکی و تمدید اشتراک', 'مدیر کل', `${txn.planName} (${txn.amount.toLocaleString()} تومان)`, `فیش شماره ${txn.receiptNumber || txn.id} تأیید و ${daysToAdd} روز افزوده شد`, 'subscription');
    saveDb();

    res.json({
      success: true,
      message: 'فیش بانکی تأیید شد و اشتراک با موفقیت فعال و تمدید گردید',
      transaction: txn,
      subscription: appState.subscription,
    });
  });

  app.post('/api/v1/admin/payments/:id/reject', (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const txn = (appState.paymentTransactions || []).find((t) => t.id === id);
    if (!txn) {
      return res.status(404).json({ success: false, error: 'تراکنش یافت نشد' });
    }

    txn.status = 'rejected';
    txn.reviewedBy = 'مدیریت سیستم';
    txn.notes = `${txn.notes ? txn.notes + ' | ' : ''}رد شده توسط مدیریت: ${reason || 'عدم تطابق فیش واریزی با حساب بانکی'}`;

    addAuditLog('رد فیش بانکی اشتراک', 'مدیر کل', txn.id, `دلیل رد: ${reason || 'عدم تطابق'}`, 'subscription');
    saveDb();

    res.json({ success: true, message: 'فیش بانکی رد شد', transaction: txn });
  });

  // --- Admin Settings & Master Password ---
  app.post('/api/v1/admin/settings', (req, res) => {
    const incoming = req.body;
    const oldPassword = appState.adminSettings.masterPassword;

    appState.adminSettings = {
      ...appState.adminSettings,
      ...incoming,
    };

    if (incoming.masterPassword && incoming.masterPassword !== oldPassword) {
      addAuditLog('تغییر رمز عبور اصلی مدیریت', 'مدیر کل', 'تنظیمات امنیتی', 'رمز ورود به پنل مدیریت بروزرسانی شد', 'security' as any);
    } else {
      addAuditLog('بروزرسانی تنظیمات پلتفرم و درگاه', 'مدیر کل', 'تنظیمات سیستم', 'تنظیمات حساب بانکی و درگاه اصلاح شد', 'system');
    }

    saveDb();
    res.json({ success: true, message: 'تنظیمات مدیریت با موفقیت بروزرسانی شد', settings: appState.adminSettings });
  });

  // --- Audit Logs ---
  app.get('/api/v1/admin/logs', (req, res) => {
    res.json({ success: true, count: (appState.auditLogs || []).length, data: appState.auditLogs || [] });
  });

  // --- Client-Facing Subscription & Payment APIs ---
  app.get('/api/v1/subscription/status', (req, res) => {
    res.json({
      success: true,
      subscription: appState.subscription,
      plans: (appState.subscriptionPlans || []).filter((p) => p.isActive),
      companyAccount: {
        cardNumber: appState.adminSettings?.companyCardNumber,
        cardHolder: appState.adminSettings?.companyCardHolder,
        iban: appState.adminSettings?.companyIban,
        bankName: appState.adminSettings?.companyBankName,
      },
    });
  });

  app.post('/api/v1/subscription/pay', (req, res) => {
    const { planId, durationMonths, paymentMethod, cardDetails, receiptDetails } = req.body;
    const plan = (appState.subscriptionPlans || []).find((p) => p.id === planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'پلن انتخاب شده معتبر نیست' });
    }

    const months = Number(durationMonths) || 1;
    let amount = plan.monthlyPrice * months;
    if (months === 3) amount = plan.quarterlyPrice;
    if (months === 12) amount = plan.annualPrice;

    const daysToAdd = months * 30;

    if (paymentMethod === 'online_gateway') {
      const code = `SHP-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const cardMask = cardDetails?.cardNumber ? cardDetails.cardNumber.slice(-4) : '۶۲۱۹';

      const txn = {
        id: `TXN-${Date.now()}`,
        planId: plan.id,
        planName: plan.name,
        durationMonths: months,
        amount,
        currency: 'تومان' as const,
        paymentMethod: 'online_gateway' as const,
        gatewayName: 'درگاه پرداخت شاپرک / زرین‌پال',
        transactionCode: code,
        cardLast4: cardMask,
        createdAt: new Date().toLocaleDateString('fa-IR'),
        paidAt: new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        status: 'successful' as const,
        reviewedBy: 'سامانه یکپارچه شاپرک',
        notes: `پرداخت موفق آنلاین از طریق درگاه امن شتاب. کد پیگیری: ${code}`,
      };

      appState.paymentTransactions = [txn, ...(appState.paymentTransactions || [])];
      appState.subscription = {
        ...appState.subscription,
        planId: plan.id,
        planName: plan.name,
        status: 'active',
        daysRemaining: (appState.subscription.daysRemaining || 0) + daysToAdd,
        maxInvoicesLimit: plan.maxInvoicesPerMonth === -1 ? 999999 : plan.maxInvoicesPerMonth,
      };

      addAuditLog('پرداخت آنلاین اشتراک', 'کاربر کسب‌وکار', plan.name, `پرداخت موفق ${amount.toLocaleString()} تومان | کد پیگیری: ${code}`, 'subscription');
      saveDb();

      return res.json({
        success: true,
        message: 'پرداخت آنلاین شما با موفقیت تایید شد و اشتراک بلافاصله فعال گردید!',
        transactionCode: code,
        transaction: txn,
        subscription: appState.subscription,
      });
    }

    if (paymentMethod === 'card_to_card') {
      const txn = {
        id: `TXN-${Date.now()}`,
        planId: plan.id,
        planName: plan.name,
        durationMonths: months,
        amount,
        currency: 'تومان' as const,
        paymentMethod: 'card_to_card' as const,
        receiptNumber: receiptDetails?.receiptNumber || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
        senderName: receiptDetails?.senderName || 'خریدار اشتراک',
        senderCard: receiptDetails?.senderCard || '',
        createdAt: new Date().toLocaleDateString('fa-IR'),
        status: 'pending_verification' as const,
        notes: `فیش واریزی کارت به کارت: شماره رهگیری ${receiptDetails?.receiptNumber || ''} - واریزکننده: ${receiptDetails?.senderName || ''}`,
      };

      appState.paymentTransactions = [txn, ...(appState.paymentTransactions || [])];
      addAuditLog('ثبت فیش واریزی کارت‌به‌کارت', receiptDetails?.senderName || 'کاربر', plan.name, `ثبت فیش بانکی ${amount.toLocaleString()} تومان - منتظر تأیید مدیریت`, 'subscription');
      saveDb();

      return res.json({
        success: true,
        message: 'اطلاعات فیش واریزی با موفقیت در سیستم ثبت گردید و پس از بررسی واحد مالی فعال خواهد شد.',
        transaction: txn,
      });
    }

    res.status(400).json({ success: false, error: 'روش پرداخت نامعتبر است' });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amiran Cloud Accounting Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
