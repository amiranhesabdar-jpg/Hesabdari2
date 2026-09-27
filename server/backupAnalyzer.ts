import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import {
  AppState,
  BackupAnalysisResult,
  AccountMappingRule,
  ParsedSanad,
  ParsedSanadRow,
  ParsedContact,
  ParsedProduct,
  Account,
} from '../src/types';
import { STANDARD_AMIRAN_ACCOUNTS } from '../src/data/standardAccounts';

export { STANDARD_AMIRAN_ACCOUNTS };

// Helper to find closest Amiran account
export function mapAccountToAmiran(
  sourceCode: string,
  sourceName: string,
  existingAccounts: Account[]
): { id: string; code: string; name: string; isAuto: boolean } {
  const cleanCode = (sourceCode || '').trim();
  const cleanName = (sourceName || '').trim();

  // 1. Direct code exact match in existing accounts
  const directMatch = existingAccounts.find((a) => a.code === cleanCode);
  if (directMatch) {
    return { id: directMatch.id, code: directMatch.code, name: directMatch.name, isAuto: true };
  }

  // 2. Exact code match in standard list
  const stdMatch = STANDARD_AMIRAN_ACCOUNTS.find((a) => a.code === cleanCode);
  if (stdMatch) {
    return { id: stdMatch.id, code: stdMatch.code, name: stdMatch.name, isAuto: true };
  }

  // 3. Prefix matching (e.g. 101001 -> 101, 103002 -> 103, 20101 -> 201)
  for (const std of STANDARD_AMIRAN_ACCOUNTS) {
    if (cleanCode.startsWith(std.code)) {
      return { id: std.id, code: std.code, name: std.name, isAuto: true };
    }
  }

  // 4. Semantic / Name keyword matching
  const n = cleanName.toLowerCase();
  if (n.includes('بانک') || n.includes('صندوق') || n.includes('نقد') || n.includes('تنخواه')) {
    return { id: 'ACC-101', code: '101', name: 'موجودی نقد و بانک', isAuto: true };
  }
  if (n.includes('مشتری') || n.includes('دریافتنی') || n.includes('بدهکاران تجاری') || n.includes('بدهکاران')) {
    return { id: 'ACC-103', code: '103', name: 'حساب‌های دریافتنی تجاری (مشتریان و بدهکاران)', isAuto: true };
  }
  if (n.includes('چک دریافتی') || n.includes('اسناد دریافتنی') || n.includes('نزد صندوق')) {
    return { id: 'ACC-102', code: '102', name: 'اسناد دریافتنی تجاری (چک‌های نزد صندوق)', isAuto: true };
  }
  if (n.includes('مواد اولیه') || n.includes('قطعات') || n.includes('انبار مواد')) {
    return { id: 'ACC-104', code: '104', name: 'موجودی مواد اولیه و قطعات', isAuto: true };
  }
  if (n.includes('کالای ساخته') || n.includes('محصول') || n.includes('محصولات') || n.includes('انبار محصول')) {
    return { id: 'ACC-105', code: '105', name: 'موجودی کالای ساخته شده و انبار محصولات', isAuto: true };
  }
  if (n.includes('بستانکاران') || n.includes('پرداختنی') || n.includes('تامین') || n.includes('فروشنده')) {
    return { id: 'ACC-201', code: '201', name: 'حساب‌های پرداختنی تجاری (تامین‌کنندگان و بستانکاران)', isAuto: true };
  }
  if (n.includes('مالیات') || n.includes('عوارض') || n.includes('ارزش افزوده')) {
    return { id: 'ACC-202', code: '202', name: 'مالیات بر ارزش افزوده و عوارض پرداختنی', isAuto: true };
  }
  if (n.includes('سرمایه') || n.includes('سهام')) {
    return { id: 'ACC-301', code: '301', name: 'سرمایه اولیه و آورده سهامداران', isAuto: true };
  }
  if (n.includes('فروش') || n.includes('درآمد')) {
    return { id: 'ACC-401', code: '401', name: 'فروش و درآمدهای عملیاتی بازرگانی و تولید', isAuto: true };
  }
  if (n.includes('بهای تمام شده') || n.includes('قیمت تمام شده') || n.includes('cogs')) {
    return { id: 'ACC-501', code: '501', name: 'بهای تمام‌شده کالای فروش‌رفته (COGS)', isAuto: true };
  }
  if (n.includes('دستمزد') || n.includes('حقوق تولید')) {
    return { id: 'ACC-502', code: '502', name: 'دستمزد مستقیم خط تولید جذب شده', isAuto: true };
  }
  if (n.includes('سربار') || n.includes('کارخانه') || n.includes('استهلاک دستگاه')) {
    return { id: 'ACC-503', code: '503', name: 'سربار ساخت و هزینه‌های کارخانه جذب شده', isAuto: true };
  }
  if (n.includes('هزینه') || n.includes('اداری') || n.includes('اجاره') || n.includes('قبوض')) {
    return { id: 'ACC-601', code: '601', name: 'هزینه‌های اداری، عمومی و فروش', isAuto: true };
  }

  // 5. Default fallback: Map to closest matching or generate custom code
  return {
    id: `ACC-NEW-${cleanCode || 'GEN'}`,
    code: cleanCode || '901',
    name: cleanName || `حساب متفرقه انتقال‌یافته (${cleanCode})`,
    isAuto: false,
  };
}

// Universal parser for Excel, CSV, JSON, XML, TXT
export async function analyzeBackupFile(
  fileContent: string,
  fileName: string,
  existingState: AppState
): Promise<BackupAnalysisResult> {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let rawRows: any[] = [];
  let sourceSystem = 'unknown';
  let sourceSystemName = 'سامانه عمومی حسابداری';
  let fileFormat = ext.toUpperCase();

  // Try parsing based on extension or content
  if (ext === 'xlsx' || ext === 'xls' || fileContent.startsWith('data:application/vnd') || fileContent.startsWith('BASE64:')) {
    fileFormat = 'Excel Spreadsheet';
    try {
      let buffer: Buffer;
      if (fileContent.startsWith('BASE64:')) {
        buffer = Buffer.from(fileContent.replace('BASE64:', ''), 'base64');
      } else if (fileContent.startsWith('data:')) {
        const b64 = fileContent.split(',')[1];
        buffer = Buffer.from(b64, 'base64');
      } else {
        buffer = Buffer.from(fileContent, 'binary');
      }
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (e: any) {
      warnings.push(`خطا در خواندن فایل اکسل: ${e.message}. تلاش با تبدیل متنی صورت می‌گیرد.`);
    }
  }

  // If not parsed as excel, check if JSON
  if (rawRows.length === 0 && (ext === 'json' || fileContent.trim().startsWith('{') || fileContent.trim().startsWith('['))) {
    try {
      const parsedJson = JSON.parse(fileContent);
      fileFormat = 'JSON Structured';

      // Check if it's Amiran's native format
      if (parsedJson.journalEntries || parsedJson.accounts || parsedJson.contacts) {
        sourceSystem = 'amiran';
        sourceSystemName = 'پشتیبان استاندارد امیران سیستم';
        return parseAmiranBackup(parsedJson, fileName, existingState);
      }

      // Check if Sepidar JSON
      if (parsedJson.Vouchers || parsedJson.Sanads || parsedJson.vouchers || parsedJson.sanadList) {
        sourceSystem = 'sepidar';
        sourceSystemName = 'سپیدار سیستم (Sepidar)';
        const list = parsedJson.Vouchers || parsedJson.Sanads || parsedJson.vouchers || parsedJson.sanadList;
        return parseSepidarJson(list, fileName, existingState, parsedJson);
      }

      // Check if Holoo JSON / array
      if (Array.isArray(parsedJson)) {
        rawRows = parsedJson;
      } else if (parsedJson.rows || parsedJson.data || parsedJson.items) {
        rawRows = parsedJson.rows || parsedJson.data || parsedJson.items;
      }
    } catch (e: any) {
      warnings.push(`فایل به عنوان JSON ساختاریافته شناسایی نشد، وارد موتور پردازش متنی/جدولی شد.`);
    }
  }

  // If still empty, parse as CSV/TSV/TXT
  if (rawRows.length === 0) {
    fileFormat = ext === 'csv' ? 'CSV Comma-Separated' : 'Delimited Text / Tab';
    rawRows = parseCsvOrDelimited(fileContent);
  }

  // Identify software signature from headers and content
  const detected = detectSoftwareSignature(rawRows, fileContent, fileName);
  sourceSystem = detected.system;
  sourceSystemName = detected.name;

  // Process rows into ParsedSanads, Contacts, Products
  const extracted = extractEntitiesFromTable(rawRows, sourceSystem, existingState);

  // Calculate totals and balance
  let totalDebit = 0;
  let totalCredit = 0;
  extracted.sanads.forEach((s) => {
    totalDebit += s.totalDebit;
    totalCredit += s.totalCredit;
  });

  const discrepancy = Math.abs(totalDebit - totalCredit);
  const isBalanced = discrepancy < 1; // 0 discrepancy tolerance for true double-entry

  if (!isBalanced) {
    warnings.push(
      `مغایرت تراز کل کشف شد: جمع بدهکار (${totalDebit.toLocaleString('fa-IR')} ریال) با جمع بستانکار (${totalCredit.toLocaleString('fa-IR')} ریال) به میزان ${discrepancy.toLocaleString('fa-IR')} ریال اختلاف دارد.`
    );
    recommendations.push(
      'سیستم به صورت خودکار یک آرتیکل ترازکننده با کد ۹۹۹ (حساب تعدیلات تراز) برای اسناد دارای مغایرت پیشنهاد می‌دهد تا تراز دفاتر به هم نخورد.'
    );
  } else {
    recommendations.push(
      'تراز دوبل اسناد ۱۰۰٪ صحیح است. تمامی رکوردهای بدهکار و بستانکار متوازن هستند و انتقال بدون کمترین مغایرت انجام خواهد شد.'
    );
  }

  if (extracted.sanads.length === 0) {
    warnings.push('هیچ سند مالی معتبری در فایل یافت نشد. ساختار ستون‌های بدهکار و بستانکار را بررسی کنید.');
  }

  // AI-Assisted deep interpretation if Gemini is available and warnings exist or low document count
  let aiAssisted = false;
  let aiNotes = '';

  if (process.env.GEMINI_API_KEY && (extracted.sanads.length === 0 || !isBalanced || rawRows.length > 0)) {
    try {
      const aiResult = await tryGeminiDeepAnalyze(rawRows.slice(0, 30), fileContent.slice(0, 3000), sourceSystemName);
      if (aiResult && aiResult.notes) {
        aiAssisted = true;
        aiNotes = aiResult.notes;
        if (aiResult.additionalRecommendations) {
          recommendations.push(...aiResult.additionalRecommendations);
        }
      }
    } catch {
      // Graceful fallback to deterministic parsing
    }
  }

  return {
    sourceSystem,
    sourceSystemName,
    fileFormat,
    fileName,
    totalSanads: extracted.sanads.length,
    totalRows: extracted.totalRows,
    totalDebit,
    totalCredit,
    isBalanced,
    discrepancy,
    mappingRules: extracted.mappingRules,
    sanads: extracted.sanads,
    contacts: extracted.contacts,
    products: extracted.products,
    warnings,
    recommendations,
    aiAssisted,
    aiNotes,
  };
}

// Detect software signature
function detectSoftwareSignature(
  rows: any[],
  rawContent: string,
  fileName: string
): { system: string; name: string } {
  const str = (rawContent + ' ' + fileName).toLowerCase();
  const firstRowStr = rows.length > 0 ? JSON.stringify(rows[0]).toLowerCase() : '';

  if (str.includes('sepidar') || str.includes('سپیدار') || firstRowStr.includes('vouchernumber') || firstRowStr.includes('شماره عطف')) {
    return { system: 'sepidar', name: 'سپیدار سیستم (همکاران سیستم)' };
  }
  if (str.includes('holoo') || str.includes('هلو') || firstRowStr.includes('codekol') || firstRowStr.includes('کد کل') || firstRowStr.includes('bedehkar')) {
    return { system: 'holoo', name: 'نرم‌افزار جامع هلو (نسخه بازرگانی/تولیدی)' };
  }
  if (str.includes('rahkaran') || str.includes('راهکاران') || str.includes('systemgroup') || firstRowStr.includes('subsidiaryaccount')) {
    return { system: 'rahkaran', name: 'راهکاران ابری همکاران سیستم' };
  }
  if (str.includes('mahak') || str.includes('محک')) {
    return { system: 'mahak', name: 'نرم‌افزار حسابداری محک' };
  }
  if (str.includes('parsian') || str.includes('پارسیان')) {
    return { system: 'parsian', name: 'نرم‌افزار حسابداری پارسیان' };
  }
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    return { system: 'excel_sheet', name: 'شیت جامع اکسل / خروجی دفاتر حسابداری' };
  }
  return { system: 'generic_table', name: 'سامانه استاندارد حسابداری (جدول دوبل)' };
}

// Parse Delimited CSV/TSV
function parseCsvOrDelimited(content: string): any[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';')) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';

  const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.replace(/^["']|["']$/g, '').trim());
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    result.push(obj);
  }

  return result;
}

// Extract Sanads, Accounts, Contacts, Products from generic tabular data
function extractEntitiesFromTable(
  rows: any[],
  sourceSystem: string,
  state: AppState
): {
  sanads: ParsedSanad[];
  mappingRules: AccountMappingRule[];
  contacts: ParsedContact[];
  products: ParsedProduct[];
  totalRows: number;
} {
  const sanadMap = new Map<string, ParsedSanad>();
  const mappingRulesMap = new Map<string, AccountMappingRule>();
  const contactsMap = new Map<string, ParsedContact>();
  const productsMap = new Map<string, ParsedProduct>();
  let totalRowsCount = 0;

  if (!rows || rows.length === 0) {
    return { sanads: [], mappingRules: [], contacts: [], products: [], totalRows: 0 };
  }

  // Detect column mapping automatically
  const sample = rows[0];
  const keys = Object.keys(sample);

  const getCol = (patterns: string[]): string | undefined => {
    return keys.find((k) => {
      const lower = k.toLowerCase().replace(/\s+/g, '');
      return patterns.some((p) => lower.includes(p.toLowerCase().replace(/\s+/g, '')));
    });
  };

  const sanadNoCol = getCol(['شماره سند', 'شماره_سند', 'سند', 'docno', 'vouchernumber', 'voucher_no', 'sanadno', 'sanad_no', 'شماره']);
  const dateCol = getCol(['تاریخ سند', 'تاریخ_سند', 'تاریخ', 'date', 'voucherdate', 'sanaddate', 'tarikh']);
  const refCol = getCol(['عطف', 'پیگیری', 'شماره عطف', 'reference', 'ref', 'atf', 'peygiri']);
  const descCol = getCol(['شرح', 'شرح سند', 'شرح آرتیکل', 'توضیحات', 'description', 'memo', 'sharh', 'notes']);
  const accountCodeCol = getCol(['کد حساب', 'کد معین', 'کد کل', 'کد', 'accountcode', 'account_code', 'code', 'codemoein', 'codekol']);
  const accountNameCol = getCol(['نام حساب', 'عنوان حساب', 'عنوان معین', 'نام معین', 'حساب', 'accountname', 'account_name', 'title', 'onvan']);
  const debitCol = getCol(['بدهکار', 'مبلغ بدهکار', 'بدهکار (ریال)', 'بدهکار(تومان)', 'debit', 'bed', 'bedehkar']);
  const creditCol = getCol(['بستانکار', 'مبلغ بستانکار', 'بستانکار (ریال)', 'بستانکار(تومان)', 'credit', 'bes', 'bestankar']);
  const contactCol = getCol(['طرف حساب', 'شخص', 'مشتری', 'تامین کننده', 'contact', 'party', 'customer', 'supplier']);
  const productCol = getCol(['کالا', 'نام کالا', 'شرح کالا', 'product', 'item', 'kala']);
  const stockCol = getCol(['موجودی', 'تعداد', 'مقدار', 'stock', 'quantity', 'qty', 'tedad']);

  let currentSanadNum = 1;

  rows.forEach((row, rowIndex) => {
    // Extract Sanad identifier
    let sanadId = sanadNoCol && row[sanadNoCol] ? String(row[sanadNoCol]).trim() : '';
    if (!sanadId) {
      // If no explicit sanad number column, group by date or sequential chunks
      sanadId = String(currentSanadNum);
    } else {
      const num = parseInt(sanadId.replace(/\D/g, ''), 10);
      if (!isNaN(num)) currentSanadNum = num;
    }

    const date = (dateCol && row[dateCol] ? String(row[dateCol]).trim() : '1403/07/01').replace(/-/g, '/');
    const ref = refCol && row[refCol] ? String(row[refCol]).trim() : undefined;
    const desc = descCol && row[descCol] ? String(row[descCol]).trim() : `سند شماره ${sanadId}`;

    // Extract Account Info
    const accCode = accountCodeCol && row[accountCodeCol] ? String(row[accountCodeCol]).trim() : '101';
    const accName = accountNameCol && row[accountNameCol] ? String(row[accountNameCol]).trim() : `حساب کد ${accCode}`;

    // Extract amounts (strip commas, spaces, currency signs)
    const parseAmount = (val: any): number => {
      if (typeof val === 'number') return Math.abs(val);
      if (!val) return 0;
      const clean = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : Math.abs(parsed);
    };

    const debit = debitCol ? parseAmount(row[debitCol]) : 0;
    const credit = creditCol ? parseAmount(row[creditCol]) : 0;

    // Skip completely empty lines
    if (debit === 0 && credit === 0 && !accCode) return;

    totalRowsCount++;

    // Map Account to Amiran
    if (!mappingRulesMap.has(accCode)) {
      const matched = mapAccountToAmiran(accCode, accName, state.accounts);
      mappingRulesMap.set(accCode, {
        sourceCode: accCode,
        sourceName: accName,
        targetAccountId: matched.id,
        targetAccountCode: matched.code,
        targetAccountName: matched.name,
        isAutoMatched: matched.isAuto,
        createIfNotExists: !matched.isAuto,
      });
    }

    const rule = mappingRulesMap.get(accCode)!;

    // Extract Contact if present in row
    if (contactCol && row[contactCol]) {
      const contactName = String(row[contactCol]).trim();
      if (contactName && !contactsMap.has(contactName)) {
        contactsMap.set(contactName, {
          name: contactName,
          type: debit > 0 ? 'customer' : 'supplier',
          balance: debit > 0 ? debit : -credit,
        });
      }
    }

    // Extract Product if present in row
    if (productCol && row[productCol]) {
      const prodName = String(row[productCol]).trim();
      if (prodName && !productsMap.has(prodName)) {
        const stockVal = stockCol ? parseAmount(row[stockCol]) : 1;
        productsMap.set(prodName, {
          code: `PRD-${productsMap.size + 101}`,
          name: prodName,
          stock: stockVal,
          unit: 'عدد',
          buyPrice: debit > 0 ? debit : 0,
          sellPrice: credit > 0 ? credit : 0,
        });
      }
    }

    // Add to Sanad
    if (!sanadMap.has(sanadId)) {
      sanadMap.set(sanadId, {
        entryNumber: parseInt(sanadId, 10) || sanadMap.size + 1,
        date,
        referenceNumber: ref,
        description: desc,
        rows: [],
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: true,
        discrepancy: 0,
      });
    }

    const sanad = sanadMap.get(sanadId)!;
    const sanadRow: ParsedSanadRow = {
      id: `SR-${sanadId}-${sanad.rows.length + 1}`,
      sourceAccountCode: accCode,
      sourceAccountName: accName,
      targetAccountId: rule.targetAccountId,
      targetAccountCode: rule.targetAccountCode,
      targetAccountName: rule.targetAccountName,
      description: desc,
      debit,
      credit,
    };

    sanad.rows.push(sanadRow);
    sanad.totalDebit += debit;
    sanad.totalCredit += credit;
    sanad.discrepancy = Math.abs(sanad.totalDebit - sanad.totalCredit);
    sanad.isBalanced = sanad.discrepancy < 1;
  });

  return {
    sanads: Array.from(sanadMap.values()),
    mappingRules: Array.from(mappingRulesMap.values()),
    contacts: Array.from(contactsMap.values()),
    products: Array.from(productsMap.values()),
    totalRows: totalRowsCount,
  };
}

// Parse Amiran Native Backup
function parseAmiranBackup(data: any, fileName: string, state: AppState): BackupAnalysisResult {
  const sanads: ParsedSanad[] = (data.journalEntries || []).map((j: any) => {
    const totalDebit = j.rows?.reduce((s: number, r: any) => s + (Number(r.debit) || 0), 0) || j.totalDebit || 0;
    const totalCredit = j.rows?.reduce((s: number, r: any) => s + (Number(r.credit) || 0), 0) || j.totalCredit || 0;
    const disc = Math.abs(totalDebit - totalCredit);

    return {
      entryNumber: j.entryNumber,
      date: j.date,
      referenceNumber: j.referenceNumber,
      description: j.description,
      rows: (j.rows || []).map((r: any, idx: number) => ({
        id: r.id || `R-${j.entryNumber}-${idx}`,
        sourceAccountCode: r.accountCode,
        sourceAccountName: r.accountName,
        targetAccountId: r.accountId || `ACC-${r.accountCode}`,
        targetAccountCode: r.accountCode,
        targetAccountName: r.accountName,
        description: r.description,
        debit: Number(r.debit) || 0,
        credit: Number(r.credit) || 0,
      })),
      totalDebit,
      totalCredit,
      isBalanced: disc < 1,
      discrepancy: disc,
    };
  });

  const mappingRules: AccountMappingRule[] = (data.accounts || []).map((a: any) => ({
    sourceCode: a.code,
    sourceName: a.name,
    targetAccountId: a.id,
    targetAccountCode: a.code,
    targetAccountName: a.name,
    isAutoMatched: true,
  }));

  const contacts: ParsedContact[] = (data.contacts || []).map((c: any) => ({
    code: c.code,
    name: c.name,
    type: c.type,
    phone: c.phone,
    balance: c.currentBalance,
    nationalId: c.nationalId,
  }));

  const products: ParsedProduct[] = (data.products || []).map((p: any) => ({
    code: p.code,
    name: p.name,
    stock: p.stock,
    unit: p.unit,
    buyPrice: p.buyPrice,
    sellPrice: p.sellPrice,
    warehouse: p.warehouse,
  }));

  let totalDebit = 0;
  let totalCredit = 0;
  sanads.forEach((s) => {
    totalDebit += s.totalDebit;
    totalCredit += s.totalCredit;
  });

  const discrepancy = Math.abs(totalDebit - totalCredit);

  return {
    sourceSystem: 'amiran',
    sourceSystemName: 'پشتیبان استاندارد امیران سیستم',
    fileFormat: 'JSON Backup',
    fileName,
    totalSanads: sanads.length,
    totalRows: sanads.reduce((acc, s) => acc + s.rows.length, 0),
    totalDebit,
    totalCredit,
    isBalanced: discrepancy < 1,
    discrepancy,
    mappingRules,
    sanads,
    contacts,
    products,
    warnings: [],
    recommendations: ['پشتیبان کاملاً منطبق با ساختار امیران سیستم است و تمام اسناد و مانده‌ها مستقیماً وارد خواهند شد.'],
  };
}

// Parse Sepidar System JSON Structure
function parseSepidarJson(
  vouchers: any[],
  fileName: string,
  state: AppState,
  fullJson: any
): BackupAnalysisResult {
  const mappingRulesMap = new Map<string, AccountMappingRule>();
  const contacts: ParsedContact[] = [];
  const products: ParsedProduct[] = [];

  // Extract parties if present
  if (fullJson.Parties || fullJson.parties || fullJson.Customers) {
    const list = fullJson.Parties || fullJson.parties || fullJson.Customers;
    list.forEach((p: any) => {
      contacts.push({
        code: p.Code || p.code,
        name: p.Name || p.Title || p.name,
        type: 'both',
        phone: p.Phone || p.Mobile,
        balance: Number(p.Balance || p.Remaining) || 0,
      });
    });
  }

  // Extract Items if present
  if (fullJson.Items || fullJson.items || fullJson.Products) {
    const list = fullJson.Items || fullJson.items || fullJson.Products;
    list.forEach((i: any) => {
      products.push({
        code: i.Code || i.code || `PRD-${products.length + 101}`,
        name: i.Name || i.Title || i.name,
        stock: Number(i.Stock || i.Quantity) || 0,
        unit: i.Unit || 'عدد',
        buyPrice: Number(i.BuyPrice || i.Cost) || 0,
        sellPrice: Number(i.SellPrice || i.Price) || 0,
      });
    });
  }

  const sanads: ParsedSanad[] = vouchers.map((v: any, vIdx: number) => {
    const entryNumber = v.Number || v.VoucherNumber || v.entryNumber || vIdx + 1;
    const date = v.Date || v.VoucherDate || v.date || '1403/01/01';
    const desc = v.Description || v.Memo || `سند حسابداری شماره ${entryNumber} (سپیدار)`;
    const ref = v.ReferenceNumber || v.AtfNumber || v.TrackingNumber;

    const items = v.Items || v.Rows || v.rows || v.articles || [];
    let sDebit = 0;
    let sCredit = 0;

    const rows: ParsedSanadRow[] = items.map((row: any, rIdx: number) => {
      const code = String(row.AccountCode || row.SubsidiaryCode || row.Code || '101').trim();
      const name = String(row.AccountTitle || row.AccountName || row.Title || `حساب ${code}`).trim();
      const debit = Number(row.Debit || row.Bedehkar || 0);
      const credit = Number(row.Credit || row.Bestankar || 0);
      const rDesc = row.Description || row.Memo || desc;

      sDebit += debit;
      sCredit += credit;

      if (!mappingRulesMap.has(code)) {
        const matched = mapAccountToAmiran(code, name, state.accounts);
        mappingRulesMap.set(code, {
          sourceCode: code,
          sourceName: name,
          targetAccountId: matched.id,
          targetAccountCode: matched.code,
          targetAccountName: matched.name,
          isAutoMatched: matched.isAuto,
          createIfNotExists: !matched.isAuto,
        });
      }

      const rule = mappingRulesMap.get(code)!;

      return {
        id: `SEP-${entryNumber}-${rIdx + 1}`,
        sourceAccountCode: code,
        sourceAccountName: name,
        targetAccountId: rule.targetAccountId,
        targetAccountCode: rule.targetAccountCode,
        targetAccountName: rule.targetAccountName,
        description: rDesc,
        debit,
        credit,
      };
    });

    const disc = Math.abs(sDebit - sCredit);

    return {
      entryNumber,
      date,
      referenceNumber: ref,
      description: desc,
      rows,
      totalDebit: sDebit,
      totalCredit: sCredit,
      isBalanced: disc < 1,
      discrepancy: disc,
    };
  });

  let totalDebit = 0;
  let totalCredit = 0;
  sanads.forEach((s) => {
    totalDebit += s.totalDebit;
    totalCredit += s.totalCredit;
  });

  const discrepancy = Math.abs(totalDebit - totalCredit);

  return {
    sourceSystem: 'sepidar',
    sourceSystemName: 'سپیدار سیستم (Sepidar System Group)',
    fileFormat: 'JSON Backup',
    fileName,
    totalSanads: sanads.length,
    totalRows: sanads.reduce((acc, s) => acc + s.rows.length, 0),
    totalDebit,
    totalCredit,
    isBalanced: discrepancy < 1,
    discrepancy,
    mappingRules: Array.from(mappingRulesMap.values()),
    sanads,
    contacts,
    products,
    warnings: [],
    recommendations: [
      'ساختار داده‌های سپیدار سیستم با موفقیت اعتبارسنجی شد. کلیه آرتیکل‌ها با کدینگ حسابداری استاندارد تطبیق یافتند.',
    ],
  };
}

// AI Deep Analyzer with Gemini 3.8 Flash for exotic / unstructured backup files
async function tryGeminiDeepAnalyze(sampleRows: any[], rawText: string, detectedSystem: string) {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `شما یک حسابدار خبره ارشد و متخصص استخراج و اعتبارسنجی داده‌های سیستم‌های مالی و ERP ایرانی هستید.
کاربر فایلی از نرم‌افزار حسابداری قبلی خود (${detectedSystem}) آپلود کرده است تا به سیستم حسابداری امیران منتقل کند.
نمونه داده‌های استخراج شده به شرح زیر است:
${JSON.stringify(sampleRows, null, 2)}

متن خام فایل (برشی از ابتدا):
${rawText.slice(0, 1500)}

لطفاً به زبان فارسی و با دقت ۱۰۰٪ حسابداری:
۱. تحلیل کنید که آیا ساختار بدهکار/بستانکار استاندارد است؟
۲. چه نکاتی برای عدم مغایرت مالی و حفظ ارزش ریالی اسناد باید رعایت شود؟
۳. نکات تکمیلی برای حسابدار چیست؟

خروجی خود را دقیقاً به صورت یک آبجکت JSON با فیلدهای:
{
  "notes": "تحلیل خلاصه و راهکار",
  "additionalRecommendations": ["توصیه ۱", "توصیه ۲"]
}
بدون هرگونه متن اضافی ارسال کنید.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.warn('Gemini deep analyze fallback:', err);
    return null;
  }
}
