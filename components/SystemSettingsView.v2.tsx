
import React, { useState } from 'react';
import { User, MenuItemId, DEFAULT_MENU_GROUPS, MENU_LABELS } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';

interface SystemSettingsViewProps {
  currentUser: User;
  onLogout: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ currentUser, onLogout }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'about'>('profile');
  const [menuGroups, setMenuGroups] = useState(DEFAULT_MENU_GROUPS);

  const handleResetSystem = async () => {
      if (await showConfirm('⚠️ 危險操作：確定要重置系統嗎？所有資料將被清空！')) {
          const doubleCheck = prompt('請輸入 "RESET" 以確認重置');
          if (doubleCheck === 'RESET') {
              try {
                  await api.system.resetFactoryDefault();
                  showSuccess('系統已重置，將重新載入');
                  window.location.reload();
              } catch (e) {
                  toast.error('重置失敗');
              }
          }
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>⚙️</span> 系統設定
        </h2>

        <div className="flex gap-2 border-b border-slate-200 pb-1">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition ${activeTab === 'profile' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
                個人資料
            </button>
            {currentUser.role === 'BOSS' && (
                <button 
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition ${activeTab === 'system' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    系統管理
                </button>
            )}
            <button 
                onClick={() => setActiveTab('about')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition ${activeTab === 'about' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
                關於
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl overflow-hidden">
                            {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : '👤'}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{currentUser.name}</h3>
                            <p className="text-slate-500">{currentUser.role} @ {currentUser.department}</p>
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100">
                        <button 
                            onClick={onLogout}
                            className="px-6 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition"
                        >
                            登出系統
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'system' && currentUser.role === 'BOSS' && (
                <div className="space-y-8">
                    <div>
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <span>📱</span> 選單排序設定
                        </h3>
                        <div className="space-y-4">
                            {menuGroups.map((group, groupIndex) => (
                                <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <div className="p-3 bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                                        {group.label}
                                    </div>
                                    <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {group.items.map(itemId => (
                                            <div key={itemId} className="p-2 bg-white border border-slate-100 rounded text-sm text-slate-600 flex items-center gap-2">
                                                <span>{MENU_LABELS[itemId]?.icon}</span>
                                                <span>{MENU_LABELS[itemId]?.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-slate-400 mt-2">* 目前僅支援檢視，排序功能開發中</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                            <span>🚨</span> 危險區域
                        </h3>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-red-700">恢復原廠設定</div>
                                <div className="text-xs text-red-500">清除所有資料庫內容，包含使用者與任務</div>
                            </div>
                            <button 
                                onClick={handleResetSystem}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                            >
                                執行重置
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'about' && (
                <div className="text-center py-10">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-4 transform rotate-3">
                        T
                    </div>
                    <h3 className="text-xl font-black text-slate-800">TaskFlow Pro</h3>
                    <p className="text-slate-500 mb-6">企業級協作管理系統</p>
                    <div className="text-xs text-slate-400 space-y-1">
                        <p>Version 2.5.0 (Build 20240101)</p>
                        <p>© 2024 TaskFlow Inc. All rights reserved.</p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
