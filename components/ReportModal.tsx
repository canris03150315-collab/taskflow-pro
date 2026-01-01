
import React, { useState } from 'react';
import { ReportType, DailyReportContent } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: DailyReportContent, type: ReportType) => void;
  isProcessing: boolean;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit, isProcessing }) => {
  const [reportType] = useState<ReportType>(ReportType.DAILY);
  
  // Fields for Fallback Modal
  const [deposit, setDeposit] = useState<string>('');
  const [withdrawal, setWithdrawal] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(deposit) || 0;
    const w = Number(withdrawal) || 0;
    
    onSubmit({ 
        lineLeads: 0, registrations: 0, firstDeposits: 0,
        depositAmount: d, withdrawalAmount: w, netIncome: d - w,
        notes 
    }, reportType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
           <h2 className="text-xl font-bold text-slate-800">提交簡易營運數據</h2>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
               <label className="block text-sm font-bold text-slate-600 mb-1">今日充值</label>
               <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="0" />
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-600 mb-1">今日提現</label>
               <input type="number" value={withdrawal} onChange={e => setWithdrawal(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="0" />
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-600 mb-1">備註</label>
               <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border px-3 py-2 rounded h-20" placeholder="說明..." />
            </div>
            <div className="flex justify-end pt-2">
                <button type="button" onClick={onClose} className="mr-2 px-4 py-2 text-slate-500 font-bold">取消</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow">提交</button>
            </div>
        </form>
      </div>
    </div>
  );
};
