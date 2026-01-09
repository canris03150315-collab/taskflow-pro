import React, { useState, useEffect } from 'react';
import { User, RoutineTemplate, RoutineRecord, RoutineItemStatus, DepartmentDef, Role } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface DailyTaskChecklistProps {
  currentUser: User;
  departments: DepartmentDef[];
}

export const DailyTaskChecklist: React.FC<DailyTaskChecklistProps> = ({ currentUser, departments }) => {
  const toast = useToast();
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [todayRecord, setTodayRecord] = useState<RoutineRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>(currentUser.department);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  useEffect(() => {
    loadData();
  }, [currentUser, selectedDept]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allTemplates = await api.routines.getTemplates();
      // 篩選有 isDaily 標記的模板（每日任務）- 顯示選擇的部門任務
      const dailyTemplates = allTemplates.filter(t => 
        (t as any).isDaily && 
        t.departmentId === selectedDept
      );
      setTemplates(dailyTemplates);

      // 取得今日紀錄
      const record = await api.routines.getTodayRecord(currentUser.id, selectedDept);
      setTodayRecord(record);
    } catch (error) {
      console.error('Failed to load daily tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (index: number) => {
    if (!todayRecord || !todayRecord.items || isSaving !== null) return;
    
    setIsSaving(index);
    const newStatus = !todayRecord.items[index].completed;
    
    try {
      await api.routines.toggleItem(todayRecord.id, index, newStatus);
      
      // 更新本地狀態
      setTodayRecord(prev => {
        if (!prev) return prev;
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], completed: newStatus };
        return { ...prev, items: newItems };
      });

      if (newStatus) {
        toast.success('已完成 ✓');
      }
    } catch (error) {
      toast.error('更新失敗，請重試');
    } finally {
      setIsSaving(null);
    }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const today = new Date().toLocaleDateString('zh-TW', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!todayRecord || !todayRecord.items || todayRecord.items.length === 0) {
    // 沒有任務時完全不顯示組件
    return null;
  }

  const completedCount = todayRecord.items.filter(i => i.completed).length;
  const totalCount = todayRecord.items.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 部門選擇器（管理階層） */}
      {isBoss && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            🏢 查看部門
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* 標題區 */}
      <div className={`p-4 ${allDone ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              {allDone ? '🎉' : '✅'} 每日任務清單
            </h3>
            <p className="text-white/80 text-sm">{today}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{progress}%</div>
            <div className="text-xs text-white/70">{completedCount}/{totalCount} 完成</div>
          </div>
        </div>
        {/* 進度條 */}
        <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${allDone ? 'bg-white' : 'bg-white/90'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 任務列表 */}
      <div className="divide-y divide-slate-100">
        {todayRecord.items.map((item, index) => (
          <div 
            key={index}
            onClick={() => handleToggleItem(index)}
            className={`p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-slate-50 ${
              item.completed ? 'bg-emerald-50/50' : ''
            } ${isSaving === index ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {/* 勾選框 */}
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
              item.completed 
                ? 'bg-emerald-500 border-emerald-500 text-white' 
                : 'border-slate-300 hover:border-blue-400'
            }`}>
              {item.completed && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
              {isSaving === index && (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            
            {/* 任務內容 */}
            <div className="flex-1">
              <span className={`font-medium ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {item.text}
              </span>
            </div>

            {/* 完成標記 */}
            {item.completed && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                已完成
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 全部完成提示 */}
      {allDone && (
        <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-center">
          <span className="text-emerald-600 font-bold">🎉 太棒了！今日任務全部完成！</span>
        </div>
      )}
    </div>
  );
};

export default DailyTaskChecklist;
