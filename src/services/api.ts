import { AppState, Product, Invoice, ProductionOrder } from '../types';
import { initialAppState } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'amiran_accounting_cache_v3';

export async function fetchAppState(): Promise<AppState> {
  try {
    const response = await fetch('/api/state', {
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const json = await response.json();
      if (json.data) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Network offline or backend sync unreachable, using local cache:', err);
  }

  // Fallback to local storage if offline
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  return initialAppState;
}

export async function syncAppState(state: AppState): Promise<boolean> {
  // Always update local storage first
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
    return response.ok;
  } catch (err) {
    console.warn('Failed to sync to cloud backend, cached locally:', err);
    return false;
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveProductToApi(product: Product): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveInvoiceToApi(invoice: Invoice): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const apiService = {
  getInitialState(): AppState {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return initialAppState;
  },

  saveLocalState(state: AppState): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Error saving to localStorage:', e);
    }
  },

  async syncWithCloud(state: AppState): Promise<AppState> {
    this.saveLocalState(state);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          this.saveLocalState(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Cloud sync error, fallback to local state:', err);
    }
    return state;
  },

  async analyzeBackupFile(fileContent: string, fileName: string) {
    const response = await fetch('/api/v1/backup/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileContent, fileName }),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در تحلیل فایل پشتیبان');
    }
    return json.data;
  },

  async getBackupSample(type: 'sepidar' | 'holoo' | 'excel') {
    const response = await fetch(`/api/v1/backup/samples/${type}`);
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در دریافت نمونه');
    }
    return json;
  },

  async commitBackupImport(analysis: any, options: any, customMappings?: any[]) {
    const response = await fetch('/api/v1/backup/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, options, customMappings }),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در ثبت نهایی انتقال');
    }
    if (json.updatedState) {
      this.saveLocalState(json.updatedState);
    }
    return json;
  },

  async rollbackBackup() {
    const response = await fetch('/api/v1/backup/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در بازگردانی داده‌ها');
    }
    if (json.updatedState) {
      this.saveLocalState(json.updatedState);
    }
    return json;
  },

  // --- Super Admin & Auth APIs ---
  async adminLogin(password: string) {
    const response = await fetch('/api/v1/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'رمز عبور مدیریت نادرست است');
    }
    return json;
  },

  async getAdminOverview() {
    const response = await fetch('/api/v1/admin/overview');
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در دریافت اطلاعات داشبورد مدیریت');
    }
    return json.data;
  },

  async saveUser(user: any) {
    const isNew = !user.id || user.id.startsWith('temp_');
    const url = isNew ? '/api/v1/admin/users' : `/api/v1/admin/users/${user.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در ذخیره اطلاعات کاربر');
    }
    return json.data;
  },

  async deleteUser(userId: string) {
    const response = await fetch(`/api/v1/admin/users/${userId}`, {
      method: 'DELETE',
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در حذف کاربر');
    }
    return json;
  },

  async savePlan(plan: any) {
    const response = await fetch('/api/v1/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در ذخیره پلن اشتراک');
    }
    return json.data;
  },

  async deletePlan(planId: string) {
    const response = await fetch(`/api/v1/admin/plans/${planId}`, {
      method: 'DELETE',
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در حذف پلن');
    }
    return json;
  },

  async grantSubscription(data: { planId: string; additionalDays: number; reason: string; actor?: string }) {
    const response = await fetch('/api/v1/admin/subscriptions/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در تخصیص اشتراک');
    }
    return json;
  },

  async approvePayment(paymentId: string) {
    const response = await fetch(`/api/v1/admin/payments/${paymentId}/approve`, {
      method: 'POST',
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در تأیید فیش بانکی');
    }
    return json;
  },

  async rejectPayment(paymentId: string, reason: string) {
    const response = await fetch(`/api/v1/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در رد فیش بانکی');
    }
    return json;
  },

  async updateAdminSettings(settings: any) {
    const response = await fetch('/api/v1/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در بروزرسانی تنظیمات مدیریت');
    }
    return json.settings;
  },

  async getSubscriptionStatus() {
    const response = await fetch('/api/v1/subscription/status');
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در دریافت وضعیت اشتراک');
    }
    return json;
  },

  async submitSubscriptionPayment(payload: {
    planId: string;
    durationMonths: number;
    paymentMethod: 'online_gateway' | 'card_to_card';
    cardDetails?: any;
    receiptDetails?: any;
  }) {
    const response = await fetch('/api/v1/subscription/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'خطا در پردازش پرداخت اشتراک');
    }
    return json;
  },
};
