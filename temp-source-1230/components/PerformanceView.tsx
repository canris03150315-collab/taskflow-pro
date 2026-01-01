
import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, DepartmentDef, PerformanceReview, ReviewMetrics } from '../types';
import { api } from '../services/api';

interface PerformanceViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ currentUser, users, departments }) => {
  const isManager = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER || currentUser.role === Role.SUPERVISOR;
  
  const [activeTab, setActiveTab] = useState<'MY_PERFORMANCE' | 'TEAM_EVALUATION'>(isManager ? 'TEAM_EVALUATION' : 'MY_PERFORMANCE');
  const [currentPeriod, setCurrentPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Data
  const [myReview, setMyReview] = useState<PerformanceReview | null>(null);
  const [teamReviews, setTeamReviews] = useState<PerformanceReview[]>([]);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [loading, setLoading] = useState(false);

  // Load Data
  useEffect(() => {
      loadData();
  }, [currentPeriod, activeTab]);

  const loadData = async () => {
      setLoading(true);
      if (activeTab === 'MY_PERFORMANCE') {
          const reviews = await api.performance.getReviews(currentPeriod, currentUser.id);
          // Only show published to employee, unless user is looking at their own draft? No, employee only sees published.
          const published = reviews.find(r => r.status === 'PUBLISHED');
          setMyReview(published || null);
      } else if (activeTab === 'TEAM_EVALUATION' && isManager) {
          // Load all reviews for this period to match with users
          const reviews = await api.performance.getReviews(currentPeriod);
          setTeamReviews(reviews);
      }
      setLoading(false);
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // --- Manager: Start Evaluation ---
  const handleStartEvaluation = async (targetUser: User) => {
      // Check if review exists
      const existing = teamReviews.find(r => r.targetUserId === targetUser.id);
      if (existing) {
          setEditingReview(existing);
      } else {
          // Create new draft with auto-calculated stats
          setLoading(true);
          try {
              const stats = await api.performance.getUserStats(targetUser.id, currentPeriod);
              
              const newReview: PerformanceReview = {
                  id: `pr-${Date.now()}`,
                  targetUserId: targetUser.id,
                  period: currentPeriod,
                  reviewerId: currentUser.id,
                  updatedAt: new Date().toISOString(),
                  metrics: stats || { taskCompletionRate: 100, sopCompletionRate: 100, attendanceRate: 100 },
                  ratingWorkAttitude: 3,
                  ratingProfessionalism: 3,
                  ratingTeamwork: 3,
                  managerComment: '',
                  totalScore: 0,
                  grade: 'C',
                  status: 'DRAFT'
              };
              setEditingReview(newReview);
          } catch (error) {
              console.error('獲取統計數據失敗:', error);
              // 使用預設值繼續
              const newReview: PerformanceReview = {
                  id: `pr-${Date.now()}`,
                  targetUserId: targetUser.id,
                  period: currentPeriod,
                  reviewerId: currentUser.id,
                  updatedAt: new Date().toISOString(),
                  metrics: { taskCompletionRate: 100, sopCompletionRate: 100, attendanceRate: 100 },
                  ratingWorkAttitude: 3,
                  ratingProfessionalism: 3,
                  ratingTeamwork: 3,
                  managerComment: '',
                  totalScore: 0,
                  grade: 'C',
                  status: 'DRAFT'
              };
              setEditingReview(newReview);
          } finally {
              setLoading(false);
          }
      }
  };

  const handleSaveEvaluation = async (review: PerformanceReview, publish: boolean) => {
      const toSave = { ...review, status: publish ? 'PUBLISHED' as const : 'DRAFT' as const };
      await api.performance.saveReview(toSave);
      setEditingReview(null);
      loadData();
  };

  // --- Sub-Component: Evaluation Modal ---
  const EvaluationModal = ({ review, user, onClose, onSave }: { review: PerformanceReview, user: User, onClose: () => void, onSave: (r: PerformanceReview, p: boolean) => void }) => {
      const [formData, setFormData] = useState(review);
      
      // Live Calc for Preview
      const autoScore = ((formData.metrics.taskCompletionRate + formData.metrics.sopCompletionRate + formData.metrics.attendanceRate) / 3) * 0.6;
      const manualScore = ((formData.ratingWorkAttitude + formData.ratingProfessionalism + formData.ratingTeamwork) / 15) * 40;
      const totalPreview = Math.round(autoScore + manualScore);

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                          <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-200" />
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">{user.name} 績效考核</h2>
                              <p className="text-xs text-slate-500 font-bold">{getDeptName(user.department)} • {review.period}</p>
                          </div>
                      </div>
                      <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Objective Data */}
                      <div>
                          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 border-b pb-2">📊 客觀數據 (系統自動計算 - 佔 60%)</h3>
                          <div className="space-y-6">
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                  <div className="flex justify-between mb-2">
                                      <span className="font-bold text-blue-800">任務完成率</span>
                                      <span className="font-black text-blue-600">{formData.metrics.taskCompletionRate}%</span>
                                  </div>
                                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden"><div style={{width: `${formData.metrics.taskCompletionRate}%`}} className="h-full bg-blue-600"></div></div>
                              </div>
                              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                  <div className="flex justify-between mb-2">
                                      <span className="font-bold text-indigo-800">SOP 執行率</span>
                                      <span className="font-black text-indigo-600">{formData.metrics.sopCompletionRate}%</span>
                                  </div>
                                  <div className="h-2 bg-indigo-200 rounded-full overflow-hidden"><div style={{width: `${formData.metrics.sopCompletionRate}%`}} className="h-full bg-indigo-600"></div></div>
                              </div>
                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                  <div className="flex justify-between mb-2">
                                      <span className="font-bold text-emerald-800">出勤狀況</span>
                                      <span className="font-black text-emerald-600">{formData.metrics.attendanceRate}%</span>
                                  </div>
                                  <div className="h-2 bg-emerald-200 rounded-full overflow-hidden"><div style={{width: `${formData.metrics.attendanceRate}%`}} className="h-full bg-emerald-600"></div></div>
                              </div>
                          </div>
                          
                          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                              <span className="text-xs font-bold text-slate-400 uppercase">目前預估總分</span>
                              <div className="text-4xl font-black text-slate-800 mt-1">{totalPreview} <span className="text-lg text-slate-400 font-normal">/ 100</span></div>
                          </div>
                      </div>

                      {/* Right: Subjective Rating */}
                      <div>
                          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 border-b pb-2">✏️ 主管評分 (佔 40%)</h3>
                          <div className="space-y-6">
                              {[
                                  { key: 'ratingWorkAttitude', label: '工作態度 (Attitude)' },
                                  { key: 'ratingProfessionalism', label: '專業能力 (Ability)' },
                                  { key: 'ratingTeamwork', label: '團隊合作 (Teamwork)' }
                              ].map(field => (
                                  <div key={field.key}>
                                      <div className="flex justify-between mb-2">
                                          <label className="font-bold text-slate-700">{field.label}</label>
                                          <span className="font-bold text-amber-500">{(formData as any)[field.key]} 星</span>
                                      </div>
                                      <input 
                                        type="range" min="1" max="5" step="1"
                                        value={(formData as any)[field.key]}
                                        onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                      />
                                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                                          <span>待加強</span><span>普通</span><span>優秀</span>
                                      </div>
                                  </div>
                              ))}

                              <div>
                                  <label className="block font-bold text-slate-700 mb-2">主管評語</label>
                                  <textarea 
                                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 h-32 resize-none"
                                    placeholder="請輸入對該員工的具體評價與建議..."
                                    value={formData.managerComment}
                                    onChange={e => setFormData({...formData, managerComment: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">取消</button>
                      <button onClick={() => onSave(formData, false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">暫存草稿</button>
                      <button onClick={() => { if(confirm('確定要發布考核結果嗎？員工將會看到此成績。')) onSave(formData, true); }} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">發布考核</button>
                  </div>
              </div>
          </div>
      );
  };

  // --- View: My Performance Grade Card ---
  const GradeCard = ({ review }: { review: PerformanceReview }) => {
      const getGradeColor = (g: string) => {
          if (g === 'S') return 'text-amber-500 bg-amber-50 border-amber-200';
          if (g === 'A') return 'text-emerald-500 bg-emerald-50 border-emerald-200';
          if (g === 'B') return 'text-blue-500 bg-blue-50 border-blue-200';
          return 'text-slate-500 bg-slate-50 border-slate-200';
      };

      return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden max-w-2xl mx-auto mt-8">
              <div className="bg-slate-800 p-6 text-center text-white relative overflow-hidden">
                  <div className="relative z-10">
                      <h2 className="text-2xl font-bold mb-1">{currentUser.name} 的績效成績單</h2>
                      <p className="text-slate-400 font-mono">{review.period}</p>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-slate-800 to-slate-900 opacity-50"></div>
              </div>
              
              <div className="p-8 text-center">
                  <div className={`inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 shadow-inner mb-6 ${getGradeColor(review.grade)}`}>
                      <span className="text-5xl font-black">{review.grade}</span>
                      <span className="text-xs font-bold mt-1">等級</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-400 uppercase font-bold">總分</div>
                          <div className="text-2xl font-black text-slate-800">{review.totalScore}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-400 uppercase font-bold">任務達成</div>
                          <div className="text-2xl font-black text-blue-600">{review.metrics.taskCompletionRate}%</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-400 uppercase font-bold">SOP 執行</div>
                          <div className="text-2xl font-black text-indigo-600">{review.metrics.sopCompletionRate}%</div>
                      </div>
                  </div>

                  <div className="text-left bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase flex items-center gap-2">
                          <span>💬</span> 主管評語
                      </h4>
                      <p className="text-slate-700 leading-relaxed font-medium">
                          {review.managerComment || "（無評語）"}
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  // --- Main Render ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>🏆</span> 績效考核系統 (KPI)
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">工作表現評估與數據分析</p>
            </div>
            
            <div className="flex gap-4">
                <input 
                  type="month" 
                  value={currentPeriod}
                  onChange={(e) => setCurrentPeriod(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 bg-white"
                />
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {isManager && (
                        <button 
                            onClick={() => setActiveTab('TEAM_EVALUATION')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'TEAM_EVALUATION' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            團隊考核
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('MY_PERFORMANCE')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'MY_PERFORMANCE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        我的績效
                    </button>
                </div>
            </div>
        </div>

        {/* Loading */}
        {loading && <div className="text-center py-20 text-slate-400">數據載入與分析中...</div>}

        {/* Content: My Performance */}
        {!loading && activeTab === 'MY_PERFORMANCE' && (
            myReview ? (
                <GradeCard review={myReview} />
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <div className="text-4xl mb-4 grayscale opacity-30">⏳</div>
                    <h3 className="text-xl font-bold text-slate-600">本月份績效考核尚未發布</h3>
                    <p className="text-slate-400 mt-2">請耐心等候主管評核。</p>
                </div>
            )
        )}

        {/* Content: Team Evaluation */}
        {!loading && activeTab === 'TEAM_EVALUATION' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.filter(u => u.role === Role.EMPLOYEE && (currentUser.role === Role.BOSS || u.department === currentUser.department)).map(user => {
                    const review = teamReviews.find(r => r.targetUserId === user.id);
                    const isDone = review?.status === 'PUBLISHED';
                    const isDraft = review?.status === 'DRAFT';

                    return (
                        <div key={user.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={user.avatar} className="w-12 h-12 rounded-full border border-slate-200" />
                                <div>
                                    <h3 className="font-bold text-slate-800">{user.name}</h3>
                                    <p className="text-xs text-slate-500 font-bold">{getDeptName(user.department)}</p>
                                </div>
                                <div className="ml-auto">
                                    {isDone ? (
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">已發布</span>
                                    ) : isDraft ? (
                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">草稿</span>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold">未考核</span>
                                    )}
                                </div>
                            </div>
                            
                            {isDone && review ? (
                                <div className="mb-4 flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                    <span className="text-xs font-bold text-slate-500">總分: {review.totalScore}</span>
                                    <span className="text-lg font-black text-blue-600">等級 {review.grade}</span>
                                </div>
                            ) : (
                                <div className="mb-4 text-xs text-slate-400 italic p-2">
                                    尚無最終成績
                                </div>
                            )}

                            <button 
                                onClick={() => handleStartEvaluation(user)}
                                className={`w-full py-2 rounded-lg font-bold text-sm transition ${isDone ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}
                            >
                                {isDone ? '查看 / 修改評價' : (isDraft ? '繼續評分' : '開始考核')}
                            </button>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Edit Modal */}
        {editingReview && (
            <EvaluationModal 
                review={editingReview} 
                user={users.find(u => u.id === editingReview.targetUserId)!} 
                onClose={() => setEditingReview(null)}
                onSave={handleSaveEvaluation}
            />
        )}

    </div>
  );
};
