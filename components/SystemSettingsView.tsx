
import React, { useState, useRef } from 'react';
import { User, MenuItemId, DEFAULT_MENU_GROUPS, MENU_LABELS } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import DataCleanupView from './DataCleanupView';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';

interface SystemSettingsViewProps {
  currentUser: User;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ currentUser, onLogout, onUserUpdate }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'about'>('profile');
  const [menuGroups, setMenuGroups] = useState(DEFAULT_MENU_GROUPS);
  const [draggedItem, setDraggedItem] = useState<{ groupIndex: number; itemIndex: number } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [avatar, setAvatar] = useState(currentUser.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || 'default')}&backgroundColor=b6e3f4`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isUploadingBackup, setIsUploadingBackup] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [showDataCleanup, setShowDataCleanup] = useState(false);

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

  const handleDownloadBackup = async () => {
      if (currentUser.role !== 'BOSS') {
          toast.error('只有最高管理員可以下載備份');
          return;
      }
      
      setIsDownloadingBackup(true);
      try {
          await api.system.downloadBackup();
          toast.success('備份檔案下載成功');
      } catch (error: any) {
          console.error('Download backup error:', error);
          toast.error(error.message || '下載備份失敗');
      } finally {
          setIsDownloadingBackup(false);
      }
  };

  const handleUploadBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (currentUser.role !== 'BOSS') {
          toast.error('只有最高管理員可以上傳備份');
          return;
      }
      
      const file = event.target.files?.[0];
      if (!file) return;
      
      if (!file.name.endsWith('.db')) {
          toast.error('請選擇 .db 格式的備份檔案');
          return;
      }
      
      if (!(await showConfirm('⚠️ 警告：上傳備份將會覆蓋現有資料庫！\n\n確定要繼續嗎？'))) {
          if (uploadInputRef.current) uploadInputRef.current.value = '';
          return;
      }
      
      setIsUploadingBackup(true);
      try {
          await api.system.uploadBackup(file);
          toast.success('備份上傳成功！系統將重新載入...');
          setTimeout(() => {
              window.location.reload();
          }, 2000);
      } catch (error: any) {
          console.error('Upload backup error:', error);
          toast.error(error.message || '上傳備份失敗');
      } finally {
          setIsUploadingBackup(false);
          if (uploadInputRef.current) uploadInputRef.current.value = '';
      }
  };

  const handleDragStart = (groupIndex: number, itemIndex: number) => {
      setDraggedItem({ groupIndex, itemIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (targetGroupIndex: number, targetItemIndex: number) => {
      if (!draggedItem) return;

      const newGroups = [...menuGroups];
      const sourceGroup = newGroups[draggedItem.groupIndex];
      const targetGroup = newGroups[targetGroupIndex];

      // 移除源項目
      const [movedItem] = sourceGroup.items.splice(draggedItem.itemIndex, 1);

      // 插入到目標位置
      targetGroup.items.splice(targetItemIndex, 0, movedItem);

      setMenuGroups(newGroups);
      setDraggedItem(null);
      setHasChanges(true);
  };

  const handleSaveOrder = async () => {
      try {
          await api.system.saveSettings({ menuGroups });
          toast.success('選單排序已保存');
          setHasChanges(false);
      } catch (e) {
          toast.error('保存失敗');
      }
  };

  const handleResetOrder = () => {
      setMenuGroups(DEFAULT_MENU_GROUPS);
      setHasChanges(true);
  };

  const handleAvatarClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 檢查文件大小（限制 2MB）
      if (file.size > 2 * 1024 * 1024) {
          toast.error('圖片大小不能超過 2MB');
          return;
      }

      // 檢查文件類型
      if (!file.type.startsWith('image/')) {
          toast.error('請選擇圖片文件');
          return;
      }

      try {
          // 讀取文件為 base64
          const reader = new FileReader();
          reader.onload = async (event) => {
              const base64 = event.target?.result as string;
              setAvatar(base64);

              // 上傳到後端
              try {
                  await api.users.updateAvatar(currentUser.id, base64);
                  toast.success('頭像更新成功');
                  
                  // 更新當前用戶資料
                  if (onUserUpdate) {
                      onUserUpdate({ ...currentUser, avatar: base64 });
                  }
              } catch (error) {
                  toast.error('頭像上傳失敗');
                  setAvatar(currentUser.avatar || '');
              }
          };
          reader.readAsDataURL(file);
      } catch (error) {
          toast.error('讀取圖片失敗');
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
                        <div 
                            className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl overflow-hidden cursor-pointer hover:opacity-80 transition relative group"
                            onClick={handleAvatarClick}
                        >
                            {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : '👤'}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition">
                                <span className="text-white opacity-0 group-hover:opacity-100 text-sm">更換</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{currentUser.name}</h3>
                            <p className="text-slate-500">{currentUser.role} @ {currentUser.department}</p>
                            <p className="text-xs text-slate-400 mt-1">點擊頭像更換照片</p>
                        </div>
                    </div>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <span>📱</span> 選單排序設定
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleResetOrder}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                >
                                    重置為預設
                                </button>
                                {hasChanges && (
                                    <button
                                        onClick={handleSaveOrder}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                                    >
                                        保存排序
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {menuGroups.map((group, groupIndex) => (
                                <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <div className="p-3 bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                                        {group.label}
                                    </div>
                                    <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {group.items.map((itemId, itemIndex) => (
                                            <div
                                                key={itemId}
                                                draggable
                                                onDragStart={() => handleDragStart(groupIndex, itemIndex)}
                                                onDragOver={handleDragOver}
                                                onDrop={() => handleDrop(groupIndex, itemIndex)}
                                                className="p-2 bg-white border border-slate-100 rounded text-sm text-slate-600 flex items-center gap-2 cursor-move hover:bg-slate-50 hover:border-blue-300 transition"
                                            >
                                                <span className="text-slate-400">⋮⋮</span>
                                                <span>{MENU_LABELS[itemId]?.icon}</span>
                                                <span>{MENU_LABELS[itemId]?.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-slate-400 mt-2">💡 拖動項目可調整順序，完成後點擊「保存排序」</p>
                        </div>
                    </div>

                    {currentUser.role === 'BOSS' && (
                        <>
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2">
                                    <span>💾</span> 資料備份與恢復
                                </h3>
                                <div className="space-y-3">
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-blue-700">下載資料庫備份</div>
                                            <div className="text-xs text-blue-500">下載完整的資料庫備份檔案到本機</div>
                                        </div>
                                        <button 
                                            onClick={handleDownloadBackup}
                                            disabled={isDownloadingBackup}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDownloadingBackup ? '下載中...' : '下載備份'}
                                        </button>
                                    </div>
                                    
                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-orange-700">上傳並恢復備份</div>
                                            <div className="text-xs text-orange-500">⚠️ 上傳備份檔案將覆蓋現有資料庫</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={uploadInputRef}
                                                type="file"
                                                accept=".db"
                                                onChange={handleUploadBackup}
                                                disabled={isUploadingBackup}
                                                className="hidden"
                                                id="backup-upload"
                                            />
                                            <label
                                                htmlFor="backup-upload"
                                                className={`px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 cursor-pointer ${isUploadingBackup ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {isUploadingBackup ? '上傳中...' : '選擇檔案'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="font-bold text-purple-600 mb-4 flex items-center gap-2">
                                    <span>🗑️</span> 資料清理工具
                                </h3>
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-purple-700">批量刪除舊資料</div>
                                        <div className="text-xs text-purple-500">按時間範圍和分類刪除過期資料</div>
                                    </div>
                                    <button 
                                        onClick={() => setShowDataCleanup(true)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-lg shadow-purple-200"
                                    >
                                        開啟清理工具
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

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

        {showDataCleanup && (
            <DataCleanupView onClose={() => setShowDataCleanup(false)} />
        )}
    </div>
  );
};
