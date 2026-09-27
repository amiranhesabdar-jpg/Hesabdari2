import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Search,
  Users,
  CreditCard,
  Building,
  CheckCircle2,
  X,
  Trash2,
  Share2,
  Phone,
  Calendar,
  ChevronRight,
  DollarSign,
  UserCheck,
  Tag,
  ArrowRight,
  Minus,
  Coins,
  Globe,
} from 'lucide-react';
import { AppState, Invoice, InvoiceItem, Contact, Cheque } from '../types';
import {
  formatCurrency,
  formatNumber,
  toPersianDigits,
  getJalaliDate,
  generateId,
  AppCurrency,
  CURRENCY_CONFIG,
  formatAmountWithCurrency,
} from '../utils/persian';

interface CommercialViewProps {
  state: AppState;
  onSaveInvoice: (invoice: Invoice) => void;
  onSaveContact: (contact: Contact) => void;
  onSaveCheque: (cheque: Cheque) => void;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const CommercialView: React.FC<CommercialViewProps> = ({
  state,
  onSaveInvoice,
  onSaveContact,
  onSaveCheque,
  isCreateModalOpen = false,
  onCloseCreateModal,
}) => {
  const [subTab, setSubTab] = useState<'invoices' | 'contacts' | 'cheques'>('invoices');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | AppCurrency>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(isCreateModalOpen);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [selectedInvoiceToPrint, setSelectedInvoiceToPrint] = useState<Invoice | null>(null);

  // New Invoice Form State
  const [newInvoiceType, setNewInvoiceType] = useState<'sales' | 'purchase'>('sales');
  const [newInvoiceCurrency, setNewInvoiceCurrency] = useState<AppCurrency>('TOMAN');
  const [newInvoiceExchangeRate, setNewInvoiceExchangeRate] = useState<number>(1);
  const [newContactId, setNewContactId] = useState(state.contacts[0]?.id || '');
  const [newInvoiceDate, setNewInvoiceDate] = useState(getJalaliDate());
  const [newInvoiceItems, setNewInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: generateId('ITEM'),
      productId: state.products[0]?.id || '',
      productName: state.products[0]?.name || '',
      productCode: state.products[0]?.code || '',
      unit: state.products[0]?.unit || 'عدد',
      quantity: 1,
      unitPrice: state.products[0]?.sellPrice || 100000,
      discount: 0,
      taxRate: state.settings.vatRate,
      taxAmount: Math.round(((state.products[0]?.sellPrice || 100000) * state.settings.vatRate) / 100),
      total: Math.round((state.products[0]?.sellPrice || 100000) * (1 + state.settings.vatRate / 100)),
    },
  ]);
  const [shippingCost, setShippingCost] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('تحویل در محل انبار شرکت');

  const handleCurrencyChange = (curr: AppCurrency) => {
    setNewInvoiceCurrency(curr);
    const rate = state.settings.exchangeRates?.[curr] || CURRENCY_CONFIG[curr].defaultRate;
    setNewInvoiceExchangeRate(rate);

    // Convert items unitPrice cleanly
    setNewInvoiceItems((prev) =>
      prev.map((item) => {
        const prod = state.products.find((p) => p.id === item.productId);
        const basePrice = prod ? (newInvoiceType === 'sales' ? prod.sellPrice : prod.buyPrice) : item.unitPrice;
        let convertedPrice = basePrice;
        if (curr === 'USD' || curr === 'EUR') {
          convertedPrice = Number((basePrice / rate).toFixed(2));
        } else if (curr === 'IRR') {
          convertedPrice = Math.round(basePrice * 10);
        } else {
          convertedPrice = basePrice;
        }

        const taxable = Math.max(0, item.quantity * convertedPrice - item.discount);
        const tax = Math.round((taxable * item.taxRate) / 100);
        return {
          ...item,
          unitPrice: convertedPrice,
          taxAmount: tax,
          total: taxable + tax,
        };
      })
    );
  };

  // Sync prop modal state
  React.useEffect(() => {
    if (isCreateModalOpen) {
      setShowNewInvoiceModal(true);
    }
  }, [isCreateModalOpen]);

  // Calculations for New Invoice
  const subtotal = newInvoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = newInvoiceItems.reduce((sum, item) => sum + item.discount, 0);
  const totalTax = newInvoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal - totalDiscount + totalTax + Number(shippingCost || 0);
  const remainingAmount = Math.max(0, grandTotal - Number(paidAmount || 0));

  // Converted totals in base currency (Toman)
  const convertedGrandTotal = Math.round(grandTotal * (Number(newInvoiceExchangeRate) || 1));
  const convertedRemaining = Math.round(remainingAmount * (Number(newInvoiceExchangeRate) || 1));

  const handleAddItem = () => {
    const defaultProduct = state.products[0];
    if (!defaultProduct) return;
    const basePrice = newInvoiceType === 'sales' ? defaultProduct.sellPrice : defaultProduct.buyPrice;
    let price = basePrice;
    if (newInvoiceCurrency === 'USD' || newInvoiceCurrency === 'EUR') {
      price = Number((basePrice / (newInvoiceExchangeRate || 1)).toFixed(2));
    } else if (newInvoiceCurrency === 'IRR') {
      price = Math.round(basePrice * 10);
    }
    const tax = Math.round((price * state.settings.vatRate) / 100);
    setNewInvoiceItems([
      ...newInvoiceItems,
      {
        id: generateId('ITEM'),
        productId: defaultProduct.id,
        productName: defaultProduct.name,
        productCode: defaultProduct.code,
        unit: defaultProduct.unit,
        quantity: 1,
        unitPrice: price,
        discount: 0,
        taxRate: state.settings.vatRate,
        taxAmount: tax,
        total: price + tax,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...newInvoiceItems];
    const current = { ...updated[index], [field]: value };

    if (field === 'productId') {
      const prod = state.products.find((p) => p.id === value);
      if (prod) {
        current.productName = prod.name;
        current.productCode = prod.code;
        current.unit = prod.unit;
        current.unitPrice = newInvoiceType === 'sales' ? prod.sellPrice : prod.buyPrice;
      }
    }

    const qty = Math.max(1, Number(current.quantity) || 1);
    const price = Math.max(0, Number(current.unitPrice) || 0);
    const disc = Math.max(0, Number(current.discount) || 0);
    const taxableBase = Math.max(0, qty * price - disc);
    const tax = Math.round((taxableBase * Number(current.taxRate || 0)) / 100);

    current.quantity = qty;
    current.unitPrice = price;
    current.discount = disc;
    current.taxAmount = tax;
    current.total = taxableBase + tax;

    updated[index] = current;
    setNewInvoiceItems(updated);
  };

  const handleQuantityStep = (index: number, delta: number) => {
    const currentQty = Number(newInvoiceItems[index]?.quantity) || 1;
    const nextQty = Math.max(1, currentQty + delta);
    handleUpdateItem(index, 'quantity', nextQty);
  };

  const handleRemoveItem = (index: number) => {
    if (newInvoiceItems.length <= 1) return;
    setNewInvoiceItems(newInvoiceItems.filter((_, i) => i !== index));
  };

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = state.contacts.find((c) => c.id === newContactId);
    if (!contact) return;

    const invoiceNumber = `INV-${Date.now().toString().slice(-5)}`;
    const effectiveRate = Number(newInvoiceExchangeRate) || 1;
    const basePaid = Math.round(Number(paidAmount || 0) * effectiveRate);
    const baseRem = Math.round(remainingAmount * effectiveRate);

    const newInv: Invoice = {
      id: generateId('INV'),
      invoiceNumber,
      type: newInvoiceType,
      contactId: contact.id,
      contactName: contact.name,
      date: newInvoiceDate,
      items: newInvoiceItems,
      currency: newInvoiceCurrency,
      exchangeRate: effectiveRate,
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost: Number(shippingCost || 0),
      grandTotal,
      baseCurrencyGrandTotal: convertedGrandTotal,
      paidAmount: Number(paidAmount || 0),
      baseCurrencyPaidAmount: basePaid,
      remainingAmount,
      baseCurrencyRemainingAmount: baseRem,
      paymentStatus: remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paidAmount > 0 ? 'bank_transfer' : 'credit',
      notes: invoiceNotes,
    };

    onSaveInvoice(newInv);
    setShowNewInvoiceModal(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  // Contacts Form
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactType, setNewContactType] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [newContactCreditLimit, setNewContactCreditLimit] = useState(50000000);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const newContact: Contact = {
      id: generateId('CNT'),
      code: `CNT-${Date.now().toString().slice(-4)}`,
      name: newContactName,
      type: newContactType,
      phone: newContactPhone,
      mobile: newContactPhone,
      creditLimit: Number(newContactCreditLimit),
      currentBalance: 0,
    };

    onSaveContact(newContact);
    setNewContactId(newContact.id);
    setShowContactModal(false);
    setNewContactName('');
    setNewContactPhone('');
  };

  // Cheque Form
  const [newChequeNumber, setNewChequeNumber] = useState('');
  const [newSayadNumber, setNewSayadNumber] = useState('');
  const [newChequeAmount, setNewChequeAmount] = useState(10000000);
  const [newChequeBank, setNewChequeBank] = useState('بانک ملت');
  const [newChequeDueDate, setNewChequeDueDate] = useState(getJalaliDate());
  const [newChequeType, setNewChequeType] = useState<'received' | 'issued'>('received');

  const handleAddCheque = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = state.contacts[0];
    const newCheque: Cheque = {
      id: generateId('CHQ'),
      chequeNumber: newChequeNumber || '۱۲۳۴۵۶',
      sayadNumber: newSayadNumber || '۷۰۱۲۰۹۳۴۵۶۷۸۱',
      type: newChequeType,
      contactId: contact ? contact.id : 'CNT-01',
      contactName: contact ? contact.name : 'طرف حساب عمومی',
      bankName: newChequeBank,
      branch: 'مرکزی',
      amount: Number(newChequeAmount),
      issueDate: getJalaliDate(),
      dueDate: newChequeDueDate,
      status: 'pending',
    };
    onSaveCheque(newCheque);
    setShowChequeModal(false);
  };

  // Filtering
  const filteredInvoices = state.invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.includes(searchQuery) ||
      inv.contactName.includes(searchQuery) ||
      inv.date.includes(searchQuery);
    const invCurr = inv.currency || 'TOMAN';
    const matchesCurrency = currencyFilter === 'ALL' || invCurr === currencyFilter;
    return matchesSearch && matchesCurrency;
  });

  const filteredContacts = state.contacts.filter(
    (c) => c.name.includes(searchQuery) || c.phone.includes(searchQuery) || c.code.includes(searchQuery)
  );

  const filteredCheques = state.cheques.filter(
    (chq) =>
      chq.chequeNumber.includes(searchQuery) ||
      chq.sayadNumber.includes(searchQuery) ||
      chq.contactName.includes(searchQuery) ||
      chq.bankName.includes(searchQuery)
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-16 lg:pb-0">
      {/* Sub Tabs Navigation - Scrollable on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            id="tab-invoices"
            onClick={() => setSubTab('invoices')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-0 ${
              subTab === 'invoices'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>فاکتورها و صورتحساب</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
              {toPersianDigits(state.invoices.length)}
            </span>
          </button>

          <button
            id="tab-contacts"
            onClick={() => setSubTab('contacts')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-0 ${
              subTab === 'contacts'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مشتریان و طرف‌حساب</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
              {toPersianDigits(state.contacts.length)}
            </span>
          </button>

          <button
            id="tab-cheques"
            onClick={() => setSubTab('cheques')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-0 ${
              subTab === 'cheques'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>چک‌های صیادی</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
              {toPersianDigits(state.cheques.length)}
            </span>
          </button>
        </div>

        {/* Action Button depending on subTab */}
        <div className="w-full sm:w-auto">
          {subTab === 'invoices' && (
            <button
              id="btn-add-invoice"
              onClick={() => setShowNewInvoiceModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>صدور فاکتور جدید (فروش / خرید)</span>
            </button>
          )}

          {subTab === 'contacts' && (
            <button
              id="btn-add-contact"
              onClick={() => setShowContactModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف طرف‌حساب جدید</span>
            </button>
          )}

          {subTab === 'cheques' && (
            <button
              id="btn-add-cheque"
              onClick={() => setShowChequeModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت چک صیادی جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Currency Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در شماره فاکتور، نام طرف‌حساب، تاریخ یا کد..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs sm:text-xs focus:outline-hidden focus:border-emerald-500 shadow-xs min-h-[42px]"
          />
        </div>

        {subTab === 'invoices' && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
            {/* Currency Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-bold text-slate-500 shrink-0 ml-1">فیلتر ارز:</span>
              <button
                type="button"
                onClick={() => setCurrencyFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  currencyFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                همه ({toPersianDigits(state.invoices.length)})
              </button>
              {(['TOMAN', 'USD', 'EUR', 'IRR'] as AppCurrency[]).map((curr) => {
                const cfg = CURRENCY_CONFIG[curr];
                const count = state.invoices.filter((i) => (i.currency || 'TOMAN') === curr).length;
                const isSelected = currencyFilter === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrencyFilter(curr)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{cfg.flag}</span>
                    <span>{cfg.symbol}</span>
                    <span className="text-[10px] opacity-80">({toPersianDigits(count)})</span>
                  </button>
                );
              })}
            </div>

            {/* Exchange Rate Reference Ticker */}
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium shrink-0 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400 text-[10px]">نرخ برابری خودکار:</span>
              <span className="font-mono text-indigo-700 font-bold">$ ۱ = ۶۵,۰۰۰ ت</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-blue-700 font-bold">€ ۱ = ۷۱,۰۰۰ ت</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-amber-700 font-bold">۱۰ ریال = ۱ ت</span>
            </div>
          </div>
        )}
      </div>

      {/* View 1: Invoices */}
      {subTab === 'invoices' && (
        <div className="space-y-3">
          {/* Mobile Invoices Card List (< md screens) */}
          <div className="md:hidden space-y-3">
            {filteredInvoices.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                فاکتوری یافت نشد. برای ثبت اولین فاکتور دکمه «صدور فاکتور جدید» را بزنید.
              </div>
            ) : (
              filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 active:border-emerald-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-800">{inv.invoiceNumber}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.type === 'sales'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {inv.type === 'sales' ? 'فروش رسمی' : 'خرید'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.currency === 'USD'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : inv.currency === 'EUR'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : inv.currency === 'IRR'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {CURRENCY_CONFIG[inv.currency || 'TOMAN'].flag} {CURRENCY_CONFIG[inv.currency || 'TOMAN'].symbol}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{toPersianDigits(inv.date)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">طرف حساب:</span>
                      <span className="font-bold text-slate-900">{inv.contactName}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">مبلغ کل فاکتور:</span>
                      <span className="font-extrabold text-sm text-emerald-700 block">
                        {formatAmountWithCurrency(inv.grandTotal, inv.currency || 'TOMAN')}
                      </span>
                      {inv.currency && inv.currency !== 'TOMAN' && (
                        <span className="text-[10px] text-slate-500 font-medium block">
                          معادل: {formatCurrency(inv.baseCurrencyGrandTotal || inv.grandTotal * (inv.exchangeRate || 1), 'تومان')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                          ? 'تسویه جزئی'
                          : 'پرداخت نشده'}
                      </span>
                      {inv.remainingAmount > 0 && (
                        <span className="text-[10px] text-rose-600 font-medium">
                          مانده: {formatAmountWithCurrency(inv.remainingAmount, inv.currency || 'TOMAN')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedInvoiceToPrint(inv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition min-h-[38px]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>چاپ / مشاهده</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Invoices Table (>= md screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">شماره فاکتور</th>
                    <th className="py-3 px-4">نوع و ارز فاکتور</th>
                    <th className="py-3 px-4">نام طرف حساب</th>
                    <th className="py-3 px-4">تاریخ صدور</th>
                    <th className="py-3 px-4">مبلغ ناخالص</th>
                    <th className="py-3 px-4">مالیات ارزش‌افزوده</th>
                    <th className="py-3 px-4">مبلغ نهایی فاکتور</th>
                    <th className="py-3 px-4">مانده تسویه</th>
                    <th className="py-3 px-4">وضعیت پرداخت</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              inv.type === 'sales'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {inv.type === 'sales' ? 'فروش رسمی' : 'خرید مواد/کالا'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                              inv.currency === 'USD'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : inv.currency === 'EUR'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : inv.currency === 'IRR'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title={`ارز فاکتور: ${CURRENCY_CONFIG[inv.currency || 'TOMAN'].nameFa}`}
                          >
                            <span>{CURRENCY_CONFIG[inv.currency || 'TOMAN'].flag}</span>
                            <span>{CURRENCY_CONFIG[inv.currency || 'TOMAN'].symbol}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.contactName}</td>
                      <td className="py-3.5 px-4 text-slate-600">{toPersianDigits(inv.date)}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatAmountWithCurrency(inv.subtotal, inv.currency || 'TOMAN')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatAmountWithCurrency(inv.totalTax, inv.currency || 'TOMAN')}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {formatAmountWithCurrency(inv.grandTotal, inv.currency || 'TOMAN')}
                          </span>
                          {inv.currency && inv.currency !== 'TOMAN' && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              معادل: {formatCurrency(inv.baseCurrencyGrandTotal || inv.grandTotal * (inv.exchangeRate || 1), 'تومان')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-rose-600">
                        {inv.remainingAmount > 0 ? (
                          <div className="flex flex-col">
                            <span>{formatAmountWithCurrency(inv.remainingAmount, inv.currency || 'TOMAN')}</span>
                            {inv.currency && inv.currency !== 'TOMAN' && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                معادل: {formatCurrency(inv.baseCurrencyRemainingAmount || inv.remainingAmount * (inv.exchangeRate || 1), 'تومان')}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                            ? 'تسویه جزئی'
                            : 'پرداخت نشده'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedInvoiceToPrint(inv)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="چاپ فاکتور رسمی استاندارد"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Contacts */}
      {subTab === 'contacts' && (
        <div className="space-y-3">
          {/* Mobile Contacts Card List (< md screens) */}
          <div className="md:hidden space-y-3">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{contact.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                      {contact.type === 'customer'
                        ? 'مشتری'
                        : contact.type === 'supplier'
                        ? 'تامین‌کننده'
                        : 'مشتری و تامین‌کننده'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{contact.code}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">مانده حساب جاری:</span>
                    <span
                      className={`font-bold ${
                        contact.currentBalance > 0
                          ? 'text-rose-600'
                          : contact.currentBalance < 0
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {formatCurrency(contact.currentBalance, state.settings.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">سقف اعتبار:</span>
                    <span className="text-slate-700 font-medium">
                      {formatCurrency(contact.creditLimit, state.settings.currency)}
                    </span>
                  </div>
                </div>

                {contact.phone && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-mono">{toPersianDigits(contact.phone)}</span>
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>تماس مستقیم</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Contacts Table (>= md screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">کد طرف‌حساب</th>
                    <th className="py-3 px-4">نام شخص / شرکت</th>
                    <th className="py-3 px-4">نوع</th>
                    <th className="py-3 px-4">شماره تماس</th>
                    <th className="py-3 px-4">شناسه ملی / کد اقتصادی</th>
                    <th className="py-3 px-4">سقف اعتبار</th>
                    <th className="py-3 px-4">مانده حساب جاری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{contact.code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{contact.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                          {contact.type === 'customer'
                            ? 'مشتری'
                            : contact.type === 'supplier'
                            ? 'تامین‌کننده'
                            : 'مشتری و تامین‌کننده'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{toPersianDigits(contact.phone)}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {contact.nationalId ? toPersianDigits(contact.nationalId) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {formatCurrency(contact.creditLimit, state.settings.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(contact.currentBalance, state.settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Cheques */}
      {subTab === 'cheques' && (
        <div className="space-y-3">
          {/* Mobile Cheques Cards */}
          <div className="md:hidden space-y-3">
            {filteredCheques.map((chq) => (
              <div key={chq.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{chq.bankName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        chq.type === 'received'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {chq.type === 'received' ? 'دریافتی' : 'پرداختی'}
                    </span>
                  </div>
                  <span className="font-bold text-xs text-emerald-700">
                    {formatCurrency(chq.amount, state.settings.currency)}
                  </span>
                </div>

                <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>شناسه صیاد:</span>
                    <span className="font-mono text-slate-900 font-bold">{toPersianDigits(chq.sayadNumber)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>سررسید:</span>
                    <span className="font-bold text-slate-800">{toPersianDigits(chq.dueDate)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>طرف حساب:</span>
                    <span className="text-slate-900 font-medium">{chq.contactName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Cheques Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">شماره صیاد</th>
                    <th className="py-3 px-4">نوع چک</th>
                    <th className="py-3 px-4">نام طرف حساب</th>
                    <th className="py-3 px-4">بانک / شعبه</th>
                    <th className="py-3 px-4">مبلغ چک</th>
                    <th className="py-3 px-4">تاریخ سررسید</th>
                    <th className="py-3 px-4">وضعیت سامانه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCheques.map((chq) => (
                    <tr key={chq.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{toPersianDigits(chq.sayadNumber)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            chq.type === 'received'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {chq.type === 'received' ? 'دریافتی از مشتری' : 'پرداختی به فروشنده'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{chq.contactName}</td>
                      <td className="py-3.5 px-4 text-slate-700">{chq.bankName}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(chq.amount, state.settings.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{toPersianDigits(chq.dueDate)}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          در جریان وصول
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Invoice Creation - 100% RESPONSIVE FOR MOBILE */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 sm:p-4 backdrop-blur-xs overflow-hidden">
          <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[95vh] sm:h-auto sm:max-h-[92vh] text-right overflow-hidden transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">صدور فاکتور جدید</h3>
                  <p className="text-[10px] text-slate-500 hidden sm:block">
                    محاسبه خودکار انبار، حساب طرف‌حساب و صدور سند دوبل مالی
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewInvoiceModal(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:bg-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitInvoice} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Type Switcher & Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع فاکتور</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewInvoiceType('sales')}
                      className={`py-2 text-xs font-bold rounded-lg transition min-h-[40px] flex items-center justify-center ${
                        newInvoiceType === 'sales'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      فروش کالا
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInvoiceType('purchase')}
                      className={`py-2 text-xs font-bold rounded-lg transition min-h-[40px] flex items-center justify-center ${
                        newInvoiceType === 'purchase'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      خرید مواد/کالا
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">طرف‌حساب (مشتری/فروشنده)</label>
                    <button
                      type="button"
                      onClick={() => setShowContactModal(true)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold"
                    >
                      + افزودن سریع
                    </button>
                  </div>
                  <select
                    value={newContactId}
                    onChange={(e) => setNewContactId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
                  >
                    {state.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'customer' ? 'مشتری' : 'تامین‌کننده'}) - مانده:{' '}
                        {formatCurrency(c.currentBalance, state.settings.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">تاریخ صدور (شمسی)</label>
                    <button
                      type="button"
                      onClick={() => setNewInvoiceDate(getJalaliDate())}
                      className="text-[10px] text-slate-500 hover:text-emerald-600 font-medium"
                    >
                      امروز
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newInvoiceDate}
                    onChange={(e) => setNewInvoiceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Currency Selection & Automatic Exchange Rate Module */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 border border-slate-700 space-y-3 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold block text-slate-100">انتخاب ارز فاکتور و نرخ تبدیل خودکار</span>
                      <span className="text-[10px] text-slate-400">
                        قابلیت صدور فاکتور با دلار، یورو، ریال یا تومان و تبدیل هوشمند در سود و زیان
                      </span>
                    </div>
                  </div>

                  {/* Currency Options Selector */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-700/80 shrink-0">
                    {(['TOMAN', 'USD', 'EUR', 'IRR'] as AppCurrency[]).map((curr) => {
                      const cfg = CURRENCY_CONFIG[curr];
                      const isSelected = newInvoiceCurrency === curr;
                      return (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => handleCurrencyChange(curr)}
                          className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span>{cfg.flag}</span>
                          <span>{cfg.symbol}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Exchange Rate controls (if not base Toman) */}
                {newInvoiceCurrency !== 'TOMAN' ? (
                  <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          نرخ تبدیل فعال سامانه
                        </span>
                        <span className="text-slate-200 font-bold text-xs">
                          ۱ {CURRENCY_CONFIG[newInvoiceCurrency].nameFa} = {toPersianDigits(formatNumber(newInvoiceExchangeRate))} تومان
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        اقلام فاکتور با {CURRENCY_CONFIG[newInvoiceCurrency].symbol} محاسبه شده و معادل آن ({formatCurrency(convertedGrandTotal, 'تومان')}) به‌صورت خودکار در تراز دفاتر دوبل، حساب طرف‌حساب و صورت سود و زیان درج خواهد شد.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                      <label className="text-[10px] text-slate-300 whitespace-nowrap">نرخ تبدیل (تومان):</label>
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={newInvoiceExchangeRate}
                        onChange={(e) => {
                          const r = Math.max(0.0001, Number(e.target.value) || 1);
                          setNewInvoiceExchangeRate(r);
                        }}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const defaultR = state.settings.exchangeRates?.[newInvoiceCurrency] || CURRENCY_CONFIG[newInvoiceCurrency].defaultRate;
                          setNewInvoiceExchangeRate(defaultR);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition"
                        title="بازنشانی به نرخ پیش‌فرض سامانه"
                      >
                        پیش‌فرض
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                    <span>ارز مبنای حسابداری: تومان ایران (دفاتر قانونی استاندارد)</span>
                    <span className="text-emerald-400 font-bold">نرخ پایه: ۱.۰</span>
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div className="border border-slate-200 rounded-2xl p-3 sm:p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">اقلام و ردیف‌های فاکتور</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {toPersianDigits(newInvoiceItems.length)} قلم
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      ارز: {CURRENCY_CONFIG[newInvoiceCurrency].symbol}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3.5 py-2 rounded-xl transition shadow-xs min-h-[40px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن ردیف کالا</span>
                  </button>
                </div>

                {/* Items Container: Mobile Card Layout + Desktop Table Layout */}
                <div className="space-y-3">
                  {newInvoiceItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-white p-3.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                    >
                      {/* Top bar of row: Item number, product select, and delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 mb-0.5 sm:hidden">کالا / محصول:</label>
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 min-h-[42px]"
                            >
                              {state.products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (موجودی: {formatNumber(p.stock)} {p.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={newInvoiceItems.length <= 1}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl disabled:opacity-30 min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
                          title="حذف ردیف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Inputs Grid: Responsive with large touch steppers for mobile */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                        {/* Quantity with Stepper */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            تعداد ({item.unit})
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQuantityStep(idx, -1)}
                              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold text-base transition shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-1.5 text-xs font-bold font-mono focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityStep(idx, 1)}
                              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold text-base transition shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            قیمت واحد ({CURRENCY_CONFIG[newInvoiceCurrency].symbol})
                          </label>
                          <input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-800 min-h-[42px]"
                          />
                        </div>

                        {/* Discount */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            تخفیف ({CURRENCY_CONFIG[newInvoiceCurrency].symbol})
                          </label>
                          <input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 min-h-[42px]"
                          />
                        </div>

                        {/* Row Total & Tax */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 flex flex-col justify-center">
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>مالیات ۱۰٪:</span>
                            <span className="font-mono">{formatAmountWithCurrency(item.taxAmount, newInvoiceCurrency)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black text-slate-900 mt-1">
                            <span>جمع ردیف:</span>
                            <span className="font-mono text-emerald-700">
                              {formatAmountWithCurrency(item.total, newInvoiceCurrency)}
                            </span>
                          </div>
                          {newInvoiceCurrency !== 'TOMAN' && (
                            <div className="text-[9px] text-slate-400 font-mono text-left mt-0.5">
                              معادل: {formatCurrency(item.total * newInvoiceExchangeRate, 'تومان')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping, Notes & Payment Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    هزینه باربری و حمل ({CURRENCY_CONFIG[newInvoiceCurrency].symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono min-h-[42px]"
                    placeholder="۰"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    مبلغ پرداختی نقدی / واریزی ({CURRENCY_CONFIG[newInvoiceCurrency].symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono min-h-[42px]"
                    placeholder="۰"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">توضیحات و شرایط تحویل</label>
                  <input
                    type="text"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-emerald-950 text-white p-4 rounded-2xl space-y-2 text-xs shadow-md">
                <div className="flex justify-between text-emerald-200">
                  <span>جمع کل اقلام ناخالص ({CURRENCY_CONFIG[newInvoiceCurrency].symbol}):</span>
                  <span className="font-mono">{formatAmountWithCurrency(subtotal, newInvoiceCurrency)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>مجموع تخفیفات:</span>
                    <span className="font-mono">- {formatAmountWithCurrency(totalDiscount, newInvoiceCurrency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-200">
                  <span>مالیات بر ارزش افزوده (۱۰٪):</span>
                  <span className="font-mono">{formatAmountWithCurrency(totalTax, newInvoiceCurrency)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-emerald-800">
                  <span>مبلغ قابل پرداخت فاکتور ({CURRENCY_CONFIG[newInvoiceCurrency].symbol}):</span>
                  <span className="font-mono text-emerald-300 text-lg">
                    {formatAmountWithCurrency(grandTotal, newInvoiceCurrency)}
                  </span>
                </div>
                {newInvoiceCurrency !== 'TOMAN' && (
                  <div className="bg-emerald-900/80 p-2.5 rounded-xl border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-amber-200 text-xs">معادل ریالی در تراز و صورت سود و زیان:</span>
                    <span className="font-mono font-black text-amber-300 text-sm">
                      {formatCurrency(convertedGrandTotal, 'تومان')}
                      <span className="text-[10px] text-emerald-200 font-normal mr-1.5">
                        (با نرخ برابری {toPersianDigits(formatNumber(newInvoiceExchangeRate))})
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-amber-300 font-bold pt-1">
                  <span>مانده بدهی فاکتور (نسیه):</span>
                  <span className="font-mono">{formatAmountWithCurrency(remainingAmount, newInvoiceCurrency)}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewInvoiceModal(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="w-1/3 py-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition min-h-[46px] flex items-center justify-center"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition shadow-lg shadow-emerald-700/20 min-h-[46px] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت رسمی فاکتور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Contact */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">تعریف طرف‌حساب جدید</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام شخص / نام شرکت</label>
                <input
                  type="text"
                  required
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="مثال: شرکت فولاد آرین یا علی محمدی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع طرف‌حساب</label>
                <select
                  value={newContactType}
                  onChange={(e) => setNewContactType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                >
                  <option value="customer">مشتری (خریدار)</option>
                  <option value="supplier">تامین‌کننده (فروشنده مواد اولیه/کالا)</option>
                  <option value="both">هم خریدار هم فروشنده</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تلفن تماس / همراه</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="۰۹۱۲..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سقف اعتبار تجاری (تومان)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newContactCreditLimit}
                  onChange={(e) => setNewContactCreditLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2.5 bg-slate-100 rounded-xl text-slate-600 font-medium min-h-[42px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold min-h-[42px]"
                >
                  ذخیره شخص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Cheque */}
      {showChequeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">ثبت چک صیادی جدید</h3>
              <button
                onClick={() => setShowChequeModal(false)}
                className="text-slate-400 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCheque} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع چک</label>
                <select
                  value={newChequeType}
                  onChange={(e) => setNewChequeType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                >
                  <option value="received">چک دریافتی از مشتری</option>
                  <option value="issued">چک پرداختی به فروشنده</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شناسه صیادی ۱۶ رقمی</label>
                <input
                  type="text"
                  maxLength={16}
                  inputMode="numeric"
                  value={newSayadNumber}
                  onChange={(e) => setNewSayadNumber(e.target.value)}
                  placeholder="مثال: ۷۱۵۲۹۰۱۴۵۵۲۸۱۴۰۲"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مبلغ چک (تومان)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newChequeAmount}
                  onChange={(e) => setNewChequeAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاریخ سررسید (شمسی)</label>
                <input
                  type="text"
                  value={newChequeDueDate}
                  onChange={(e) => setNewChequeDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">بانک صادرکننده</label>
                <input
                  type="text"
                  value={newChequeBank}
                  onChange={(e) => setNewChequeBank(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[42px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowChequeModal(false)}
                  className="px-4 py-2.5 bg-slate-100 rounded-xl text-slate-600 font-medium min-h-[42px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold min-h-[42px]"
                >
                  ثبت در سامانه چک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal - Full screen responsive */}
      {selectedInvoiceToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-4 sm:p-8 text-right my-2 sm:my-8 max-h-[96vh] overflow-y-auto print:p-0 print:m-0 print:shadow-none">
            {/* Header controls (hidden when printing) */}
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200 mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm font-bold text-slate-700">پیش‌نمایش فاکتور رسمی</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs min-h-[38px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ / ذخیره PDF</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceToPrint(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Tax Invoice Design */}
            <div className="border sm:border-2 border-slate-800 p-3 sm:p-6 rounded-xl space-y-4 text-slate-900 text-xs">
              {/* Title & Organization Header */}
              <div className="text-center pb-3 border-b sm:border-b-2 border-slate-800">
                <h2 className="text-base sm:text-lg font-black tracking-tight">{state.settings.businessName}</h2>
                <h3 className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                  صورتحساب {selectedInvoiceToPrint.type === 'sales' ? 'فروش کالا و خدمات' : 'خرید رسمی'}
                </h3>
                <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] mt-2 sm:mt-3 text-slate-600 gap-1">
                  <span>
                    شماره فاکتور:{' '}
                    <strong className="font-mono text-slate-900">{selectedInvoiceToPrint.invoiceNumber}</strong>
                  </span>
                  <span>
                    تاریخ صدور: <strong>{toPersianDigits(selectedInvoiceToPrint.date)}</strong>
                  </span>
                  <span>
                    ارز صورتحساب:{' '}
                    <strong className="text-slate-900">
                      {CURRENCY_CONFIG[selectedInvoiceToPrint.currency || 'TOMAN'].nameFa} ({CURRENCY_CONFIG[selectedInvoiceToPrint.currency || 'TOMAN'].symbol})
                    </strong>
                    {selectedInvoiceToPrint.currency && selectedInvoiceToPrint.currency !== 'TOMAN' && (
                      <span className="text-[10px] text-slate-500 mr-1">
                        [نرخ برابری: {toPersianDigits(formatNumber(selectedInvoiceToPrint.exchangeRate || 1))} تومان]
                      </span>
                    )}
                  </span>
                  <span>
                    کد اقتصادی: <strong>{toPersianDigits(state.settings.taxNumber)}</strong>
                  </span>
                </div>
              </div>

              {/* Seller & Buyer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-300 p-3 rounded-lg bg-slate-50/50">
                <div>
                  <span className="font-bold text-slate-800 block mb-1">مشخصات فروشنده:</span>
                  <p className="text-slate-700">{state.settings.businessName}</p>
                  <p className="text-slate-600 mt-0.5">آدرس: {state.settings.address}</p>
                  <p className="text-slate-600 mt-0.5">تلفن: {toPersianDigits(state.settings.phone)}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-1">مشخصات خریدار:</span>
                  <p className="text-slate-800 font-semibold">{selectedInvoiceToPrint.contactName}</p>
                  <p className="text-slate-600 mt-0.5">
                    وضعیت تسویه:{' '}
                    {selectedInvoiceToPrint.paymentStatus === 'paid' ? 'تسویه نقدی کامل' : 'اعتباری / نسیه'}
                  </p>
                  <p className="text-slate-600 mt-0.5">نحوه ارسال: {selectedInvoiceToPrint.notes || 'تحویل درب انبار'}</p>
                </div>
              </div>

              {/* Invoice Items Table (with horizontal scroll on small mobile if needed) */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse border border-slate-300 min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300 text-center">ردیف</th>
                      <th className="p-2 border border-slate-300">شرح کالا یا خدمت</th>
                      <th className="p-2 border border-slate-300 text-center">تعداد</th>
                      <th className="p-2 border border-slate-300">
                        قیمت واحد ({CURRENCY_CONFIG[selectedInvoiceToPrint.currency || 'TOMAN'].symbol})
                      </th>
                      <th className="p-2 border border-slate-300">
                        تخفیف ({CURRENCY_CONFIG[selectedInvoiceToPrint.currency || 'TOMAN'].symbol})
                      </th>
                      <th className="p-2 border border-slate-300">مالیات ۱۰٪</th>
                      <th className="p-2 border border-slate-300">
                        مبلغ کل ({CURRENCY_CONFIG[selectedInvoiceToPrint.currency || 'TOMAN'].symbol})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceToPrint.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-300">
                        <td className="p-2 border border-slate-300 text-center">{toPersianDigits(idx + 1)}</td>
                        <td className="p-2 border border-slate-300 font-semibold">{item.productName}</td>
                        <td className="p-2 border border-slate-300 text-center font-mono">
                          {toPersianDigits(item.quantity)} {item.unit}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono">
                          {formatAmountWithCurrency(item.unitPrice, selectedInvoiceToPrint.currency || 'TOMAN', false)}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono">
                          {formatAmountWithCurrency(item.discount, selectedInvoiceToPrint.currency || 'TOMAN', false)}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono">
                          {formatAmountWithCurrency(item.taxAmount, selectedInvoiceToPrint.currency || 'TOMAN', false)}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold font-mono">
                          {formatAmountWithCurrency(item.total, selectedInvoiceToPrint.currency || 'TOMAN', false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total calculations */}
              <div className="flex justify-end text-xs">
                <div className="w-full sm:w-80 space-y-1.5 border border-slate-300 p-3 rounded-lg bg-slate-50">
                  <div className="flex justify-between text-slate-700">
                    <span>جمع اقلام:</span>
                    <span>{formatAmountWithCurrency(selectedInvoiceToPrint.subtotal, selectedInvoiceToPrint.currency || 'TOMAN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>مالیات ارزش افزوده:</span>
                    <span>{formatAmountWithCurrency(selectedInvoiceToPrint.totalTax, selectedInvoiceToPrint.currency || 'TOMAN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-300 text-sm">
                    <span>مبلغ کل فاکتور ({CURRENCY_CONFIG[selectedInvoiceToPrint.currency || 'TOMAN'].symbol}):</span>
                    <span className="font-mono text-emerald-800">
                      {formatAmountWithCurrency(selectedInvoiceToPrint.grandTotal, selectedInvoiceToPrint.currency || 'TOMAN')}
                    </span>
                  </div>
                  {selectedInvoiceToPrint.currency && selectedInvoiceToPrint.currency !== 'TOMAN' && (
                    <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-dashed border-slate-300 text-xs bg-emerald-50/60 p-1.5 rounded-sm">
                      <span>معادل در دفاتر قانونی (تومان):</span>
                      <span className="font-mono text-emerald-900">
                        {formatCurrency(
                          selectedInvoiceToPrint.baseCurrencyGrandTotal ||
                            selectedInvoiceToPrint.grandTotal * (selectedInvoiceToPrint.exchangeRate || 1),
                          'تومان'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs pt-4 sm:pt-6 text-slate-700 border-t border-slate-300">
                <div>
                  <p className="font-bold">مهر و امضای فروشنده</p>
                  <div className="h-12 mt-1 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <p className="font-bold">حسابداری و مالی</p>
                  <div className="h-12 mt-1 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <p className="font-bold">مهر و امضای خریدار</p>
                  <div className="h-12 mt-1 border-b border-dashed border-slate-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
