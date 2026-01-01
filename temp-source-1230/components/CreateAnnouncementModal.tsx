import React, { useState } from 'react';
import { User } from '../types';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; priority: 'NORMAL' | 'IMPORTANT' }) => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT'>('NORMAL');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, content, priority });
    onClose();
    setTitle('');
    setContent('');
    setPriority('NORMAL');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 tracking-wide flex items-center gap-2">
            <span>📢</span> 發布新公告
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">公告標題</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
              placeholder="例如：系統維護通知"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">重要性</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={priority === 'NORMAL'} 
                  onChange={() => setPriority('NORMAL')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-bold">一般公告</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={priority === 'IMPORTANT'} 
                  onChange={() => setPriority('IMPORTANT')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 font-bold flex items-center gap-1">
                   <span>🔥</span> 重大通知
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">公告內容</label>
            <textarea 
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 resize-none"
              placeholder="請輸入詳細公告事項..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition">取消</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition">
              確認發布
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};