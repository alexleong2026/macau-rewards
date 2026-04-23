import React, { useState, useEffect, useRef } from 'react';
import { Landmark, Smartphone, Gift, TrendingUp, X, Award, AlertCircle, PieChart as PieChartIcon, List, ChevronLeft, ChevronRight, Wallet, Sparkles } from 'lucide-react';
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

// 新增：根據當前日期自動計算對應的週次
const getAutoWeekId = () => {
  const now = new Date();
  const currentYear = 2026; // 活動年份為 2026

  for (const week of WEEKS) {
    const [startStr, endStr] = week.date.split(' - ');
    
    // 解析開始日期 (DD/MM)
    const [startDay, startMonth] = startStr.split('/');
    const startDate = new Date(currentYear, parseInt(startMonth) - 1, parseInt(startDay), 0, 0, 0);
    
    // 解析結束日期 (DD/MM)
    const [endDay, endMonth] = endStr.split('/');
    const endDate = new Date(currentYear, parseInt(endMonth) - 1, parseInt(endDay), 23, 59, 59);

    // 檢查今天是否在此區間內
    if (now >= startDate && now <= endDate) {
      return week.id;
    }
  }
  
  // 如果還沒開始，預設第一週；如果已結束，停在最後一週
  const firstStartDate = new Date(currentYear, 4 - 1, 10); // 4月10日
  if (now < firstStartDate) return 1;
  return 10;
};

const getMethodIcon = (m) => {
  if (m.includes('銀行')) return <Landmark className="w-4 h-4 text-blue-500" />;
  if (m.includes('Pay') || m.includes('付寶')) return <Smartphone className="w-4 h-4 text-emerald-500" />;
  return <Award className="w-4 h-4 text-amber-500" />;
};

// 新增：震動回饋小工具 (支援的設備上會有觸覺回饋)
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
  // 變更：將原本固定初始化的 1，改為執行自動偵測函數
  const [currentWeek, setCurrentWeek] = useState(() => getAutoWeekId());
  const [activeTab, setActiveTab] = useState('records');
  const [user, setUser] = useState(null);

  // 長按偵測工具
  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), (snap) => {
      if (snap.exists() && snap.data().records) setRecords(snap.data().records);
    });
  }, [user]);

  // 解析資料，判斷是否為「已使用狀態」
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
    if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), { records: newRecords });
  };

  // 新增：用於一次更新多筆紀錄的函式
  const updateGroupRecord = async (method, newValues) => {
    const newRecords = { ...records, [currentWeek]: { ...records[currentWeek], [method]: newValues } };
    setRecords(newRecords);
    if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata'), { records: newRecords });
  };

  const startPress = (method, index, currentValue) => {
    isLongPress.current = false;
    const parsed = parseValue(currentValue);
    if (parsed.amount === null) return; // N/A 不處理長按
    
    // 設定 500 毫秒的長按計時器
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      triggerVibration([50, 50]); // 長按成功時產生特殊的雙震動
      const newValue = parsed.used ? parsed.amount : `${parsed.amount}_used`;
      updateRecord(method, index, newValue);
    }, 500);
  };

  // 新增：機構名稱的群組長按偵測
  const startGroupPress = (method) => {
    isLongPress.current = false;
    
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      triggerVibration([40, 40, 40]); // 一次核銷多個時產生專屬三連震
      
      const currentValues = records[currentWeek][method];
      const parsedValues = currentValues.map(parseValue);
      
      // 檢查是否還有尚未核銷的有效金額 (大於 0 的金額)
      const hasUnused = parsedValues.some(p => p.amount !== null && p.amount > 0 && !p.used);
      
      const newValues = parsedValues.map(p => {
        if (p.amount === null || p.amount === 0) return p.amount; // 略過 N/A 和 0
        return hasUnused ? `${p.amount}_used` : p.amount; // 一鍵全核銷或一鍵全復原
      });
      
      updateGroupRecord(method, newValues);
    }, 500);
  };

  const clearPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleAmountClick = (method, index, currentValue) => {
    if (isLongPress.current) return; // 如果剛剛觸發了長按，則忽略這次點擊
    
    triggerVibration(30); // 輕觸時產生短促的單震動

    const parsed = parseValue(currentValue);
    if (parsed.used) {
      // 點擊深灰色按鈕：回復成未使用的粉紅色狀態
      updateRecord(method, index, parsed.amount);
    } else {
      // 點擊粉紅色/一般按鈕：正常切換金額
      const nextAmount = AMOUNT_CYCLE[(AMOUNT_CYCLE.indexOf(parsed.amount) + 1) % AMOUNT_CYCLE.length];
      updateRecord(method, index, nextAmount);
    }
  };

  // 計算邏輯
  let totalAmount = 0, totalCount = 0;
  let currentWeekTotalAmount = 0;
  let currentWeekUsedAmount = 0; // 新增：計算本週已使用的金額
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

  // 計算本週總計、本週消費金額與本週已核銷金額
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
            <h1 className="text-lg font-black tracking-wide">澳門消費大獎賞 2026</h1>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-widest">@yalex2026</div>
        </header>

        {/* 動態切換顯示：記錄分頁顯示本週金額，機構分頁顯示總消費金額，統計分頁顯示總次數 */}
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

        {activeTab === 'records' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white p-1 rounded-full shadow-sm border border-slate-100">
              <button onClick={() => { triggerVibration(20); setCurrentWeek(w => Math.max(1, w - 1)); }} disabled={currentWeek === 1} className="w-8 h-8 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-center"><div className="font-bold text-xs">{WEEKS.find(w => w.id === currentWeek).label}</div><div className="text-[9px] text-slate-500">{WEEKS.find(w => w.id === currentWeek).date}</div></div>
              <button onClick={() => { triggerVibration(20); setCurrentWeek(w => Math.min(10, w + 1)); }} disabled={currentWeek === 10} className="w-8 h-8 flex items-center justify-center disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* 新增：核銷進度條 */}
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
                return (
                  <div key={m} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
                    <div className="grid grid-cols-3 items-center mb-2 px-1">
                      <div 
                        className="flex items-center gap-1.5 font-bold text-sm text-slate-700 justify-start cursor-pointer active:opacity-50 transition-opacity select-none touch-manipulation"
                        onPointerDown={(e) => {
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
                      <div className="text-[11px] font-semibold text-slate-400 text-right">消費: <span className="text-blue-600 font-bold">{consumeTotal}</span></div>
                    </div>
                    <div className="flex gap-2">
                      {records[currentWeek][m]?.map((v, i) => {
                        const parsed = parseValue(v);
                        
                        // 動態決定按鈕顏色
                        let btnClass = 'flex-1 py-1.5 rounded-xl text-sm font-bold border transition-all active:scale-95 touch-manipulation select-none ';
                        if (parsed.amount === null) btnClass += 'bg-slate-50 text-slate-400 border-dashed border-slate-200';
                        else if (parsed.used) btnClass += 'bg-slate-500 text-white border-slate-600 shadow-inner'; // 已使用：深灰色
                        else if (parsed.amount === 0) btnClass += 'bg-slate-100 text-slate-500 border-slate-200';
                        else btnClass += AMOUNT_CLASSES[parsed.amount] || 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm';

                        return (
                          <button
                            key={i}
                            onPointerDown={(e) => {
                              if (e.pointerType === 'mouse' && e.button !== 0) return;
                              startPress(m, i, v);
                            }}
                            onPointerUp={clearPress}
                            onPointerLeave={clearPress}
                            onPointerCancel={clearPress}
                            onContextMenu={(e) => e.preventDefault()} // 防止手機長按跳出選單
                            onClick={() => handleAmountClick(m, i, v)}
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
            {PAYMENT_METHODS.map(m => (
              <div key={m} className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">{getMethodIcon(m)}<span className="font-bold text-slate-700 text-sm">{m}</span></div>
                <div className="flex items-baseline gap-1"><span className="text-[10px] text-slate-400">MOP</span><span className="font-black text-base">{institutionTotals[m]}</span></div>
              </div>
            ))}
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
        {[{ id: 'records', icon: List, label: '記錄' }, { id: 'institutions', icon: Wallet, label: '機構' }, { id: 'stats', icon: PieChartIcon, label: '統計' }].map(t => (
          <button key={t.id} onClick={() => { triggerVibration(20); setActiveTab(t.id); }} className={`flex flex-col items-center gap-1 w-20 py-1 transition-all ${activeTab === t.id ? 'text-rose-600' : 'text-slate-400'}`}>
            <t.icon className="w-5 h-5" /><span className="text-[10px] font-bold">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}