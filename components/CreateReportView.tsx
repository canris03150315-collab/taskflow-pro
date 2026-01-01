
import React, { useState } from 'react';
import { DailyReportContent, ReportType } from '../types';

interface CreateReportViewProps {
  onCancel: () => void;
  onSubmit: (content: DailyReportContent, type: ReportType) => void;
  isProcessing: boolean;
}

export const CreateReportView: React.FC<CreateReportViewProps> = ({ onCancel, onSubmit, isProcessing }) => {
  // Operational Metrics
  const [lineLeads, setLineLeads] = useState<number | ''>('');
  const [registrations, setRegistrations] = useState<number | ''>('');
  const [firstDeposits, setFirstDeposits] = useState<number | ''>('');
  
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<number | ''>('');
  
  const [notes, setNotes] = useState('');

  // Computed Values (for Display)
  const netIncome = (Number(depositAmount) || 0) - (Number(withdrawalAmount) || 0);
  const conversionRate = (Number(lineLeads) > 0) ? Math.round((Number(registrations) / Number(lineLeads)) * 100) : 0;
  const firstDepositRate = (Number(registrations) > 0) ? Math.round((Number(firstDeposits) / Number(registrations)) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 二次確認
    const confirmMessage = `確定要提交營運報表嗎？\n\n` +
      `💰 充值金額：$${Number(depositAmount) || 0}\n` +
      `💸 提現金額：$${Number(withdrawalAmount) || 0}\n` +
      `📊 淨入金額：$${netIncome}\n\n` +
      `提交後將無法修改。`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    onSubmit({
      lineLeads: Number(lineLeads) || 0,
      registrations: Number(registrations) || 0,
      firstDeposits: Number(firstDeposits) || 0,
      depositAmount: Number(depositAmount) || 0,
      withdrawalAmount: Number(withdrawalAmount) || 0,
      netIncome,
      conversionRate,
      firstDepositRate,
      notes
    }, ReportType.DAILY);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
       
       <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
          <div>
            <button onClick={onCancel} className="text-slate-500 hover:text-blue-600 font-bold text-sm mb-2 flex items-center gap-1 transition">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
               返回報表列表
            </button>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               <span>📊</span> 營運數據回報
            </h2>
            <p className="text-sm text-slate-500 font-bold mt-1">每日營運登記表 / 盈虧結算</p>
          </div>
       </div>

       <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <form id="report-form" onSubmit={handleSubmit} className="p-8 space-y-8">
              
              {/* Section 1: Financials */}
              <div>
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                      💰 財務數據 <span className="text-xs text-slate-400 font-normal ml-2">系統自動計算淨入</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="block text-sm font-bold text-slate-500 mb-2">今日充值金額</label>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input type="number" required value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-lg text-slate-700" placeholder="0" />
                          </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="block text-sm font-bold text-slate-500 mb-2">今日提現金額</label>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input type="number" required value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(Number(e.target.value))} className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-lg text-red-600" placeholder="0" />
                          </div>
                      </div>
                      <div className={`p-4 rounded-xl border flex flex-col justify-center ${netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                          <label className={`block text-xs font-bold uppercase mb-1 ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>淨入金額 (充值-提現)</label>
                          <div className={`text-3xl font-black font-mono tracking-tight ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {netIncome >= 0 ? '+' : ''}{netIncome.toLocaleString()}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Section 2: User Growth */}
              <div>
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                      👥 用戶增長 <span className="text-xs text-slate-400 font-normal ml-2">系統自動計算轉化率</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">LINE 導入數量</label>
                               <input type="number" value={lineLeads} onChange={(e) => setLineLeads(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-bold" placeholder="0" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">註冊人數</label>
                               <input type="number" value={registrations} onChange={(e) => setRegistrations(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-bold" placeholder="0" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">首充人數</label>
                               <input type="number" value={firstDeposits} onChange={(e) => setFirstDeposits(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-bold" placeholder="0" />
                           </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 gap-4">
                          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 flex flex-col justify-center items-center">
                              <div className="text-4xl font-black text-indigo-600">{conversionRate}%</div>
                              <div className="text-xs font-bold text-indigo-400 mt-1">轉化率 (註冊/導入)</div>
                          </div>
                          <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 flex flex-col justify-center items-center">
                              <div className="text-4xl font-black text-orange-600">{firstDepositRate}%</div>
                              <div className="text-xs font-bold text-orange-400 mt-1">首充率 (首充/註冊)</div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Section 3: Notes */}
              <div>
                  <label className="block text-base font-bold text-slate-700 mb-2">
                     📝 備註 / 線路盤虧說明
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 outline-none min-h-[100px] text-base"
                    placeholder="輸入其他備註事項..."
                  />
              </div>

          </form>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
              <button onClick={onCancel} disabled={isProcessing} className="px-6 py-2.5 text-slate-500 hover:bg-slate-200 rounded-lg font-bold transition">
                取消
              </button>
              <button 
                type="submit" 
                form="report-form"
                disabled={isProcessing}
                className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                提交營運報表
              </button>
          </div>

       </div>
    </div>
  );
};
