import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileText,
  Plus,
  Package,
  Menu,
  ShieldAlert,
  KeyRound,
  Crown,
} from 'lucide-react';
import { AppState, Invoice, Product, Contact, Cheque, BOM, ProductionOrder, JournalEntry, Plugin } from './types';
import { apiService } from './services/api';
import { generateId, getJalaliDate } from './utils/persian';

// Layout & Components
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CommercialView } from './components/CommercialView';
import { ManufacturingView } from './components/ManufacturingView';
import { InventoryView } from './components/InventoryView';
import { AccountingView } from './components/AccountingView';
import { PluginsView } from './components/PluginsView';
import { ApiDocsView } from './components/ApiDocsView';
import { DesktopExportView } from './components/DesktopExportView';
import { BackupAnalyzerView } from './components/BackupAnalyzerView';
import { AdminManagementView } from './components/AdminManagementView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { SubscriptionModal } from './components/SubscriptionModal';

export default function App() {
  const [state, setState] = useState<AppState>(() => apiService.getInitialState());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(true);

  // Quick Action Modals trigger
  const [openNewInvoiceModal, setOpenNewInvoiceModal] = useState(false);
  const [openNewProductionModal, setOpenNewProductionModal] = useState(false);

  // Super Admin & Subscription states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('amiran_admin_unlocked') === 'true';
  });
  const [currentAdminUser, setCurrentAdminUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('amiran_admin_user') || 'null');
    } catch {
      return null;
    }
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const handleAdminLoginSuccess = (token: string, user: any) => {
    setIsAdminUnlocked(true);
    setCurrentAdminUser(user);
    localStorage.setItem('amiran_admin_unlocked', 'true');
    localStorage.setItem('amiran_admin_token', token);
    if (user) {
      localStorage.setItem('amiran_admin_user', JSON.stringify(user));
    }
    setActiveTab('admin_panel');
  };

  const handleLogoutAdmin = () => {
    setIsAdminUnlocked(false);
    setCurrentAdminUser(null);
    localStorage.removeItem('amiran_admin_unlocked');
    localStorage.removeItem('amiran_admin_token');
    localStorage.removeItem('amiran_admin_user');
    if (activeTab === 'admin_panel') {
      setActiveTab('dashboard');
    }
  };

  // Initial cloud sync on mount
  useEffect(() => {
    let isMounted = true;
    const initialSync = async () => {
      setIsSyncing(true);
      try {
        const syncedState = await apiService.syncWithCloud(state);
        if (isMounted) {
          setState(syncedState);
          setCloudConnected(true);
        }
      } catch (err) {
        console.warn('Working with local state, cloud fallback:', err);
        if (isMounted) setCloudConnected(false);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };
    initialSync();
    return () => {
      isMounted = false;
    };
  }, []);

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => setCloudConnected(true);
    const handleOffline = () => setCloudConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync helper
  const persistAndSync = useCallback(async (newState: AppState) => {
    setState(newState);
    apiService.saveLocalState(newState);
    try {
      setIsSyncing(true);
      await apiService.syncWithCloud(newState);
      setCloudConnected(true);
    } catch {
      setCloudConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await apiService.syncWithCloud(state);
      setState(synced);
      setCloudConnected(true);
    } catch {
      setCloudConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Invoices
  const handleSaveInvoice = (newInvoice: Invoice) => {
    // A. Update inventory stocks
    const updatedProducts = state.products.map((prod) => {
      const item = newInvoice.items.find((i) => i.productId === prod.id);
      if (item) {
        const stockDiff = newInvoice.type === 'sales' ? -item.quantity : item.quantity;
        return { ...prod, stock: Math.max(0, prod.stock + stockDiff) };
      }
      return prod;
    });

    // Conversion rates for foreign currency invoices
    const rate = Number(newInvoice.exchangeRate) || 1;
    const isForeign = newInvoice.currency && newInvoice.currency !== 'TOMAN';
    const invoiceWithBaseTotals: Invoice = {
      ...newInvoice,
      exchangeRate: rate,
      baseCurrencyGrandTotal: newInvoice.baseCurrencyGrandTotal || Math.round(newInvoice.grandTotal * rate),
      baseCurrencyPaidAmount: newInvoice.baseCurrencyPaidAmount || Math.round(newInvoice.paidAmount * rate),
      baseCurrencyRemainingAmount: newInvoice.baseCurrencyRemainingAmount || Math.round(newInvoice.remainingAmount * rate),
    };

    const baseRemaining = invoiceWithBaseTotals.baseCurrencyRemainingAmount || 0;
    const basePaid = invoiceWithBaseTotals.baseCurrencyPaidAmount || 0;
    const baseSubtotal = Math.round((newInvoice.subtotal - newInvoice.totalDiscount) * rate);
    const baseTax = Math.round(newInvoice.totalTax * rate);
    const baseGrandTotal = invoiceWithBaseTotals.baseCurrencyGrandTotal || 0;

    // B. Update contact balance in base currency (Toman)
    const updatedContacts = state.contacts.map((c) => {
      if (c.id === newInvoice.contactId) {
        const balanceChange = newInvoice.type === 'sales' ? baseRemaining : -baseRemaining;
        return { ...c, currentBalance: c.currentBalance + balanceChange };
      }
      return c;
    });

    // C. Auto generate Journal Entry for double-entry ledger in base currency
    const journalId = generateId('JRN');
    const currencySuffix = isForeign ? ` [معادل ارزی: ${newInvoice.grandTotal.toLocaleString()} ${newInvoice.currency} با نرخ ${rate.toLocaleString()} تومان]` : '';
    const autoJournalEntry: JournalEntry = {
      id: journalId,
      entryNumber: state.journalEntries.length + 1,
      date: newInvoice.date,
      referenceNumber: newInvoice.invoiceNumber,
      description: `ثبت خودکار فاکتور ${newInvoice.type === 'sales' ? 'فروش' : 'خرید'} شماره ${newInvoice.invoiceNumber} - ${newInvoice.contactName}${currencySuffix}`,
      rows:
        newInvoice.type === 'sales'
          ? [
              {
                id: generateId('ROW'),
                accountId: 'ACC-101',
                accountCode: '101',
                accountName: 'موجودی نقد و بانک',
                description: `دریافتی نقدی فاکتور ${newInvoice.invoiceNumber}`,
                debit: basePaid,
                credit: 0,
              },
              {
                id: generateId('ROW'),
                accountId: 'ACC-102',
                accountCode: '103',
                accountName: 'حساب‌های دریافتنی تجاری',
                description: `مانده نسیه مشتری ${newInvoice.contactName}`,
                debit: baseRemaining,
                credit: 0,
              },
              {
                id: generateId('ROW'),
                accountId: 'ACC-401',
                accountCode: '401',
                accountName: 'فروش و درآمد عملیاتی',
                description: 'درآمد حاصل از فروش کالا و خدمات',
                debit: 0,
                credit: baseSubtotal,
              },
              {
                id: generateId('ROW'),
                accountId: 'ACC-202',
                accountCode: '202',
                accountName: 'مالیات بر ارزش افزوده پرداختنی',
                description: 'مالیات بر ارزش افزوده قانونی',
                debit: 0,
                credit: baseTax,
              },
            ].filter((r) => r.debit > 0 || r.credit > 0)
          : [
              {
                id: generateId('ROW'),
                accountId: 'ACC-103',
                accountCode: '104',
                accountName: 'موجودی مواد اولیه و کالا',
                description: `خرید اقلام فاکتور ${newInvoice.invoiceNumber}`,
                debit: Math.round(newInvoice.subtotal * rate),
                credit: 0,
              },
              {
                id: generateId('ROW'),
                accountId: 'ACC-101',
                accountCode: '101',
                accountName: 'موجودی نقد و بانک',
                description: `پرداخت بهای خرید ${newInvoice.contactName}`,
                debit: 0,
                credit: basePaid,
              },
              {
                id: generateId('ROW'),
                accountId: 'ACC-201',
                accountCode: '201',
                accountName: 'حساب‌های پرداختنی تجاری',
                description: `بدهی به تامین‌کننده ${newInvoice.contactName}`,
                debit: 0,
                credit: baseRemaining,
              },
            ].filter((r) => r.debit > 0 || r.credit > 0),
      totalDebit: baseGrandTotal,
      totalCredit: baseGrandTotal,
      status: 'approved',
      source: 'invoice',
    };

    const newState: AppState = {
      ...state,
      invoices: [invoiceWithBaseTotals, ...state.invoices],
      products: updatedProducts,
      contacts: updatedContacts,
      journalEntries: [autoJournalEntry, ...state.journalEntries],
    };

    persistAndSync(newState);
  };

  // 2. Contacts
  const handleSaveContact = (contact: Contact) => {
    const exists = state.contacts.some((c) => c.id === contact.id);
    const updated = exists
      ? state.contacts.map((c) => (c.id === contact.id ? contact : c))
      : [contact, ...state.contacts];
    persistAndSync({ ...state, contacts: updated });
  };

  // 3. Cheques
  const handleSaveCheque = (cheque: Cheque) => {
    const exists = state.cheques.some((c) => c.id === cheque.id);
    const updated = exists
      ? state.cheques.map((c) => (c.id === cheque.id ? cheque : c))
      : [cheque, ...state.cheques];
    persistAndSync({ ...state, cheques: updated });
  };

  // 4. Products
  const handleSaveProduct = (product: Product) => {
    const exists = state.products.some((p) => p.id === product.id);
    const updated = exists
      ? state.products.map((p) => (p.id === product.id ? product : p))
      : [product, ...state.products];
    persistAndSync({ ...state, products: updated });
  };

  // 5. BOMs
  const handleSaveBOM = (bom: BOM) => {
    const exists = state.boms.some((b) => b.id === bom.id);
    const updated = exists ? state.boms.map((b) => (b.id === bom.id ? bom : b)) : [bom, ...state.boms];
    persistAndSync({ ...state, boms: updated });
  };

  // 6. Production Orders
  const handleSaveProductionOrder = (order: ProductionOrder) => {
    const bom = state.boms.find((b) => b.id === order.bomId);
    if (!bom) return;

    const qty = order.actualQuantity || order.plannedQuantity;

    // A. Deduct raw materials from stock based on BOM * qty
    let updatedProducts = [...state.products];
    bom.items.forEach((item) => {
      const requiredQty = item.quantity * qty;
      updatedProducts = updatedProducts.map((p) => {
        if (p.id === item.rawMaterialId) {
          return { ...p, stock: Math.max(0, p.stock - requiredQty) };
        }
        return p;
      });
    });

    // B. Add finished goods to stock
    updatedProducts = updatedProducts.map((p) => {
      if (p.id === order.finishedGoodId) {
        return { ...p, stock: p.stock + qty, buyPrice: bom.unitCost };
      }
      return p;
    });

    // C. Auto Double-entry Journal Entry for Manufacturing (COGM)
    const journalId = generateId('JRN');
    const directMaterialCost = bom.totalDirectMaterialCost * qty;
    const directLaborCost = bom.directLaborCost * qty;
    const overheadCost = bom.overheadCost * qty;
    const totalOrderCost = order.totalCost;

    const autoProductionJournal: JournalEntry = {
      id: journalId,
      entryNumber: state.journalEntries.length + 1,
      date: order.endDate || order.startDate,
      referenceNumber: order.orderNumber,
      description: `ثبت بهای تمام‌شده تولید ${order.finishedGoodName} (تیراژ: ${qty} عدد)`,
      rows: [
        {
          id: generateId('ROW'),
          accountId: 'ACC-104',
          accountCode: '105',
          accountName: 'موجودی کالای ساخته شده',
          description: `ورود ${qty} واحد ${order.finishedGoodName} به انبار محصول`,
          debit: totalOrderCost,
          credit: 0,
        },
        {
          id: generateId('ROW'),
          accountId: 'ACC-103',
          accountCode: '104',
          accountName: 'موجودی مواد اولیه و کالا',
          description: 'کسر مواد اولیه مصرفی خط تولید',
          debit: 0,
          credit: directMaterialCost,
        },
        {
          id: generateId('ROW'),
          accountId: 'ACC-502',
          accountCode: '502',
          accountName: 'دستمزد مستقیم خط تولید جذب شده',
          description: 'جذب دستمزد کارگران تولید',
          debit: 0,
          credit: directLaborCost,
        },
        {
          id: generateId('ROW'),
          accountId: 'ACC-503',
          accountCode: '503',
          accountName: 'سربار ساخت جذب شده',
          description: 'جذب هزینه‌های سربار و استهلاک خط مونتاژ',
          debit: 0,
          credit: overheadCost,
        },
      ],
      totalDebit: totalOrderCost,
      totalCredit: totalOrderCost,
      status: 'approved',
      source: 'production',
    };

    const orderWithJournal: ProductionOrder = {
      ...order,
      journalEntryId: journalId,
    };

    const newState: AppState = {
      ...state,
      products: updatedProducts,
      productionOrders: [orderWithJournal, ...state.productionOrders],
      journalEntries: [autoProductionJournal, ...state.journalEntries],
    };

    persistAndSync(newState);
  };

  // 7. Manual Journal Entries
  const handleSaveJournalEntry = (entry: JournalEntry) => {
    const updated = [entry, ...state.journalEntries];
    persistAndSync({ ...state, journalEntries: updated });
  };

  // 8. Plugins
  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    const updated = state.plugins.map((p) => (p.id === pluginId ? { ...p, enabled } : p));
    persistAndSync({ ...state, plugins: updated });
  };

  const handleInstallPlugin = (plugin: Plugin) => {
    const exists = state.plugins.some((p) => p.id === plugin.id);
    const updated = exists
      ? state.plugins.map((p) => (p.id === plugin.id ? plugin : p))
      : [plugin, ...state.plugins];
    persistAndSync({ ...state, plugins: updated });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        businessName={state.settings.businessName}
        isSyncing={isSyncing}
        cloudConnected={cloudConnected}
        onManualSync={handleManualSync}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onNavigateAdmin={() => setActiveTab('admin_panel')}
        isAdminUnlocked={isAdminUnlocked}
        subscriptionDays={state.subscription?.daysRemaining || 0}
        subscriptionPlanName={state.subscription?.planName || 'پلن حرفه‌ای'}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-3 sm:p-5 gap-5 pb-24 lg:pb-5">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          pluginCount={state.plugins.length}
          isAdminUnlocked={isAdminUnlocked}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
          pendingReceiptsCount={state.paymentTransactions?.filter((t) => t.status === 'pending_verification').length || 0}
          subscriptionDays={state.subscription?.daysRemaining || 0}
          subscriptionPlanName={state.subscription?.planName || 'پلن حرفه‌ای'}
        />

        {/* Content View Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              state={state}
              onNavigate={(tab) => setActiveTab(tab)}
              onNewInvoice={() => {
                setActiveTab('commercial');
                setOpenNewInvoiceModal(true);
              }}
              onNewProduction={() => {
                setActiveTab('manufacturing');
                setOpenNewProductionModal(true);
              }}
            />
          )}

          {activeTab === 'admin_panel' && (
            isAdminUnlocked ? (
              <AdminManagementView
                state={state}
                onUpdateState={persistAndSync}
                onLogoutAdmin={handleLogoutAdmin}
                currentUser={currentAdminUser}
              />
            ) : (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">پنل مدیریت قفل است</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  جهت دسترسی به مدیریت کاربران، تغییر مجوزها، پلن‌های اشتراک و تأیید فیش‌های واریزی، رمز عبور مدیریت را وارد کنید.
                </p>
                <button
                  onClick={() => setIsAdminLoginModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 inline-flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>ورود با رمز عبور مدیریت</span>
                </button>
              </div>
            )
          )}

          {activeTab === 'backup_analyzer' && (
            <BackupAnalyzerView
              state={state}
              onUpdateState={(newState) => setState(newState)}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === 'commercial' && (
            <CommercialView
              state={state}
              onSaveInvoice={handleSaveInvoice}
              onSaveContact={handleSaveContact}
              onSaveCheque={handleSaveCheque}
              isCreateModalOpen={openNewInvoiceModal}
              onCloseCreateModal={() => setOpenNewInvoiceModal(false)}
            />
          )}

          {activeTab === 'manufacturing' && (
            <ManufacturingView
              state={state}
              onSaveBOM={handleSaveBOM}
              onSaveProductionOrder={handleSaveProductionOrder}
              isCreateOrderModalOpen={openNewProductionModal}
              onCloseCreateModal={() => setOpenNewProductionModal(false)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView state={state} onSaveProduct={handleSaveProduct} />
          )}

          {activeTab === 'accounting' && (
            <AccountingView state={state} onSaveJournalEntry={handleSaveJournalEntry} />
          )}

          {activeTab === 'plugins' && (
            <PluginsView
              state={state}
              onTogglePlugin={handleTogglePlugin}
              onInstallPlugin={handleInstallPlugin}
            />
          )}

          {activeTab === 'api_hub' && <ApiDocsView state={state} />}

          {activeTab === 'desktop_export' && (
            <DesktopExportView state={state} onTriggerSync={handleManualSync} />
          )}
        </main>
      </div>

      {/* Subscription and Payment Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        state={state}
        onUpdateState={persistAndSync}
      />

      {/* Super Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Modern Mobile Bottom Navigation Bar (< lg screens) */}
      <nav
        aria-label="منوی دسترسی سریع موبایل"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white px-2 py-1 flex items-center justify-around shadow-2xl"
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition min-w-[56px] min-h-[48px] justify-center ${
            activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">داشبورد</span>
        </button>

        <button
          onClick={() => setActiveTab('commercial')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition min-w-[56px] min-h-[48px] justify-center ${
            activeTab === 'commercial' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">فاکتورها</span>
        </button>

        {/* Elevated Center Quick Invoice FAB Button */}
        <div className="relative -top-4 flex flex-col items-center">
          <button
            id="mobile-fab-new-invoice"
            onClick={() => {
              setActiveTab('commercial');
              setOpenNewInvoiceModal(true);
            }}
            className="w-13 h-13 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/50 border-4 border-slate-900 active:scale-95 transition"
            aria-label="صدور سریع فاکتور با گوشی"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-emerald-400 mt-0.5">فاکتور جدید</span>
        </div>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition min-w-[56px] min-h-[48px] justify-center ${
            activeTab === 'inventory' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">انبارداری</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition min-w-[56px] min-h-[48px] justify-center"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">سایر بخش‌ها</span>
        </button>
      </nav>
    </div>
  );
}
