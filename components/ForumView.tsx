
import React, { useState, useMemo } from 'react';
import { User, Suggestion, SuggestionStatus, DepartmentDef, Role, SuggestionComment, hasPermission } from '../types';

interface ForumViewProps {
  currentUser: User;
  users: User[];
  suggestions: Suggestion[];
  departments: DepartmentDef[];
  onAddSuggestion: (suggestion: Omit<Suggestion, 'id' | 'status' | 'upvotes' | 'comments' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: SuggestionStatus) => void;
  onToggleUpvote: (id: string) => void;
  onAddComment: (suggestionId: string, content: string) => void;
}

export const ForumView: React.FC<ForumViewProps> = ({
  currentUser,
  users,
  suggestions,
  departments,
  onAddSuggestion,
  onUpdateStatus,
  onToggleUpvote,
  onAddComment
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('工作流程');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState('ALL');

  // Comment Input State (Map by suggestion ID)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || (id === 'ALL' ? '公司全體 / 總經理室' : id);
  const getUser = (id: string) => users.find(u => u.id === id);

  const categories = ['工作流程', '薪資福利', '設施修繕', '團隊活動', '系統建議', '其他'];

  const displayedSuggestions = useMemo(() => {
    let result = suggestions;
    if (filterCategory !== 'ALL') result = result.filter(s => s.category === filterCategory);
    if (filterStatus !== 'ALL') result = result.filter(s => s.status === filterStatus);
    
    // Sort by Date DESC
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [suggestions, filterCategory, filterStatus]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    onAddSuggestion({
      title,
      content,
      category,
      isAnonymous,
      targetDeptId,
      authorId: currentUser.id
    });
    setIsModalOpen(false);
    setIsSubmitting(false);
    setTitle('');
    setContent('');
    setCategory('工作流程');
    setIsAnonymous(false);
    setTargetDeptId('ALL');
  };

  const handleCommentSubmit = (suggestionId: string) => {
    const text = commentInputs[suggestionId];
    if (!text?.trim()) return;
    onAddComment(suggestionId, text);
    setCommentInputs(prev => ({ ...prev, [suggestionId]: '' }));
  };

  const getStatusBadge = (status: SuggestionStatus) => {
    switch(status) {
      case SuggestionStatus.OPEN: return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">🆕 新提案</span>;
      case SuggestionStatus.REVIEWING: return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 flex items-center gap-1"><span className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></span> 審核中</span>;
      case SuggestionStatus.APPROVED: return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">✅ 已採納</span>;
      case SuggestionStatus.REJECTED: return <span className="bg-slate-200 text-slate-500 px-2 py-1 rounded text-xs font-bold border border-slate-300">❌ 暫不考慮</span>;
    }
  };

  const canManageStatus = (suggestion: Suggestion) => {
    // Boss & Manager can manage all
    if (currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) return true;
    
    // Check permission
    if (hasPermission(currentUser, 'MANAGE_FORUM')) return true;

    // Supervisor can manage if targeted to their department
    if (currentUser.role === Role.SUPERVISOR && suggestion.targetDeptId === currentUser.department) return true;

    return false;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>💬</span> 員工提案論壇
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">
            您的聲音我們聽得見！歡迎提出建議，共同讓公司更好。
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 md:px-6 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition flex items-center gap-2 transform hover:-translate-y-0.5 text-sm md:text-base"
        >
           <span>✏️</span> 我要提案
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
         <select 
           value={filterCategory} 
           onChange={e => setFilterCategory(e.target.value)}
           className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
         >
            <option value="ALL">📂 所有分類</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
         </select>
         <select 
           value={filterStatus} 
           onChange={e => setFilterStatus(e.target.value)}
           className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
         >
            <option value="ALL">📊 所有狀態</option>
            <option value={SuggestionStatus.OPEN}>🆕 新提案</option>
            <option value={SuggestionStatus.REVIEWING}>👁️ 審核中</option>
            <option value={SuggestionStatus.APPROVED}>✅ 已採納</option>
            <option value={SuggestionStatus.REJECTED}>❌ 暫不考慮</option>
         </select>
      </div>

      {/* List */}
      <div className="space-y-6">
        {displayedSuggestions.length === 0 && (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="text-4xl mb-4 grayscale opacity-50">🗣️</div>
              <h3 className="text-xl font-bold text-slate-700">目前沒有提案</h3>
              <p className="text-slate-400 mt-2">成為第一個發聲的人吧！</p>
           </div>
        )}

        {displayedSuggestions.map(suggestion => {
          const author = getUser(suggestion.authorId);
          const isMe = currentUser.id === suggestion.authorId;
          const isUpvoted = (suggestion.upvotes || []).includes(currentUser.id);
          const managerAccess = canManageStatus(suggestion);

          // Display Logic for Author
          const displayAvatar = (suggestion.isAnonymous && !isMe) 
             ? 'https://api.dicebear.com/9.x/avataaars/svg?seed=Secret&backgroundColor=e2e8f0' 
             : (author?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(author?.name || 'unknown')}&backgroundColor=e2e8f4`);
          
          const displayName = (suggestion.isAnonymous && !isMe)
             ? '某位熱心同仁'
             : (author?.name || '未知使用者');

          const displayRole = (suggestion.isAnonymous && !isMe)
             ? '秘密客'
             : (author?.role === Role.EMPLOYEE ? '員工' : '管理層');

          return (
            <div key={suggestion.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-300">
               
               {/* Card Header */}
               <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                        <img src={displayAvatar} alt="Author" className={`w-full h-full object-cover ${suggestion.isAnonymous && !isMe ? 'opacity-50 scale-75' : ''}`} />
                     </div>
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="text-lg font-black text-slate-800">{suggestion.title}</h3>
                           {getStatusBadge(suggestion.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                           <span className={suggestion.isAnonymous && isMe ? 'text-indigo-500' : ''}>
                              {displayName} {suggestion.isAnonymous && isMe && '(您匿名發布)'}
                           </span>
                           <span className="text-slate-300">|</span>
                           <span>{suggestion.createdAt}</span>
                           <span className="text-slate-300">|</span>
                           <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{suggestion.category}</span>
                        </div>
                     </div>
                  </div>

                  {managerAccess && (
                     <select
                       value={suggestion.status}
                       onChange={(e) => onUpdateStatus(suggestion.id, e.target.value as SuggestionStatus)}
                       className="text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer"
                     >
                       <option value={SuggestionStatus.OPEN}>設為: 新提案</option>
                       <option value={SuggestionStatus.REVIEWING}>設為: 審核中</option>
                       <option value={SuggestionStatus.APPROVED}>設為: 已採納</option>
                       <option value={SuggestionStatus.REJECTED}>設為: 不考慮</option>
                     </select>
                  )}
               </div>

               {/* Content */}
               <div className="p-6">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-bold text-slate-500 mb-4 inline-block">
                     👉 建議對象：{getDeptName(suggestion.targetDeptId || 'ALL')}
                  </div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                     {suggestion.content}
                  </div>
                  
                  {/* Status Change Record */}
                  {suggestion.statusChangedBy && suggestion.statusChangedAt && (
                     <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                           <span>📝</span>
                           <span>狀態變更記錄：</span>
                           <span className="font-bold text-slate-600">
                              {getUser(suggestion.statusChangedBy)?.name || '未知管理員'}
                           </span>
                           <span>於</span>
                           <span className="font-bold text-slate-600">
                              {new Date(suggestion.statusChangedAt).toLocaleString('zh-TW', { 
                                 year: 'numeric', 
                                 month: '2-digit', 
                                 day: '2-digit',
                                 hour: '2-digit',
                                 minute: '2-digit'
                              })}
                           </span>
                           <span>變更為</span>
                           <span className="font-bold">{getStatusBadge(suggestion.status)}</span>
                        </div>
                     </div>
                  )}
               </div>

               {/* Actions Bar */}
               <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                  <button 
                    onClick={() => onToggleUpvote(suggestion.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition ${isUpvoted ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                     <span>👍</span> 附議 ({(suggestion.upvotes || []).length})
                  </button>
                  <div className="text-xs font-bold text-slate-400">
                     💬 {(suggestion.comments || []).length} 則討論
                  </div>
               </div>

               {/* Comments Section */}
               <div className="bg-slate-50/50 p-6 border-t border-slate-100 space-y-4">
                  {suggestion.comments.map(comment => {
                     const commenter = getUser(comment.userId);
                     const isOfficial = comment.isOfficialReply;
                     const defaultAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${comment.userId || 'unknown'}&backgroundColor=e2e8f0`;
                     
                     return (
                        <div key={comment.id} className={`flex gap-3 text-sm ${isOfficial ? 'bg-blue-50/50 p-3 rounded-xl border border-blue-100' : ''}`}>
                           <img src={commenter?.avatar || defaultAvatar} className="w-8 h-8 rounded-full border border-slate-200 bg-white flex-shrink-0" />
                           <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                 <div className="flex items-center gap-2">
                                    <span className={`font-bold ${isOfficial ? 'text-blue-700' : 'text-slate-700'}`}>
                                       {commenter?.name || '未知用戶'}
                                    </span>
                                    {isOfficial && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">官方回覆</span>}
                                 </div>
                                 <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                              </div>
                              <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                           </div>
                        </div>
                     );
                  })}

                  <div className="flex gap-2 mt-4">
                     <input 
                       type="text" 
                       value={commentInputs[suggestion.id] || ''}
                       onChange={(e) => setCommentInputs(prev => ({ ...prev, [suggestion.id]: e.target.value }))}
                       placeholder="加入討論..."
                       className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                       onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(suggestion.id)}
                     />
                     <button 
                       onClick={() => handleCommentSubmit(suggestion.id)}
                       className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition"
                     >
                        送出
                     </button>
                  </div>
               </div>

            </div>
          );
        })}
      </div>

      {/* Create Suggestion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span>✏️</span> 提出新建議
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1">標題</label>
                    <input 
                      type="text" required 
                      value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="簡短描述您的提議..."
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">分類</label>
                        <select 
                          value={category} onChange={e => setCategory(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                           {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">指定對象 (受理方)</label>
                        <select 
                          value={targetDeptId} onChange={e => setTargetDeptId(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                           <option value="ALL">公司全體 / 總經理室</option>
                           {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                           ))}
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1">詳細內容</label>
                    <textarea 
                      required rows={5}
                      value={content} onChange={e => setContent(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="請具體說明您的建議內容、預期效益..."
                    />
                 </div>

                 <div className="bg-indigo-50 p-3 rounded-lg flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="anonCheck"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="anonCheck" className="text-sm font-bold text-indigo-800 cursor-pointer select-none">
                       🕵️ 匿名發布 (隱藏您的姓名與頭像)
                    </label>
                 </div>

                 <div className="flex justify-end pt-2 gap-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">取消</button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">送出提案</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};
