import React, { useState, useEffect, useRef } from 'react';
import { Landmark, Smartphone, Gift, TrendingUp, X, Award, AlertCircle, PieChart as PieChartIcon, List, ChevronLeft, ChevronRight, Wallet, Sparkles, Lock, Unlock, Calculator, CheckCircle2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBeJPzPa37CsIHlMsBGkFgwKt3OEBk47tw",
  authDomain: "macau-rewards-2026-378de.firebaseapp.com",
  projectId: "macau-rewards-2026-378de",
  storageBucket: "macau-rewards-2026-378de.firebasestorage.app",
  messagingSenderId: "678291549394",
  appId: "1:678291549394:web:945ebfb08a7cf66bab910b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'macau-rewards-2026-378de';

const PAYMENT_METHODS = ['工商銀行', '中國銀行', '國際銀行', 'MPay', 'UePay', '支付寶', '豐付寶', '廣發銀行'];
const AMOUNT_CYCLE = [null, 0, 10, 20, 50, 100, 200];
const AMOUNT_COLORS = { 0: '#e5e7eb', 10: '#93c5fd', 20: '#86efac', 50: '#fde047', 100: '#fca5a5', 200: '#d8b4fe' };
const AMOUNT_CLASSES = {
  10: 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm',
  20: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm',
  50: 'bg-amber-50 text-amber-600 border-amber-300 shadow-sm',
  100: 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm',
  200: 'bg-purple-50 text-purple-600 border-purple-200 shadow-sm'
};
const WEEKS = [
  { id: 1, label: '第 1 週', date: '10/4 - 16/4' }, { id: 2, label: '第 2 週', date: '17/4 - 23/4' },
  { id: 3, label: '第 3 週', date: '24/4 - 30/4' }, { id: 4, label: '第 4 週', date: '1/5 - 7/5' },
  { id: 5, label: '第 5 週', date: '8/5 - 14/5' }, { id: 6, label: '第 6 週', date: '15/5 - 21/5' },
  { id: 7, label: '第 7 週', date: '22/5 - 28/5' }, { id: 8, label: '第 8 週', date: '29/5 - 4/6' },
  { id: 9, label: '第 9 週', date: '5/6 - 11/6' }, { id: 10, label: '第 10 週', date: '12/6 - 18/6' }
];

const getAutoWeekId = () => {
  const now = new Date();
  const currentYear = 2026;

  for (const week of WEEKS) {
    const [startStr, endStr] = week.date.split(' - ');
    const [startDay, startMonth] = startStr.split('/');
    const startDate = new Date(currentYear, parseInt(startMonth) - 1, parseInt(startDay), 0, 0, 0);
    const [endDay, endMonth] = endStr.split('/');
    const endDate = new Date(currentYear, parseInt(endMonth) - 1, parseInt(endDay), 23, 59, 59);

    if (now >= startDate && now <= endDate) return week.id;
  }
  
  const firstStartDate = new Date(currentYear, 4 - 1, 10);
  if (now < firstStartDate) return 1;
  return 10;
};

// ==========================================
// 修改：替換所有機構的專屬圖示 (加入防長按下載處理)
// ==========================================
const getMethodIcon = (m) => {
  // 統一設定圖片的防呆屬性，徹底阻擋手機長按彈出下載選單
  const imgProps = {
    className: "w-4 h-4 object-contain pointer-events-none select-none",
    draggable: false,
    style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }
  };

  if (m === '工商銀行') return <img src="/icons/icbc.png" alt="工商銀行" {...imgProps} />;
  if (m === '中國銀行') return <img src="/icons/boc.png" alt="中國銀行" {...imgProps} />;
  if (m === '國際銀行') return <img src="/icons/xib.png" alt="國際銀行" {...imgProps} />;
  if (m === 'MPay') return <img src="/icons/mpay.png" alt="MPay" {...imgProps} />;
  if (m === 'UePay') return <img src="/icons/uepay.png" alt="Uepay" {...imgProps} />;
  if (m === '支付寶') return <img src="/icons/alipay.png" alt="支付寶" {...imgProps} />;
  if (m === '豐付寶') return <img src="/icons/taifung.png" alt="豐付寶" {...imgProps} />;
  if (m === '廣發銀行') return <img src="/icons/cgb.png" alt="廣發銀行" {...imgProps} />;
  
  // 預設防呆機制 (萬一未來有新增其他機構)
  if (m.includes('銀行')) return <Landmark className="w-4 h-4 text-blue-500 pointer-events-none" />;
  if (m.includes('Pay') || m.includes('付寶')) return <Smartphone className="w-4 h-4 text-emerald-500 pointer-events-none" />;
  return <Award className="w-4 h-4 text-amber-500 pointer-events-none" />;
};

const triggerVibration = (pattern) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export default function App() {
  const createEmptyRecords = () => {
    const recs = {};
    WEEKS.forEach(w => {
      recs[w.id] = {};
      PAYMENT_METHODS.forEach(m => recs[w.id][m] = [null, null, null]);
    });
    return recs;
  };

  const [records, setRecords] = useState(createEmptyRecords());
  const [locks, setLocks] = useState({});
  const [currentWeek, setCurrentWeek] = useState(() => getAutoWeekId());
  const [activeTab, setActiveTab] = useState('records');
  const [user, setUser] = useState(null);

  // 智能計算助手 State
  const [calcAmount, setCalcAmount] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false); // 新增：用於控制確認對話框的顯示

  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), (snap) => {
      if (snap.exists()) {
        if (snap.data().records) setRecords(snap.data().records);
        if (snap.data().locks) setLocks(snap.data().locks);
      }
    });
  }, [user]);

  const parseValue = (val) => {
    if (val === null) return { amount: null, used: false };
    if (typeof val === 'string' && val.includes('_used')) {
      return { amount: parseInt(val), used: true };
    }
    return { amount: Number(val), used: false };
  };

  const updateRecord = async (method, index, newValue) => {
    const newRecords = { ...records, [currentWeek]: { ...records[currentWeek], [method]: [...records[currentWeek][method]] } };
    newRecords[currentWeek][method][index] = newValue;
    setRecords(newRecords);
    if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), { records: newRecords }, { merge: true });
  };

  const updateGroupRecord = async (method, newValues) => {
    const newRecords = { ...records, [currentWeek]: { ...records[currentWeek], [method]: newValues } };
    setRecords(newRecords);
    if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), { records: newRecords }, { merge: true });
  };

  const toggleLock = async (method) => {
    triggerVibration(20);
    const lockKey = `${currentWeek}-${method}`;
    const newLocks = { ...locks, [lockKey]: !locks[lockKey] };
    setLocks(newLocks);
    if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), { locks: newLocks }, { merge: true });
  };

  const startPress = (method, index, currentValue) => {
    isLongPress.current = false;
    const parsed = parseValue(currentValue);
    if (parsed.amount === null) return;
    
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      triggerVibration([50, 50]);
      const newValue = parsed.used ? parsed.amount : `${parsed.amount}_used`;
      updateRecord(method, index, newValue);
    }, 500);
  };

  const startGroupPress = (method) => {
    isLongPress.current = false;
    
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      triggerVibration([40, 40, 40]);
      
      const currentValues = records[currentWeek][method];
      const parsedValues = currentValues.map(parseValue);
      
      const hasUnused = parsedValues.some(p => p.amount !== null && p.amount > 0 && !p.used);
      
      const newValues = parsedValues.map(p => {
        if (p.amount === null || p.amount === 0) return p.amount;
        return hasUnused ? `${p.amount}_used` : p.amount;
      });
      
      updateGroupRecord(method, newValues);
    }, 500);
  };

  const clearPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleAmountClick = (method, index, currentValue) => {
    if (isLongPress.current) return;
    triggerVibration(30);

    const parsed = parseValue(currentValue);
    if (parsed.used) {
      updateRecord(method, index, parsed.amount);
    } else {
      const nextAmount = AMOUNT_CYCLE[(AMOUNT_CYCLE.indexOf(parsed.amount) + 1) % AMOUNT_CYCLE.length];
      updateRecord(method, index, nextAmount);
    }
  };

  // ==========================================
  // 智能分單計算邏輯 (DP Knapsack)
  // ==========================================
  const handleAmountChange = (e) => {
    setCalcAmount(e.target.value);
    if (calcResult) setCalcResult(null);
    setIsConfirmingPayment(false); // 重置確認狀態
  };

  const handleCalculate = () => {
    triggerVibration(20);
    setIsConfirmingPayment(false); // 重置確認狀態
    const amount = parseInt(calcAmount);
    if (!amount || amount <= 0) return;

    // 取得指定 App 可用的所有最佳子集合 (Pareto-optimal)
    const getAppStates = (method) => {
      const unusedCoupons = records[currentWeek][method]
        ?.map(parseValue)
        .filter(p => p.amount !== null && !p.used && p.amount > 0)
        .map(p => p.amount) || [];

      const initialCount = unusedCoupons.length;
      if (initialCount === 0) return [];

      const subsets = [];
      const n = initialCount;
      for (let i = 0; i < (1 << n); i++) {
        let val = 0, count = 0, coupons = [];
        for (let j = 0; j < n; j++) {
          if (i & (1 << j)) {
            val += unusedCoupons[j];
            count++;
            coupons.push(unusedCoupons[j]);
          }
        }
        subsets.push({ val, count, coupons, initialCount });
      }

      // 對於相同價值的組合，只保留「使用最少券數」的組合
      const bestByVal = {};
      for (const s of subsets) {
        if (!bestByVal[s.val] || s.count < bestByVal[s.val].count) {
          bestByVal[s.val] = s;
        }
      }
      return Object.values(bestByVal);
    };

    const maxVal = Math.floor(amount / 3);
    let dp = Array(maxVal + 1).fill(null);
    dp[0] = { val: 0, appsUsed: 0, couponCount: 0, initialCountSum: 0, allocation: {} };

    for (const method of PAYMENT_METHODS) {
      // 修正：不再因為「鎖定」狀態而跳過該機構。
      // (鎖定只是為了防 UI 誤觸，只要優惠券還沒「已核銷」，就應該納入計算)
      // if (locks[`${currentWeek}-${method}`]) continue; <--- 已移除此限制

      const states = getAppStates(method);
      const newDp = [...dp];

      for (let v = 0; v <= maxVal; v++) {
        if (dp[v] !== null) {
          for (const state of states) {
            if (state.val === 0) continue;
            const nextV = v + state.val;
            
            if (nextV <= maxVal) {
              const nextApps = dp[v].appsUsed + 1;
              const nextCoupons = dp[v].couponCount + state.count;
              const nextInitialSum = dp[v].initialCountSum + state.initialCount; // 紀錄該 App 原本的剩餘券數

              let better = false;
              if (!newDp[nextV]) {
                better = true;
              } else {
                const curr = newDp[nextV];
                // 優先級 1：使用最少的 App 數量
                if (nextApps < curr.appsUsed) {
                  better = true;
                } 
                // 優先級 2：如果 App 數量一樣，使用最少張數的券
                else if (nextApps === curr.appsUsed) {
                  if (nextCoupons < curr.couponCount) {
                    better = true;
                  } 
                  // 優先級 3：如果張數也一樣，優先使用「剩餘總券數較少」的 App (優先清空快用完的 App)
                  else if (nextCoupons === curr.couponCount) {
                    if (nextInitialSum < curr.initialCountSum) {
                      better = true;
                    }
                  }
                }
              }

              if (better) {
                newDp[nextV] = {
                  val: nextV,
                  appsUsed: nextApps,
                  couponCount: nextCoupons,
                  initialCountSum: nextInitialSum,
                  allocation: { ...dp[v].allocation, [method]: state }
                };
              }
            }
          }
        }
      }
      dp = newDp;
    }

    // 尋找能達到最高優惠金額的組合
    let best = null;
    for (let v = maxVal; v > 0; v--) {
      if (dp[v]) {
        best = dp[v];
        break;
      }
    }

    // 產生建議步驟：現在餘額會被完全分離出來
    const steps = [];
    let remainder = amount;
    
    if (best) {
      remainder = amount - (best.val * 3);
      const apps = Object.keys(best.allocation);

      apps.forEach((method) => {
        const state = best.allocation[method];
        const baseSpend = state.val * 3;
        steps.push({
          method,
          spend: baseSpend, // 剛好等於觸發優惠的金額，不包含餘額
          discount: state.val,
          coupons: state.coupons
        });
      });
    }

    setCalcResult({ steps, totalDiscount: best ? best.val : 0, remainder });
  };

  const executePayment = async () => {
    if (!calcResult || !calcResult.steps) return;
    triggerVibration([50, 50, 50]);
    setIsConfirmingPayment(false); // 執行後隱藏確認框

    const nextWeekRecords = { ...records[currentWeek] };
    
    // 扣除優惠券
    for (const step of calcResult.steps) {
      const method = step.method;
      let methodRecords = [...nextWeekRecords[method]];
      const toConsume = [...step.coupons];

      for (let i = 0; i < methodRecords.length; i++) {
        const parsed = parseValue(methodRecords[i]);
        if (parsed.amount !== null && !parsed.used && parsed.amount > 0) {
          const idx = toConsume.indexOf(parsed.amount);
          if (idx !== -1) {
            methodRecords[i] = `${parsed.amount}_used`;
            toConsume.splice(idx, 1);
          }
        }
      }
      nextWeekRecords[method] = methodRecords;
    }

    const newRecords = { ...records, [currentWeek]: nextWeekRecords };
    setRecords(newRecords);
    if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), { records: newRecords }, { merge: true });

    setCalcAmount('');
    setCalcResult({ success: '支付完成！相關優惠券已自動核銷。' });
  };

  // ==========================================
  // 計算邏輯
  // ==========================================
  let totalAmount = 0, totalCount = 0;
  let currentWeekTotalAmount = 0;
  let currentWeekUsedAmount = 0;
  const institutionTotals = {};
  const amountCounts = { 0: 0, 10: 0, 20: 0, 50: 0, 100: 0, 200: 0 };
  PAYMENT_METHODS.forEach(m => institutionTotals[m] = 0);
  
  Object.values(records).forEach(week => {
    PAYMENT_METHODS.forEach(m => week[m]?.forEach(v => {
      const parsed = parseValue(v);
      if (parsed.amount !== null) { 
        totalAmount += parsed.amount; 
        totalCount++; 
        institutionTotals[m] += parsed.amount; 
        amountCounts[parsed.amount] = (amountCounts[parsed.amount] || 0) + 1;
      }
    }));
  });

  if (records[currentWeek]) {
    PAYMENT_METHODS.forEach(m => records[currentWeek][m]?.forEach(v => {
      const parsed = parseValue(v);
      if (parsed.amount !== null) {
        currentWeekTotalAmount += parsed.amount;
        if (parsed.used) {
          currentWeekUsedAmount += parsed.amount;
        }
      }
    }));
  }
  const currentWeekConsumeAmount = currentWeekTotalAmount * 3;
  const totalConsumeAmount = totalAmount * 3; 

  const allStatsData = Object.entries(amountCounts)
    .map(([amount, count]) => ({ amount: Number(amount), count, color: AMOUNT_COLORS[amount] || '#ccc' }))
    .sort((a, b) => a.amount - b.amount);

  const pieData = allStatsData.filter(item => item.count > 0);

  const renderPieChart = () => {
    if (totalCount === 0) return <div className="h-24 flex items-center justify-center text-slate-400 text-xs font-medium">暫無數據</div>;
    let cumulativeAngle = -Math.PI / 2;
    const cx = 100, cy = 100, radius = 80;
    return (
      <svg viewBox="0 0 200 200" className="w-28 h-28 mx-auto drop-shadow-md">
        {pieData.map((slice, i) => {
          const angle = (slice.count / totalCount) * Math.PI * 2;
          if (slice.count === totalCount) return <circle key={i} cx={cx} cy={cy} r={radius} fill={slice.color} className="stroke-white stroke-[2px]" />;
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + angle;
          cumulativeAngle += angle;
          const x1 = cx + radius * Math.cos(startAngle), y1 = cy + radius * Math.sin(startAngle);
          const x2 = cx + radius * Math.cos(endAngle), y2 = cy + radius * Math.sin(endAngle);
          const largeArcFlag = angle > Math.PI ? 1 : 0;
          const pathData = [`M ${cx} ${cy}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z'].join(' ');
          return <path key={i} d={pathData} fill={slice.color} className="transition-all duration-500 hover:opacity-80 stroke-white stroke-[2px]" />;
        })}
      </svg>
    );
  };

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden select-none">
      <main className="flex-1 overflow-y-auto p-3 space-y-4 pb-20 scroll-smooth">
        <header className="flex flex-col items-center justify-center pt-1">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-rose-500 to-red-500 p-1.5 rounded-xl shadow-sm"><Gift className="w-4 h-4 text-white" /></div>
            <h1 className="text-lg font-black tracking-wide">消費大獎賞智能助手</h1>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-widest">@yalex2026</div>
        </header>

        {activeTab === 'records' && (
          <div className="bg-gradient-to-br from-rose-500 via-red-500 to-red-600 rounded-2xl p-4 shadow-md text-white relative overflow-hidden">
            <div className="relative z-10 flex items-end justify-between gap-2">
              <div>
                <p className="text-red-100 font-medium text-xs flex items-center gap-1 mb-0.5"><TrendingUp className="w-3.5 h-3.5" /> 第 {currentWeek} 週中獎金額</p>
                <div className="flex items-baseline gap-1"><span className="text-sm font-bold opacity-80">MOP</span><span className="text-3xl font-black">{currentWeekTotalAmount}</span></div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-2 border border-white/10">
                <div className="bg-white/20 rounded-full p-1"><Wallet className="w-3 h-3" /></div>
                <div><p className="text-[9px] text-red-100 mb-0.5">消費金額</p><p className="text-sm font-bold"><span className="text-[10px] font-medium opacity-80 mr-0.5">MOP</span>{currentWeekConsumeAmount}</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="bg-gradient-to-br from-rose-500 via-red-500 to-red-600 rounded-2xl p-4 shadow-md text-white relative overflow-hidden">
            <div className="relative z-10 flex items-end justify-between gap-2">
              <div>
                <p className="text-red-100 font-medium text-xs flex items-center gap-1 mb-0.5"><TrendingUp className="w-3.5 h-3.5" /> 總中獎金額</p>
                <div className="flex items-baseline gap-1"><span className="text-sm font-bold opacity-80">MOP</span><span className="text-3xl font-black">{totalAmount}</span></div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-right">
                <div><p className="text-[10px] text-red-100 mb-0.5 font-medium">總消費金額</p><div className="flex items-baseline justify-end gap-1"><span className="text-xs font-bold opacity-80">MOP</span><span className="text-xl font-black tracking-tight">{totalConsumeAmount}</span></div></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-gradient-to-br from-rose-500 via-red-500 to-red-600 rounded-2xl p-4 shadow-md text-white relative overflow-hidden">
            <div className="relative z-10 flex items-end justify-between gap-2">
              <div>
                <p className="text-red-100 font-medium text-xs flex items-center gap-1 mb-0.5"><TrendingUp className="w-3.5 h-3.5" /> 總中獎金額</p>
                <div className="flex items-baseline gap-1"><span className="text-sm font-bold opacity-80">MOP</span><span className="text-3xl font-black">{totalAmount}</span></div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-2 border border-white/10">
                <div className="bg-white/20 rounded-full p-1"><Award className="w-3 h-3" /></div>
                <div><p className="text-[9px] text-red-100 mb-0.5">總次數</p><p className="text-sm font-bold">{totalCount} 次</p></div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 計算助手頁面 UI                             */}
        {/* ========================================== */}
        {activeTab === 'calculator' && (
          <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm border border-slate-100">
            <div className="mb-2">
              <h2 className="text-lg font-black text-slate-800">智能分單助手</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">完美解決多 App 拆單煩惱</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 ml-1">請輸入本次預計消費總額 (MOP)</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 font-bold text-xl">$</span>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-blue-500 text-2xl font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                onClick={handleCalculate}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Calculator className="w-5 h-5" /> 開始智能分單
              </button>
            </div>

            {calcResult && (
              <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {calcResult.success ? (
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-bold text-center border border-emerald-100 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> {calcResult.success}
                  </div>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-slate-500 mb-3 ml-1">建議結帳順序</h3>
                    <div className="relative space-y-3">
                      {/* 背景虛擬連接線 */}
                      {(calcResult.steps.length > 1 || (calcResult.steps.length > 0 && calcResult.remainder > 0)) && (
                        <div className="absolute left-[1.35rem] top-6 bottom-8 w-[2px] bg-slate-200 z-0"></div>
                      )}

                      {/* App 拆單步驟 (更新為單行排版) */}
                      {calcResult.steps.map((step, idx) => (
                        <div key={idx} className="relative z-10 bg-white p-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                          <div className="w-8 h-8 shrink-0 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold shadow-sm">{idx + 1}</div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            {/* 左：機構名稱 */}
                            <div className="font-bold text-slate-800 text-[15px] flex items-center gap-1.5 w-[85px] shrink-0 truncate">
                              {getMethodIcon(step.method)} <span className="truncate">{step.method}</span>
                            </div>
                            {/* 中：折抵優惠券 */}
                            <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold border border-blue-100 shadow-sm shrink-0">
                              券: ${step.discount}
                            </div>
                            {/* 右：總額 (字體縮小為 text-xl) */}
                            <div className="text-xl font-black text-slate-800 text-right flex-1 truncate">
                              ${step.spend}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* 獨立出來的尾數餘額步驟 (同步更新排版) */}
                      {calcResult.remainder > 0 && (
                        <div className="relative z-10 bg-slate-50 p-3.5 rounded-xl shadow-sm border border-slate-200 border-dashed flex items-center gap-3">
                          <div className="w-8 h-8 shrink-0 bg-slate-400 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                            !
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-800 text-[15px]">
                                餘額直接支付
                              </div>
                            </div>
                            {/* 總額 (字體縮小為 text-xl) */}
                            <div className="text-xl font-black text-slate-800 text-right shrink-0">
                              ${calcResult.remainder}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 第一階段：顯示預設的核銷按鈕 */}
                    {calcResult.steps.length > 0 && !isConfirmingPayment && (
                      <button
                        onClick={() => { triggerVibration(20); setIsConfirmingPayment(true); }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm mt-5"
                      >
                        <CheckCircle2 className="w-5 h-5" /> 完成支付並自動核銷優惠
                      </button>
                    )}

                    {/* 第二階段：防呆確認區塊 */}
                    {calcResult.steps.length > 0 && isConfirmingPayment && (
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mt-5 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-[13px] font-bold text-emerald-800 text-center mb-3">確認已付款？優惠券將標記為已使用</h3>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { triggerVibration(20); setIsConfirmingPayment(false); }}
                            className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all font-bold py-2.5 rounded-xl shadow-sm text-sm"
                          >
                            返回
                          </button>
                          <button
                            onClick={executePayment}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all font-bold py-2.5 rounded-xl shadow-sm text-sm"
                          >
                            確定扣除
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white p-1 rounded-full shadow-sm border border-slate-100">
              <button onClick={() => { triggerVibration(20); setCurrentWeek(w => Math.max(1, w - 1)); }} disabled={currentWeek === 1} className="w-8 h-8 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-center"><div className="font-bold text-xs">{WEEKS.find(w => w.id === currentWeek).label}</div><div className="text-[9px] text-slate-500">{WEEKS.find(w => w.id === currentWeek).date}</div></div>
              <button onClick={() => { triggerVibration(20); setCurrentWeek(w => Math.min(10, w + 1)); }} disabled={currentWeek === 10} className="w-8 h-8 flex items-center justify-center disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="bg-white px-3.5 py-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-800">
                  未使用本週中奬金額 : <span className="text-rose-500">{currentWeekTotalAmount - currentWeekUsedAmount}</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400 mb-0.5">
                  已使用 <span className="text-slate-700 font-bold text-xs">{currentWeekUsedAmount}</span> / {currentWeekTotalAmount}
                </span>
              </div>
              <div className="h-2 w-full bg-rose-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-500 transition-all duration-500" 
                  style={{ width: `${currentWeekTotalAmount > 0 ? (currentWeekUsedAmount / currentWeekTotalAmount) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2.5">
              {PAYMENT_METHODS.map(m => {
                const weekTotal = records[currentWeek][m]?.reduce((a, b) => a + (parseValue(b).amount || 0), 0) || 0;
                const consumeTotal = weekTotal * 3;
                
                const isLocked = locks[`${currentWeek}-${m}`] || false;

                return (
                  <div key={m} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
                    <div className="grid grid-cols-3 items-center mb-2 px-1">
                      
                      <div 
                        className={`flex items-center gap-1.5 font-bold text-sm text-slate-700 justify-start select-none touch-manipulation ${isLocked ? 'opacity-60' : 'cursor-pointer active:opacity-50 transition-opacity'}`}
                        onPointerDown={(e) => {
                          if (isLocked) return;
                          if (e.pointerType === 'mouse' && e.button !== 0) return;
                          startGroupPress(m);
                        }}
                        onPointerUp={clearPress}
                        onPointerLeave={clearPress}
                        onPointerCancel={clearPress}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {getMethodIcon(m)}<span className="truncate">{m}</span>
                      </div>
                      
                      <div className="text-[11px] font-semibold text-slate-400 text-center">本週: <span className="text-rose-500">{weekTotal}</span></div>
                      
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-[11px] font-semibold text-slate-400 text-right">消費: <span className="text-blue-600 font-bold">{consumeTotal}</span></div>
                        <button 
                          onClick={() => toggleLock(m)} 
                          className={`p-1 rounded-md transition-all active:scale-90 ${isLocked ? 'bg-red-50 text-red-700 border border-red-200 shadow-inner' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}
                        >
                          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {records[currentWeek][m]?.map((v, i) => {
                        const parsed = parseValue(v);
                        
                        let btnClass = 'flex-1 py-1.5 rounded-xl text-sm font-bold border transition-all active:scale-95 touch-manipulation select-none ';
                        if (parsed.amount === null) btnClass += 'bg-slate-50 text-slate-400 border-dashed border-slate-200';
                        else if (parsed.used) btnClass += 'bg-slate-500 text-white border-slate-600 shadow-inner';
                        else if (parsed.amount === 0) btnClass += 'bg-slate-100 text-slate-500 border-slate-200';
                        else btnClass += AMOUNT_CLASSES[parsed.amount] || 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm';

                        if (isLocked) {
                          btnClass += ' opacity-70 cursor-not-allowed';
                        }

                        return (
                          <button
                            key={i}
                            disabled={isLocked}
                            onPointerDown={(e) => {
                              if (isLocked) return;
                              if (e.pointerType === 'mouse' && e.button !== 0) return;
                              startPress(m, i, v);
                            }}
                            onPointerUp={clearPress}
                            onPointerLeave={clearPress}
                            onPointerCancel={clearPress}
                            onContextMenu={(e) => e.preventDefault()}
                            onClick={() => {
                              if (isLocked) return;
                              handleAmountClick(m, i, v);
                            }}
                            className={btnClass}
                            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                          >
                            {parsed.amount === null ? 'N/A' : parsed.amount}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="bg-white rounded-2xl p-4 space-y-2">
            <h2 className="text-sm font-bold text-center mb-2 flex items-center justify-center gap-2"><Wallet className="w-4 h-4 text-rose-500" /> 機構累計總額</h2>
            {PAYMENT_METHODS.map(m => {
              const methodWeeklyTotals = WEEKS.map(w => records[w.id]?.[m]?.reduce((a, b) => a + (parseValue(b).amount || 0), 0) || 0);

              return (
                <div key={m} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    {getMethodIcon(m)}
                    <span className="font-bold text-slate-700 text-sm truncate">{m}</span>
                  </div>

                  <div className="flex-1 flex justify-center px-1">
                    <div className="flex items-end h-12 w-full max-w-[80px] gap-[1.5px] border-b border-rose-200 pb-[1px]">
                      {methodWeeklyTotals.map((val, idx) => {
                        const weekNum = idx + 1;
                        const isCurrentWeek = weekNum === currentWeek;
                        const absoluteHeight = Math.min(val * 0.15, 48); 
                        
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-t-[1px] transition-all duration-300 ${isCurrentWeek ? 'bg-rose-600' : (val > 0 ? 'bg-rose-300' : 'bg-transparent')}`}
                            style={{ 
                              height: `${absoluteHeight}px`, 
                              minHeight: (val > 0 || isCurrentWeek) ? '2px' : '0' 
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-end gap-1 w-20 shrink-0">
                    <span className="text-[10px] text-slate-400">MOP</span>
                    <span className="font-black text-base">{institutionTotals[m]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-center mb-1 flex items-center justify-center gap-2"><PieChartIcon className="w-4 h-4 text-rose-500" /> 金額概率分佈</h2>
            <div className="py-2">{renderPieChart()}</div>
            <div className="space-y-2 mt-2">
              {allStatsData.map(item => {
                const percentage = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0.0';
                return (
                  <div key={item.amount} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shadow-sm border border-white" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-slate-700 text-sm w-12">{item.amount} 元</span>
                    </div>
                    <div className="flex gap-3 text-xs items-center">
                      <span className="text-slate-400 font-medium">{item.count} 次</span>
                      <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <nav className="shrink-0 absolute bottom-0 w-full max-w-md bg-white/90 backdrop-blur-xl border-t p-1.5 flex justify-around">
        {[{ id: 'records', icon: List, label: '記錄' }, { id: 'calculator', icon: Calculator, label: '計算' }, { id: 'institutions', icon: Wallet, label: '機構' }, { id: 'stats', icon: PieChartIcon, label: '統計' }].map(t => (
          <button key={t.id} onClick={() => { triggerVibration(20); setActiveTab(t.id); }} className={`flex flex-col items-center gap-1 w-20 py-1 transition-all ${activeTab === t.id ? 'text-rose-600' : 'text-slate-400'}`}>
            <t.icon className="w-5 h-5" /><span className="text-[10px] font-bold">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}