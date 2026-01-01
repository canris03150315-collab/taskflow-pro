
import React, { useState, useEffect } from 'react';
import { User, DepartmentDef, PerformanceReview, ReviewMetrics } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface PerformanceViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ currentUser, users, departments }) => {
  const toast = useToast();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);

  useEffect(() => {
    loadReviews();
  }, [selectedPeriod, currentUser.id]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Supervisor sees their department or all if boss
      // Employee sees only their own
      // API handles filtering based on caller, but we can also filter here or pass params
      const data = await api.performance.getReviews(selectedPeriod);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews', error);
      toast.error('載入績效考核失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (targetUserId: string) => {
      // Get stats for this user
      try {
          const stats = await api.performance.getUserStats(targetUserId, selectedPeriod);
          
          const newReview: PerformanceReview = {
              id: `rev-${Date.now()}`,
              targetUserId,
              period: selectedPeriod,
              reviewerId: currentUser.id,
              updatedAt: new Date().toISOString(),
              metrics: (stats as any) || ({ taskCompletionRate: 100, sopCompletionRate: 100, attendanceRate: 100 } as ReviewMetrics),
              ratingWorkAttitude: 5,
              ratingProfessionalism: 5,
              ratingTeamwork: 5,
              managerComment: '',
              totalScore: 90,
              grade: 'A',
              status: 'DRAFT'
          };
          setEditingReview(newReview);
      } catch (error) {
          console.error('Failed to init review', error);
          toast.error('初始化失敗');
      }
  };

  const handleSaveReview = async () => {
      if (!editingReview) return;
      try {
          // Calculate score
          const metricsScore = (editingReview.metrics.taskCompletionRate + editingReview.metrics.sopCompletionRate + editingReview.metrics.attendanceRate) / 3 * 0.6;
          const managerScore = ((editingReview.ratingWorkAttitude + editingReview.ratingProfessionalism + editingReview.ratingTeamwork) / 15) * 100 * 0.4;
          const total = Math.round(metricsScore + managerScore);
          
          let grade: 'S'|'A'|'B'|'C'|'D' = 'C';
          if (total >= 95) grade = 'S';
          else if (total >= 85) grade = 'A';
          else if (total >= 75) grade = 'B';
          else if (total >= 60) grade = 'C';
          else grade = 'D';

          const toSave = { ...editingReview, totalScore: total, grade, status: 'PUBLISHED' as const };
          await api.performance.saveReview(toSave);
          
          setReviews(prev => {
              const idx = prev.findIndex(r => r.id === toSave.id);
              if (idx !== -1) return prev.map(r => r.id === toSave.id ? toSave : r);
              return [...prev, toSave];
          });
          setEditingReview(null);
          toast.success('考核已儲存');
      } catch (error) {
          console.error('Failed to save review', error);
          toast.error('儲存失敗');
      }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  // Filter users to review:
  // If BOSS: All users
  // If SUPERVISOR: Users in same dept
  // If EMPLOYEE: Self only (view only)
  
  const reviewableUsers = users.filter(u => {
      if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') return true;
      if (currentUser.role === 'SUPERVISOR') return u.department === currentUser.department;
      return u.id === currentUser.id;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>🏆</span> 績效考核
                </h2>
                <p className="text-slate-500 text-sm mt-1">KPI 指標與主管評分</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600">考核月份:</span>
                <input 
                    type="month" 
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-sm"
                />
            </div>
        </div>

        {editingReview ? (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-700">
                        正在評核: {getUserName(editingReview.targetUserId)}
                        <span className="ml-2 text-sm font-normal text-slate-500">({editingReview.period})</span>
                    </h3>
                    <button onClick={() => setEditingReview(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Metrics */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-600 border-b pb-2">客觀數據 (60%)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="text-xs text-blue-600 mb-1">任務達成率</div>
                                <div className="text-2xl font-black text-blue-700">{editingReview.metrics.taskCompletionRate}%</div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="text-xs text-green-600 mb-1">SOP 執行率</div>
                                <div className="text-2xl font-black text-green-700">{editingReview.metrics.sopCompletionRate}%</div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="text-xs text-purple-600 mb-1">出勤率</div>
                                <div className="text-2xl font-black text-purple-700">{editingReview.metrics.attendanceRate}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Manager Rating */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-600 border-b pb-2">主管評分 (40%)</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">工作態度 (1-5)</label>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={editingReview.ratingWorkAttitude}
                                    onChange={e => setEditingReview({...editingReview, ratingWorkAttitude: Number(e.target.value)})}
                                    className="w-full"
                                />
                                <div className="text-right text-sm font-bold text-blue-600">{editingReview.ratingWorkAttitude} 分</div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">專業能力 (1-5)</label>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={editingReview.ratingProfessionalism}
                                    onChange={e => setEditingReview({...editingReview, ratingProfessionalism: Number(e.target.value)})}
                                    className="w-full"
                                />
                                <div className="text-right text-sm font-bold text-blue-600">{editingReview.ratingProfessionalism} 分</div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">團隊合作 (1-5)</label>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={editingReview.ratingTeamwork}
                                    onChange={e => setEditingReview({...editingReview, ratingTeamwork: Number(e.target.value)})}
                                    className="w-full"
                                />
                                <div className="text-right text-sm font-bold text-blue-600">{editingReview.ratingTeamwork} 分</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">主管評語</label>
                    <textarea 
                        value={editingReview.managerComment}
                        onChange={e => setEditingReview({...editingReview, managerComment: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="請輸入評語..."
                    />
                </div>

                <div className="p-6 bg-slate-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setEditingReview(null)}
                        className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSaveReview}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
                    >
                        完成並發布
                    </button>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reviewableUsers.map(user => {
                    const review = reviews.find(r => r.targetUserId === user.id);
                    const canEdit = currentUser.role === 'BOSS' || (currentUser.role === 'SUPERVISOR' && user.id !== currentUser.id);

                    return (
                        <div key={user.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl overflow-hidden">
                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : '👤'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{user.name}</div>
                                    <div className="text-xs text-slate-500">{user.role}</div>
                                </div>
                            </div>

                            {review ? (
                                <div className="text-right">
                                    <div className="text-2xl font-black text-blue-600">{review.grade}</div>
                                    <div className="text-xs text-slate-400">{review.totalScore} 分</div>
                                    {canEdit && (
                                        <button 
                                            onClick={() => setEditingReview(review)}
                                            className="text-xs text-blue-500 hover:underline mt-1"
                                        >
                                            修改
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {canEdit ? (
                                        <button 
                                            onClick={() => handleCreateReview(user.id)}
                                            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 font-bold"
                                        >
                                            開始評核
                                        </button>
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">尚未評核</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};
