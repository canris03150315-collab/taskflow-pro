
import React, { useState, useRef } from 'react';
import { User, Role } from '../types';

interface SetupPageProps {
  onComplete: (adminData: any) => void;
  isProcessing: boolean;
}

export const SetupPage: React.FC<SetupPageProps> = ({ onComplete, isProcessing }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(`https://api.dicebear.com/9.x/avataaars/svg?seed=Admin&backgroundColor=b6e3f4`);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      name,
      username,
      password,
      avatar,
      role: Role.BOSS,
      department: 'Management'
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-fade-in">
        <div className="bg-slate-800 p-8 text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-lg mb-4 text-3xl">🚀</div>
            <h1 className="text-2xl font-black tracking-tight">歡迎使用 企業管理系統</h1>
            <p className="text-slate-400 text-sm mt-2 font-bold">這是您第一次啟動系統，請建立管理員帳號。</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img src={avatar} alt="Admin Avatar" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        更換頭像
                    </div>
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">管理員姓名</label>
                    <input 
                        type="text" required value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition font-bold text-slate-800"
                        placeholder="例如：最高管理員"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">登入帳號 (Username)</label>
                    <input 
                        type="text" required value={username} onChange={e => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition font-bold text-slate-800"
                        placeholder="admin"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">登入密碼 (Password)</label>
                    <input 
                        type="password" required value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition font-bold text-slate-800"
                        placeholder="請設定強密碼"
                    />
                </div>
            </div>

            <div className="pt-4">
                <button 
                    type="submit"
                    disabled={isProcessing || !name || !username || !password}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                    {isProcessing ? '正在初始化系統...' : '完成設定並進入系統'}
                </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center font-bold">
                設定完成後，此管理員帳號將擁有系統的所有最高權限。
            </p>
        </form>
      </div>
    </div>
  );
};
