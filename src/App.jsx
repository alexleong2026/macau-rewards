import React, { useState } from 'react';
import { Landmark, Smartphone, Gift, TrendingUp, X, Award, AlertCircle, PieChart as PieChartIcon, List, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';

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
  if (method.includes('銀行')) return <Landmark className="w-5 h-5 text-blue-600" />;
  if (method.includes('Pay') || method.includes('付寶')) return <Smartphone className="w-5 h-5 text-green-600" />;
  return <Award className="w-5 h-5 text-gray-600" />;
};

// 金額對應的顏色 (用於圓形圖)
const AMOUNT_COLORS = {
  0: '#e5e7eb',   // 灰色
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
  // 產生所有週的初始空資料
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

  // 將之前的測試資料放入第 1 週 (保留部分 0 元與部分 N/A 作為展示)
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

  // 修改金額 Modal 狀態
  const [editModal, setEditModal] = useState({ isOpen: false, method: '', index: 0, amount: '' });

  // 新增分頁狀態
  const [activeTab, setActiveTab] = useState('records');

  // 計算總計 (計算所有 10 週的總和)
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
          if (amount > 0) totalCount++; // 只計算有中獎的次數
          amountCounts[amount] = (amountCounts[amount] || 0) + 1;
          institutionTotals[method] += amount;
        }
      });
    });
  });

  // 將資料轉為陣列並過濾出次數 > 0 的金額
  const pieData = Object.entries(amountCounts)
    .map(([amount, count]) => ({
      amount: Number(amount),
      count,
      color: AMOUNT_COLORS[amount] || '#ccc'
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => a.amount - b.amount); // 依金額從小到大排序

  // 渲染圓形圖
  const renderPieChart = () => {
    let cumulativeAngle = -Math.PI / 2; // 從正上方開始畫
    const cx = 100;
    const cy = 100;
    const radius = 80;

    return (
      <svg viewBox="0 0 200 200" className="w-56 h-56 mx-auto drop-shadow-md">
        {pieData.map((slice, i) => {
          const angle = (slice.count / totalCount) * Math.PI * 2;
          
          // 如果全部都是同一個金額 (滿圓)
          if (slice.count === totalCount) {
            return <circle key={i} cx={cx} cy={cy} r={radius} fill={slice.color} />;
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
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          return (
            <path 
              key={i} 
              d={pathData} 
              fill={slice.color} 
              className="transition-all duration-500 hover:opacity-80 stroke-white stroke-2" 
            />
          );
        })}
      </svg>
    );
  };

  // 處理修改記錄
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editModal.amount === '') return;

    const parsedAmount = editModal.amount === 'N/A' ? null : Number(editModal.amount);

    const newRecords = { ...records };
    newRecords[currentWeek] = { ...newRecords[currentWeek] };
    newRecords[currentWeek][editModal.method] = [...newRecords[currentWeek][editModal.method]];
    newRecords[currentWeek][editModal.method][editModal.index] = parsedAmount;
    
    setRecords(newRecords);
    setEditModal({ isOpen: false, method: '', index: 0, amount: '' });
  };

  return (
    // 使用 h-[100dvh] 與 flex-col 打造全螢幕 App 體驗
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-gray-50 text-gray-800 font-sans flex flex-col sm:shadow-2xl sm:border-x sm:border-gray-200 overflow-hidden select-none [&_*]:[-webkit-tap-highlight-color:transparent]">
      
      {/* 頂部固定導航 */}
      <header className="shrink-0 bg-gradient-to-r from-red-600 to-red-500 text-white p-4 shadow-sm z-10">
        <div className="flex items-center justify-center gap-2">
          <Gift className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-wider">澳門消費大獎賞 2026</h1>
        </div>
      </header>

      {/* 中間滾動內容區域 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-5 pb-8 scroll-smooth">
        {/* 總計數據卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 gap-4 relative overflow-hidden shrink-0">
          <div className="absolute -right-4 -top-4 p-4 opacity-5 pointer-events-none">
            <TrendingUp className="w-32 h-32" />
          </div>
          
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mb-1">
              總中獎金額
            </p>
            <p className="text-3xl font-bold text-red-600">
              <span className="text-xl mr-1">MOP</span>
              {totalAmount.toFixed(1)}
            </p>
          </div>
          
          <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4">
            <p className="text-sm text-gray-500 font-medium mb-1">總中獎次數</p>
            <p className="text-2xl font-semibold text-gray-700">{totalCount} 次</p>
          </div>
        </div>

        {activeTab === 'records' && (
          <div className="space-y-4 pb-4">
            {/* 週次切換器 (加入 sticky 讓它滑動時稍微吸頂) */}
            <div className="sticky top-0 z-10 flex justify-between items-center bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-sm border border-gray-100">
              <button 
                onClick={() => setCurrentWeek(prev => Math.max(1, prev - 1))} 
                disabled={currentWeek === 1} 
                className="p-3 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <div className="font-bold text-gray-800 text-lg">
                  {WEEKS.find(w => w.id === currentWeek).label}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  {WEEKS.find(w => w.id === currentWeek).date}
                </div>
              </div>
              
              <button 
                onClick={() => setCurrentWeek(prev => Math.min(10, prev + 1))} 
                disabled={currentWeek === 10} 
                className="p-3 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center text-xs text-gray-500 bg-blue-50/80 p-3 rounded-lg shadow-sm border border-blue-100/50">
              <AlertCircle className="w-4 h-4 mr-1.5 text-blue-500 shrink-0" />
              <p>每個平台固定 3 筆記錄，點擊「金額數字」即可修改抽中金額。</p>
            </div>

            {/* 各支付平台列表 */}
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const methodTotal = records[currentWeek][method].reduce((sum, val) => sum + (val === null ? 0 : val), 0);
                
                return (
                  <div key={method} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all active:scale-[0.98]">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        {getMethodIcon(method)}
                        <span className="text-base">{method}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        合計: <span className="text-red-600 font-bold ml-1 text-base">{methodTotal}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {records[currentWeek][method].map((amount, index) => (
                        <button
                          key={index}
                          onClick={() => setEditModal({ isOpen: true, method, index, amount: amount === null ? 'N/A' : amount })}
                          className={`flex-1 py-3 rounded-xl text-lg font-bold transition-transform active:scale-95 shadow-sm border
                            ${amount === null 
                              ? 'bg-transparent text-gray-400 border-dashed border-gray-300 font-medium text-base' 
                              : amount === 0 
                                ? 'bg-gray-100 text-gray-500 border-solid border-gray-300' 
                                : 'bg-red-50 text-red-600 border-solid border-red-200'}`}
                          title="點擊修改"
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6 animate-in fade-in duration-300 pb-8">
            <h2 className="text-lg font-bold text-gray-800 text-center mb-2">中獎金額概率分佈</h2>
            
            {renderPieChart()}
            
            <div className="space-y-3 mt-6">
              {pieData.map(item => {
                const percentage = ((item.count / totalCount) * 100).toFixed(1);
                return (
                  <div key={item.amount} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 shadow-sm transition-transform active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-gray-700 w-16 text-lg">{item.amount} 元</span>
                    </div>
                    <div className="flex gap-4 text-sm items-center">
                      <span className="text-gray-500 w-12 text-right font-medium">{item.count} 次</span>
                      <span className="font-bold text-red-600 w-16 text-right text-lg">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 animate-in fade-in duration-300 pb-8">
            <h2 className="text-lg font-bold text-gray-800 text-center mb-4">各金融機構累計金額</h2>
            <div className="space-y-3">
              {PAYMENT_METHODS.map(method => (
                <div key={method} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 shadow-sm transition-transform active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(method)}
                    <span className="font-bold text-gray-700 text-base">{method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">MOP</span>
                    <span className="font-bold text-red-600 text-xl">{institutionTotals[method]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 底部固定導航 */}
      <nav className="shrink-0 bg-white border-t border-gray-200 z-20 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
        {/* pb-[env(safe-area-inset-bottom)] 保障 iPhone 底部橫條不會遮擋按鈕 */}
        <div className="flex justify-around p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <button 
            onClick={() => setActiveTab('records')} 
            className={`flex flex-col items-center gap-1.5 w-20 py-1 transition-colors active:scale-95 ${activeTab === 'records' ? 'text-red-600' : 'text-gray-400'}`}
          >
            <List className="w-6 h-6" />
            <span className="text-[11px] font-bold">記錄</span>
          </button>
          <button 
            onClick={() => setActiveTab('institutions')} 
            className={`flex flex-col items-center gap-1.5 w-20 py-1 transition-colors active:scale-95 ${activeTab === 'institutions' ? 'text-red-600' : 'text-gray-400'}`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-[11px] font-bold">機構</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`flex flex-col items-center gap-1.5 w-20 py-1 transition-colors active:scale-95 ${activeTab === 'stats' ? 'text-red-600' : 'text-gray-400'}`}
          >
            <PieChartIcon className="w-6 h-6" />
            <span className="text-[11px] font-bold">統計</span>
          </button>
        </div>
      </nav>

      {/* 底部滑出式 修改金額 Modal (Bottom Sheet Design) */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setEditModal({ isOpen: false, method: '', index: 0, amount: '' })}
          ></div>
          
          {/* Modal 主體 (手機版底部滑出，桌面版置中) */}
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 pb-[env(safe-area-inset-bottom,0px)]">
            
            {/* 頂部拖曳把手 (視覺裝飾) */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 ml-2">修改 {editModal.method}</h3>
              <p className="text-sm font-medium text-gray-400 mr-2">第 {editModal.index + 1} 次</p>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">
                  請選擇抽中金額
                </label>
                {/* 原生 Select 在手機上會呼叫底部的滾輪選單，非常適合行動裝置 */}
                <select
                  autoFocus
                  value={editModal.amount}
                  onChange={(e) => setEditModal({ ...editModal, amount: e.target.value })}
                  required
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-2xl font-bold text-center appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em' }}
                >
                  <option value="N/A">N/A (未抽)</option>
                  <option value="0">0</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, method: '', index: 0, amount: '' })}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 px-4 rounded-2xl hover:bg-gray-200 active:scale-95 transition-all text-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95 transition-all text-lg"
                >
                  確認儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}