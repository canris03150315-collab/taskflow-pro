
import React, { useState, useEffect } from 'react';
import { User, RoutineTemplate } from '../types';
import { api } from '../services/api';

interface DailyRoutineWidgetProps {
  currentUser: User;
}

export const DailyRoutineWidget: React.FC<DailyRoutineWidgetProps> = ({ currentUser }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, [currentUser]);

  const loadStatus = async () => {
    setIsLoading(true);
    const allTemplates = await api.routines.getTemplates();
    // Filter docs relevant to this user (排除每日任務)
    const myDocs = allTemplates.filter(t => 
      t.departmentId === currentUser.department && 
      !t.isDaily
    );
    
    setTotalDocs(myDocs.length);
    const unread = myDocs.filter(t => !t.readBy?.includes(currentUser.id)).length;
    setUnreadCount(unread);
    setIsLoading(false);
  };

  if (isLoading) return <div className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>;

  const progress = totalDocs > 0 ? Math.round(((totalDocs - unreadCount) / totalDocs) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        
        <div className="p-5 border-b border-indigo-50 flex justify-between items-center bg-indigo-50/30">
            <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <span>📑</span> 新人文件閱讀進度
                </h3>
                <p className="text-xs text-slate-500 font-bold pl-0.5">
                    部門必讀文件
                </p>
            </div>
            <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">{progress}%</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase">完成度</div>
            </div>
        </div>

        <div className="p-6 text-center">
            {unreadCount > 0 ? (
                <div>
                    <div className="text-3xl font-black text-slate-800 mb-1">{unreadCount}</div>
                    <div className="text-xs font-bold text-red-500 uppercase bg-red-50 inline-block px-2 py-1 rounded">
                        份文件尚未閱讀
                    </div>
                    <p className="text-xs text-slate-400 mt-2">請前往「部門文件與規範」完成閱讀確認</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-2">
                    <span className="text-4xl mb-2">🎉</span>
                    <span className="font-bold text-indigo-600">所有文件已閱讀完畢！</span>
                </div>
            )}
        </div>
    </div>
  );
};
