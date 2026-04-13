import React, { useState, useEffect } from 'react';
import { Landmark, Smartphone, Gift, TrendingUp, X, Award, AlertCircle, PieChart as PieChartIcon, List, ChevronLeft, ChevronRight, Wallet, Sparkles } from 'lucide-react';

// 引入 Firebase 雲端儲存套件
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// 初始化 Firebase (建立雲端連線)
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
const appId = 'macau-rewards-2026-378de'; // 給自己取一個固定的 ID

// 定義所有的支付方式
const PAYMENT_METHODS = [
  '工商銀行',
  '中國銀行',
  '國際銀行',
  'MPay',
  'UePay',
  '支付寶',
  '豐付寶',
  '廣發銀行'
];

// 產生圖標的小工具
const getMethodIcon = (method) => {
  if (method.includes('銀行')) return <Landmark className="w-5 h-5 text-blue-500" />;
  if (method.includes('Pay') || method.includes('付寶')) return <Smartphone className="w-5 h-5 text-emerald-500" />;
  return <Award className="w-5 h-5 text-amber-500" />;
};

// 金額對應的顏色 (用於圓形圖)
const AMOUNT_COLORS = {
  0: '#f3f4f6',   // 灰色
  10: '#93c5fd',  // 淺藍色
  20: '#86efac',  // 淺綠色
  50: '#fde047',  // 黃色
  100: '#fca5a5', // 淺紅色
  200: '#d8b4fe'  // 紫色
};

// 定義 10/4 到 18/6 的每週區間 (共 10 週)
const WEEKS = [
  { id: 1, label: '第 1 週', date: '10/4 - 16/4' },
  { id: 2, label: '第 2 週', date: '17/4 - 23/4' },
  { id: 3, label: '第 3 週', date: '24/4 - 30/4' },
  { id: 4, label: '第 4 週', date: '1/5 - 7/5' },
  { id: 5, label: '第 5 週', date: '8/5 - 14/5' },
  { id: 6, label: '第 6 週', date: '15/5 - 21/5' },
  { id: 7, label: '第 7 週', date: '22/5 - 28/5' },
  { id: 8, label: '第 8 週', date: '29/5 - 4/6' },
  { id: 9, label: '第 9 週', date: '5/6 - 11/6' },
  { id: 10, label: '第 10 週', date: '12/6 - 18/6' }
];

export default function App() {
  const initialRecords = {};
  WEEKS.forEach(w => {
    initialRecords[w.id] = {
      '工商銀行': [null, null, null],
      '中國銀行': [null, null, null],
      '國際銀行': [null, null, null],
      'MPay': [null, null, null],
      'UePay': [null, null, null],
      '支付寶': [null, null, null],
      '豐付寶': [null, null, null],
      '廣發銀行': [null, null, null]
    };
  });

  // 測試資料
  initialRecords[1] = {
    '工商銀行': [20, 10, null],
    '中國銀行': [50, 100, 200],
    '國際銀行': [10, 10, 10],
    'MPay': [20, 50, 100],
    'UePay': [10, 20, 50],
    '支付寶': [100, 10, 10],
    '豐付寶': [0, null, null],
    '廣發銀行': [null, null, null]
  };

  const [records, setRecords] = useState(initialRecords);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('records');
  const [user, setUser] = useState(null); // 記錄使用者狀態

  // 1. 初始化使用者驗證 (確保您的資料具有獨立隱私空間)
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("自訂權杖不匹配，自動切換為匿名登入", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("登入初始化失敗:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 當進入網頁時，自動從雲端資料庫讀取您之前的紀錄
  useEffect(() => {
    if (!user || !db) return;
    
    // 設定雲端儲存路徑
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().records) {
        setRecords(docSnap.data().records);
      }
    }, (error) => {
      console.error("讀取雲端資料失敗:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // 定義點擊切換的金額順序 (null 代表 N/A)
  const AMOUNT_CYCLE = [null, 0, 10, 20, 50, 100, 200];

  // 計算總計
  let totalAmount = 0;
  let totalCount = 0;
  const amountCounts = { 0: 0, 10: 0, 20: 0, 50: 0, 100: 0, 200: 0 };
  const institutionTotals = {};
  PAYMENT_METHODS.forEach(m => institutionTotals[m] = 0);

  Object.values(records).forEach(weekData => {
    PAYMENT_METHODS.forEach(method => {
      weekData[method].forEach(amount => {
        if (amount !== null) {
          totalAmount += amount;
          if (amount > 0) totalCount++; 
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;
          institutionTotals[method] += amount;
        }
      });
    });
  });

  const pieData = Object.entries(amountCounts)
    .map(([amount, count]) => ({
      amount: Number(amount),
      count,
      color: AMOUNT_COLORS[amount] || '#ccc'
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => a.amount - b.amount);

  const renderPieChart = () => {
    let cumulativeAngle = -Math.PI / 2; 
    const cx = 100, cy = 100, radius = 80;

    return (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto drop-shadow-xl">
        {pieData.map((slice, i) => {
          const angle = (slice.count / totalCount) * Math.PI * 2;
          if (slice.count === totalCount) {
            return <circle key={i} cx={cx} cy={cy} r={radius} fill={slice.color} className="stroke-white stroke-[3px]" />;
          }
          
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + angle;
          cumulativeAngle += angle;

          const x1 = cx + radius * Math.cos(startAngle);
          const y1 = cy + radius * Math.sin(startAngle);
          const x2 = cx + radius * Math.cos(endAngle);
          const y2 = cy + radius * Math.sin(endAngle);
          const largeArcFlag = angle > Math.PI ? 1 : 0;

          const pathData = [
            `M ${cx} ${cy}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z'
          ].join(' ');

          return (
            <path key={i} d={pathData} fill={slice.color} className="transition-all duration-500 hover:opacity-80 stroke-white stroke-[3px]" />
          );
        })}
      </svg>
    );
  };

  // 處理點擊格子直接切換金額
  const handleAmountClick = async (method, index, currentAmount) => {
    // 找出當前金額在循環陣列中的位置，並計算下一個位置
    const currentIndex = AMOUNT_CYCLE.indexOf(currentAmount);
    const nextIndex = (currentIndex + 1) % AMOUNT_CYCLE.length;
    const nextAmount = AMOUNT_CYCLE[nextIndex];

    const newRecords = { ...records };
    newRecords[currentWeek] = { ...newRecords[currentWeek] };
    newRecords[currentWeek][method] = [...newRecords[currentWeek][method]];
    newRecords[currentWeek][method][index] = nextAmount;
    
    // 優先更新畫面，讓操作順暢不卡頓
    setRecords(newRecords);

    // 3. 畫面更新後，立刻將新資料同步寫入雲端資料庫
    if (user && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'macauRecords', 'mydata');
        await setDoc(docRef, { records: newRecords });
      } catch (error) {
        console.error("儲存雲端資料失敗:", error);
      }
    }
  };

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-slate-50 text-slate-800 font-sans flex flex-col sm:shadow-[0_0_40px_rgba(0,0,0,0.05)] sm:border-x border-slate-200 overflow-hidden select-none [&_*]:[-webkit-tap-highlight-color:transparent]">
      
      <main className="flex-1 overflow-y-auto p-3 space-y-4 pb-20 scroll-smooth">
        
        {/* 頂部標題 (已取消固定，縮小間距) */}
        <header className="flex items-center justify-center gap-2 pt-1">
          <div className="bg-gradient-to-tr from-rose-500 to-red-500 p-1.5 rounded-xl shadow-sm">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-wide text-slate-800">澳門消費大獎賞 2026</h1>
        </header>

        {/* 高質感漸層數據卡片 (縮小高度與內距) */}
        <div className="bg-gradient-to-br from-rose-500 via-red-500 to-red-600 rounded-2xl p-4 shadow-md shadow-red-500/20 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
            <Sparkles className="w-24 h-24" />
          </div>
          
          <div className="relative z-10 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-red-100 font-medium text-xs flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> 總中獎金額
              </p>
              <div className="flex items-baseline gap-1 truncate">
                <span className="text-lg font-bold opacity-90">MOP</span>
                <span className="text-3xl font-black tracking-tight">{totalAmount.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-2 border border-white/10 shrink-0">
              <div className="bg-white/20 rounded-full p-1">
                <Award className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-red-100 font-medium mb-0.5">總次數</p>
                <p className="text-sm font-bold leading-none">{totalCount} <span className="text-[10px] font-medium opacity-80">次</span></p>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'records' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 週次切換器 (縮小按鈕與高度) */}
            <div className="flex justify-between items-center bg-white p-1 rounded-full shadow-sm border border-slate-100">
              <button 
                onClick={() => setCurrentWeek(prev => Math.max(1, prev - 1))} 
                disabled={currentWeek === 1} 
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full disabled:opacity-30 transition-all active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="text-center flex flex-col justify-center">
                <div className="font-bold text-slate-800 text-xs">
                  {WEEKS.find(w => w.id === currentWeek).label}
                </div>
                <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                  {WEEKS.find(w => w.id === currentWeek).date}
                </div>
              </div>
              
              <button 
                onClick={() => setCurrentWeek(prev => Math.min(10, prev + 1))} 
                disabled={currentWeek === 10} 
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full disabled:opacity-30 transition-all active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 各支付平台卡片 (縮小卡片內距與按鈕行高) */}
            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((method) => {
                const methodTotal = records[currentWeek][method].reduce((sum, val) => sum + (val === null ? 0 : val), 0);
                
                return (
                  <div key={method} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <div className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                          {getMethodIcon(method)}
                        </div>
                        <span className="text-sm">{method}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                        本週: <span className="text-rose-500 ml-1">{methodTotal}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {records[currentWeek][method].map((amount, index) => (
                        <button
                          key={index}
                          onClick={() => handleAmountClick(method, index, amount)}
                          className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all active:scale-95 border
                            ${amount === null 
                              ? 'bg-slate-50 text-slate-400 border-dashed border-slate-200 font-medium hover:bg-slate-100' 
                              : amount === 0 
                                ? 'bg-slate-100 text-slate-500 border-solid border-slate-200' 
                                : 'bg-rose-50 text-rose-600 border-solid border-rose-200 shadow-sm'}`}
                        >
                          {amount === null ? 'N/A' : amount}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-sm font-bold text-slate-800 text-center flex items-center justify-center gap-2">
              <PieChartIcon className="w-4 h-4 text-rose-500" /> 金額概率分佈
            </h2>
            
            <div className="py-1">
              {renderPieChart()}
            </div>
            
            <div className="space-y-2 mt-2">
              {pieData.map(item => {
                const percentage = ((item.count / totalCount) * 100).toFixed(1);
                return (
                  <div key={item.amount} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 transition-transform active:scale-[0.98]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shadow-sm border border-white" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-slate-700 text-sm w-16">{item.amount} 元</span>
                    </div>
                    <div className="flex gap-3 text-xs items-center">
                      <span className="text-slate-400 font-medium">{item.count} 次</span>
                      <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-sm font-bold text-slate-800 text-center mb-2 flex items-center justify-center gap-2">
              <Wallet className="w-4 h-4 text-rose-500" /> 機構累計總額
            </h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(method => (
                <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 transition-transform active:scale-[0.98]">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                      {getMethodIcon(method)}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{method}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">MOP</span>
                    <span className="font-black text-slate-800 text-base">{institutionTotals[method]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 底部玻璃導航列 */}
      <nav className="shrink-0 absolute bottom-0 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-slate-100 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="flex justify-around p-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {[
            { id: 'records', icon: List, label: '記錄' },
            { id: 'institutions', icon: Wallet, label: '機構' },
            { id: 'stats', icon: PieChartIcon, label: '統計' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-2xl transition-all active:scale-90 
                ${activeTab === tab.id ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'fill-rose-100/50' : ''}`} />
              <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}