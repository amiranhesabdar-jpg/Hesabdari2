import React, { useState } from 'react';
import {
  Crown,
  CheckCircle2,
  Clock,
  CreditCard,
  Building,
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertTriangle,
  Receipt,
  Check,
  Send,
  Sparkles,
  X,
  Copy,
} from 'lucide-react';
import { AppState, SubscriptionPlan } from '../types';
import { apiService } from '../services/api';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    state.subscription?.planId || 'plan_pro'
  );
  const [cycle, setCycle] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'pay' | 'history'>('plans');

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState<'online_gateway' | 'card_to_card'>('online_gateway');
  const [cardNumber, setCardNumber] = useState('۶۰۳۷-۹۹۱۹-۸۲۳۴-۹۹۰۱');
  const [cvv2, setCvv2] = useState('۷۸۱');
  const [expMonth, setExpMonth] = useState('۰۸');
  const [expYear, setExpYear] = useState('۰۶');
  const [otpCode, setOtpCode] = useState('۴۸۲۹۱');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);

  // Card to Card inputs
  const [receiptNumber, setReceiptNumber] = useState('');
  const [senderName, setSenderName] = useState(state.settings?.businessName || '');
  const [senderCard, setSenderCard] = useState('');

  // Processing & result state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!isOpen) return null;

  const currentPlan = state.subscriptionPlans.find((p) => p.id === state.subscription?.planId) || state.subscriptionPlans[0];
  const targetPlan = state.subscriptionPlans.find((p) => p.id === selectedPlanId) || state.subscriptionPlans[0];

  const getPrice = (plan: SubscriptionPlan) => {
    if (cycle === 'monthly') return plan.monthlyPrice;
    if (cycle === 'quarterly') return plan.quarterlyPrice;
    return plan.annualPrice;
  };

  const getCycleLabel = () => {
    if (cycle === 'monthly') return 'یک‌ماهه';
    if (cycle === 'quarterly') return 'سه‌ماهه (با تخفیف ۱۰٪)';
    return 'یک‌ساله (با تخفیف ویژه ۲۵٪)';
  };

  const handleRequestOtp = () => {
    setOtpRequested(true);
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);

    const durationMonths = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12;

    try {
      const res = await apiService.submitSubscriptionPayment({
        planId: targetPlan.id,
        durationMonths,
        paymentMethod,
        cardDetails: {
          cardNumber,
          cvv2,
        },
        receiptDetails: {
          receiptNumber,
          senderName,
          senderCard,
        },
      });

      // Refresh state from backend
      const refreshed = await apiService.syncWithCloud(state);
      onUpdateState(refreshed);

      setPaymentSuccess(res);
      setActiveSubTab('pay');
    } catch (err: any) {
      setPaymentError(err.message || 'خطا در انجام پرداخت');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const companyCard = state.adminSettings?.companyCardNumber || '۶۰۳۷-۹۹۷۵-۱۱۲۲-۴۴۵۵';
  const companyIban = state.adminSettings?.companyIban || 'IR980170000000100445566778';
  const companyHolder = state.adminSettings?.companyCardHolder || 'گروه صنعتی امیران';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-600/30 via-emerald-600/20 to-slate-900 p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">مدیریت اشتراک و درگاه پرداخت</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  {state.subscription?.status === 'active' ? 'اشتراک فعال' : 'در انتظار تمدید'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                پلن کنونی: <strong className="text-white">{currentPlan.name}</strong> • اعتبار باقیمانده: <span className="text-amber-400 font-bold">{state.subscription?.daysRemaining || 0} روز</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSubTab('plans');
                setPaymentSuccess(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'plans'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>پلن‌های اشتراک</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('pay');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'pay'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>پرداخت و تمدید ({getPrice(targetPlan).toLocaleString()} ت)</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('history');
                setPaymentSuccess(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>تاریخچه پرداخت‌ها ({state.paymentTransactions?.length || 0})</span>
            </button>
          </div>

          {activeSubTab === 'plans' && (
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center text-[11px] font-medium border border-slate-700/60 shrink-0">
              <button
                onClick={() => setCycle('monthly')}
                className={`px-2.5 py-1 rounded-lg transition ${cycle === 'monthly' ? 'bg-slate-900 text-white font-bold' : 'text-slate-400'}`}
              >
                ماهانه
              </button>
              <button
                onClick={() => setCycle('quarterly')}
                className={`px-2.5 py-1 rounded-lg transition ${cycle === 'quarterly' ? 'bg-slate-900 text-emerald-400 font-bold' : 'text-slate-400'}`}
              >
                ۳ ماهه
              </button>
              <button
                onClick={() => setCycle('annual')}
                className={`px-2.5 py-1 rounded-lg transition ${cycle === 'annual' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400'}`}
              >
                سالانه (۲۵٪ تخفیف)
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: Subscription Plans Selection */}
          {activeSubTab === 'plans' && (
            <div className="space-y-6">
              {/* Current Active Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800/90 to-slate-800/40 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">وضعیت سرویس فعلی:</span>
                      <span className="text-xs font-bold text-white">{currentPlan.name}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      انقضای دوره: <strong className="text-emerald-400">{state.subscription?.endDate || '1404/05/01'}</strong> ({state.subscription?.daysRemaining} روز باقیمانده)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setSelectedPlanId(currentPlan.id);
                      setActiveSubTab('pay');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <span>تمدید همین پلن</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>

              {/* Plans Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {state.subscriptionPlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isCurrent = state.subscription?.planId === plan.id;
                  const price = getPrice(plan);

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative rounded-2xl p-5 border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-950/40'
                          : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/70 hover:border-slate-600'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-3 left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md">
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-sm text-white">{plan.name}</h3>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              پلن فعلی شما
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mb-4 line-clamp-2">{plan.tagline}</p>

                        <div className="mb-5 pb-4 border-b border-slate-700/70">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">{price.toLocaleString()}</span>
                            <span className="text-xs text-slate-400">تومان / {getCycleLabel()}</span>
                          </div>
                          {cycle === 'annual' && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              معادل ماهیانه {Math.round(price / 12).toLocaleString()} تومان
                            </span>
                          )}
                        </div>

                        {/* Limits Summary */}
                        <div className="space-y-2 mb-4 text-xs text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">سقف صدور فاکتور:</span>
                            <span className="font-bold text-white">
                              {plan.maxInvoicesPerMonth === -1 ? 'نامحدود' : `${plan.maxInvoicesPerMonth} فاکتور/ماه`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">تعداد کاربران:</span>
                            <span className="font-bold text-white">
                              {plan.maxUsers === -1 ? 'نامحدود' : `${plan.maxUsers} کاربر`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">تعداد انبارها:</span>
                            <span className="font-bold text-white">
                              {plan.maxWarehouses === -1 ? 'نامحدود' : `${plan.maxWarehouses} انبار`}
                            </span>
                          </div>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-2 text-xs text-slate-300 mb-6">
                          {plan.features.map((feature, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="text-[11px] leading-relaxed text-slate-300">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanId(plan.id);
                          setActiveSubTab('pay');
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            : 'bg-slate-700/80 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>انتخاب و پرداخت ({price.toLocaleString()} تومان)</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Payment Checkout & Gateway */}
          {activeSubTab === 'pay' && (
            <div className="space-y-6">
              {paymentSuccess ? (
                <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">عملیات با موفقیت انجام شد!</h3>
                  <p className="text-sm text-emerald-200 max-w-md mx-auto">
                    {paymentSuccess.message || 'پرداخت شما تأیید شد و اشتراک نرم‌افزار به صورت خودکار فعال گردید.'}
                  </p>
                  {paymentSuccess.transactionCode && (
                    <div className="inline-block px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400">
                      کد پیگیری تراکنش: <strong>{paymentSuccess.transactionCode}</strong>
                    </div>
                  )}
                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setPaymentSuccess(null);
                        setActiveSubTab('history');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
                    >
                      مشاهده سوابق و فاکتور
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
                    >
                      بستن و ادامه کار با نرم‌افزار
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Order Summary Column */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        <span>پیش‌فاکتور تمدید اشتراک</span>
                      </h4>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400">بسته انتخابی:</span>
                          <span className="font-bold text-white">{targetPlan.name}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400">دوره اشتراک:</span>
                          <span className="font-bold text-white">{getCycleLabel()}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400">نام سازمان / خریدار:</span>
                          <span className="font-bold text-white">{state.settings?.businessName}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-400">مالیات بر ارزش افزوده (۱۰٪):</span>
                          <span className="text-emerald-400 font-bold">۰ تومان (معاف اشتراک ابری)</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">مبلغ قابل پرداخت:</span>
                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-400">
                            {getPrice(targetPlan).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 mr-1">تومان</span>
                        </div>
                      </div>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online_gateway')}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
                          paymentMethod === 'online_gateway'
                            ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                        <span>درگاه شاپرک / شتاب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card_to_card')}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
                          paymentMethod === 'card_to_card'
                            ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Building className="w-5 h-5 text-amber-400" />
                        <span>کارت به کارت / فیش</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Inputs Form Column */}
                  <div className="lg:col-span-7">
                    {paymentError && (
                      <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {paymentMethod === 'online_gateway' ? (
                      /* Online Gateway Mock Form */
                      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">درگاه پرداخت اینترنتی شاپرک / زرین‌پال</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            SSL ۲۵۶ بیتی امن
                          </span>
                        </div>

                        {/* Card Number */}
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            شماره کارت ۱۶ رقمی:
                          </label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            dir="ltr"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono text-center tracking-widest focus:outline-hidden focus:border-emerald-500"
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                          />
                        </div>

                        {/* CVV2 and Expiry */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">کد CVV2:</label>
                            <input
                              type="password"
                              value={cvv2}
                              onChange={(e) => setCvv2(e.target.value)}
                              dir="ltr"
                              maxLength={4}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono text-center focus:outline-hidden focus:border-emerald-500"
                              placeholder="***"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">تاریخ انقضا:</label>
                            <div className="flex items-center gap-2" dir="ltr">
                              <input
                                type="text"
                                value={expMonth}
                                onChange={(e) => setExpMonth(e.target.value)}
                                maxLength={2}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-sm text-white font-mono text-center focus:outline-hidden focus:border-emerald-500"
                                placeholder="ماه"
                              />
                              <span className="text-slate-500">/</span>
                              <input
                                type="text"
                                value={expYear}
                                onChange={(e) => setExpYear(e.target.value)}
                                maxLength={2}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-sm text-white font-mono text-center focus:outline-hidden focus:border-emerald-500"
                                placeholder="سال"
                              />
                            </div>
                          </div>
                        </div>

                        {/* OTP code */}
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            رمز دوم پویا اینترنتی:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              dir="ltr"
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono tracking-widest focus:outline-hidden focus:border-emerald-500"
                              placeholder="رمز پیامک شده"
                            />
                            <button
                              type="button"
                              onClick={handleRequestOtp}
                              disabled={otpRequested && otpTimer > 0}
                              className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition disabled:opacity-50 shrink-0"
                            >
                              {otpRequested && otpTimer > 0 ? `ارسال مجدد (${otpTimer}s)` : 'دریافت رمز پویا'}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleProcessPayment}
                          disabled={isProcessing}
                          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <span>درحال اتصال به درگاه بانکی...</span>
                          ) : (
                            <>
                              <ShieldCheck className="w-5 h-5" />
                              <span>پرداخت امن بانکی ({getPrice(targetPlan).toLocaleString()} تومان)</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Card to Card Instructions & Form */
                      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                          <span className="text-xs font-bold text-white">مشخصات حساب بانکی رسمی شرکت</span>
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            تأیید توسط مدیریت
                          </span>
                        </div>

                        {/* Company Card & IBAN Box */}
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">شماره کارت:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-emerald-400 font-bold tracking-wider" dir="ltr">{companyCard}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyIban(companyCard)}
                                className="text-slate-400 hover:text-white"
                                title="کپی شماره کارت"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">شماره شبا:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-300 font-bold text-[11px]" dir="ltr">{companyIban}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyIban(companyIban)}
                                className="text-slate-400 hover:text-white"
                                title="کپی شماره شبا"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                            <span className="text-slate-400">به نام:</span>
                            <span className="font-bold text-white">{companyHolder}</span>
                          </div>

                          {copiedAccount && (
                            <p className="text-[10px] text-emerald-400 text-center pt-1">
                              شماره حساب با موفقیت کپی شد.
                            </p>
                          )}
                        </div>

                        {/* Receipt Form Inputs */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              شماره پیگیری / شماره ارجاع فیش:
                            </label>
                            <input
                              type="text"
                              value={receiptNumber}
                              onChange={(e) => setReceiptNumber(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                              placeholder="مثال: FISH-984210"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">نام واریز کننده:</label>
                              <input
                                type="text"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                                placeholder="نام شخص یا شرکت"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">۴ رقم آخر کارت واریزی:</label>
                              <input
                                type="text"
                                value={senderCard}
                                onChange={(e) => setSenderCard(e.target.value)}
                                dir="ltr"
                                maxLength={4}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-hidden focus:border-emerald-500"
                                placeholder="مثلا ۵۰۲۲"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleProcessPayment}
                          disabled={isProcessing || !receiptNumber}
                          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm transition shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <span>درحال ثبت فیش واریزی...</span>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>ثبت و ارسال فیش جهت تأیید مدیریت</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Payment History */}
          {activeSubTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>سوابق تراکنش‌ها و پرداخت‌های اشتراک</span>
              </h3>

              {(!state.paymentTransactions || state.paymentTransactions.length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-800/40 border border-slate-700">
                  هنوز پرداختی در سیستم ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-3">
                  {state.paymentTransactions.map((txn) => {
                    const isSuccess = txn.status === 'successful';
                    const isPending = txn.status === 'pending_verification';
                    const isRejected = txn.status === 'rejected';

                    return (
                      <div
                        key={txn.id}
                        className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{txn.planName}</span>
                            <span className="text-slate-400">({txn.durationMonths} ماهه)</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isSuccess
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isPending
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isSuccess ? 'موفق و تایید شده' : isPending ? 'در انتظار بررسی مدیریت' : 'رد شده'}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                            <span>تاریخ: {txn.createdAt}</span>
                            {txn.transactionCode && <span>کد رهگیری: <code className="font-mono text-slate-300">{txn.transactionCode}</code></span>}
                            {txn.receiptNumber && <span>شماره فیش: <code className="font-mono text-slate-300">{txn.receiptNumber}</code></span>}
                          </div>

                          {txn.notes && (
                            <p className="text-[11px] text-slate-400 pt-0.5">{txn.notes}</p>
                          )}
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-base font-bold text-emerald-400">
                            {txn.amount === 0 ? 'رایگان (مدیریت)' : `${txn.amount.toLocaleString()} تومان`}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {txn.paymentMethod === 'online_gateway'
                              ? 'درگاه آنلاین شاپرک'
                              : txn.paymentMethod === 'card_to_card'
                              ? 'واریز کارت به کارت'
                              : 'تخصیص سیستمی'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>پشتیبانی و تمدید آنلاین ۲۴ ساعته</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
