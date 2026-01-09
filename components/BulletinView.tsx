
import React, { useState } from 'react';
import { Announcement, User, Role, DepartmentDef, hasPermission } from '../types';
import { CreateAnnouncementModal } from './CreateAnnouncementModal';
import { ReadStatusModal } from './ReadStatusModal';

interface BulletinViewProps {
  currentUser: User;
  announcements: Announcement[];
  users: User[];
  departments: DepartmentDef[];
  onCreateAnnouncement: (data: any) => void;
  onUpdateAnnouncement: (id: string, data: Partial<Announcement>) => void;
  onDeleteAnnouncement: (id: string) => void;
  onConfirmRead: (id: string) => void;
}

export const BulletinView: React.FC<BulletinViewProps> = ({ 
  currentUser, 
  announcements, 
  users, 
  departments,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement, 
  onConfirmRead 
}) => {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewStatusId, setViewStatusId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Check custom permission
  const canManage = hasPermission(currentUser, 'POST_ANNOUNCEMENT');

  // Sort: Unread first, then Important, then Date desc
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const aRead = a.readBy.includes(currentUser.id);
    const bRead = b.readBy.includes(currentUser.id);
    
    // 1. Unread first
    if (!aRead && bRead) return -1;
    if (aRead && !bRead) return 1;

    // 2. Important second
    if (a.priority === 'IMPORTANT' && b.priority !== 'IMPORTANT') return -1;
    if (a.priority !== 'IMPORTANT' && b.priority === 'IMPORTANT') return 1;

    // 3. Date desc
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getCreatorName = (id: string) => users.find(u => u.id === id)?.name || '未知使用者';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <span>📢</span> 企業公告欄
           </h2>
           <p className="text-sm text-slate-500 font-bold mt-1">
             公司重要政令宣導與活動通知
           </p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 shadow-md transition flex items-center gap-2"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
             發布公告
          </button>
        )}
      </div>

      <div className="space-y-6">
         {sortedAnnouncements.length === 0 && (
             <div className="text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-400">
                <div className="text-4xl mb-2 grayscale">📭</div>
                <p>目前沒有任何公告</p>
             </div>
         )}

         {sortedAnnouncements.map(ann => {
             const isRead = ann.readBy.includes(currentUser.id);
             const isImportant = ann.priority === 'IMPORTANT';
             const isCreator = ann.createdBy === currentUser.id;
             
             // Parse images if it's a JSON string
             const images = (() => {
               if (!ann.images) return [];
               if (Array.isArray(ann.images)) return ann.images;
               try {
                 return JSON.parse(ann.images);
               } catch {
                 return [];
               }
             })();
             
             return (
               <div 
                 key={ann.id} 
                 className={`relative rounded-xl p-6 transition-all duration-300
                    ${!isRead 
                        ? 'bg-white border-2 border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.15)] z-10 transform md:scale-[1.02]' 
                        : 'bg-slate-50 border border-slate-200 shadow-sm opacity-80 hover:opacity-100 hover:bg-white'
                    }
                    ${isImportant ? 'border-l-[6px] border-l-red-500' : ''}
                 `}
               >
                  {!isRead && (
                     <div className="absolute -top-3 -right-2 md:right-6 md:-top-4 bg-red-500 text-white text-xs md:text-sm font-bold px-4 py-1.5 rounded-full shadow-lg animate-bounce flex items-center gap-1 z-20 ring-4 ring-slate-50">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 top-0 left-0"></span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        尚未閱讀
                     </div>
                  )}

                  <div className="flex items-start justify-between mb-4 pr-4 md:pr-16">
                     <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shadow-inner ${isImportant ? 'bg-red-50 text-red-500' : 'bg-slate-200 text-slate-500'}`}>
                           {isImportant ? (
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"></path></svg>
                           ) : (
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                           )}
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                               <h3 className={`text-xl font-bold ${!isRead ? 'text-slate-900' : 'text-slate-600'}`}>{ann.title}</h3>
                               {!isRead && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">NEW</span>}
                           </div>
                           <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mt-1">
                              <span>{ann.createdAt}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span>發布人: {getCreatorName(ann.createdBy)}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className={`whitespace-pre-line leading-relaxed pl-1 md:pl-16 mb-6 text-sm ${!isRead ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                     {ann.content}
                  </div>

                  {/* 圖片顯示 */}
                  {images && images.length > 0 && (
                     <div className="pl-1 md:pl-16 mb-6">
                        <div className="flex flex-wrap gap-3">
                           {images.map((img: string, index: number) => (
                              <div 
                                 key={index} 
                                 className="relative group inline-block cursor-pointer"
                                 onClick={() => setPreviewImage(img)}
                              >
                                 <img 
                                    src={img} 
                                    alt={`公告圖片 ${index + 1}`}
                                    className="max-w-xs h-auto rounded-lg border border-slate-200 shadow-sm hover:shadow-lg transition"
                                 />
                                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition flex items-center justify-center pointer-events-none">
                                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                                    </svg>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 pl-1 md:pl-16">
                      <div className="flex items-center gap-2">
                          {isRead ? (
                             <span className="flex items-center gap-1 text-slate-400 text-sm font-bold bg-slate-100 px-4 py-1.5 rounded-full">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                您已確認收到
                             </span>
                          ) : (
                             <button 
                               onClick={() => onConfirmRead(ann.id)}
                               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5"
                             >
                                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                我已閱讀並確認
                             </button>
                          )}
                      </div>

                      <div className="flex items-center gap-2">
                         {isCreator && (
                            <>
                               <button 
                                 onClick={() => setEditingAnnouncement(ann)}
                                 className="text-slate-400 hover:text-blue-600 text-xs font-bold flex items-center gap-1 transition px-2 py-1 hover:bg-blue-50 rounded-lg"
                               >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                  編輯
                               </button>
                               <button 
                                 onClick={() => onDeleteAnnouncement(ann.id)}
                                 className="text-slate-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 transition px-2 py-1 hover:bg-red-50 rounded-lg"
                               >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  刪除
                               </button>
                            </>
                         )}
                         {canManage && (
                            <button 
                              onClick={() => setViewStatusId(ann.id)}
                              className="text-slate-400 hover:text-blue-600 text-xs font-bold flex items-center gap-1 transition px-2 py-1 hover:bg-blue-50 rounded-lg"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                               查看已讀狀況 ({Array.isArray(ann.readBy) ? ann.readBy.length : 0}/{users.length})
                            </button>
                         )}
                      </div>
                  </div>
               </div>
             );
         })}
      </div>

      <CreateAnnouncementModal 
         isOpen={isCreateOpen}
         onClose={() => setCreateOpen(false)}
         onSubmit={onCreateAnnouncement}
      />

      {editingAnnouncement && (
         <CreateAnnouncementModal 
            isOpen={!!editingAnnouncement}
            onClose={() => setEditingAnnouncement(null)}
            onSubmit={(data) => {
               onUpdateAnnouncement(editingAnnouncement.id, data);
               setEditingAnnouncement(null);
            }}
            initialData={editingAnnouncement}
         />
      )}

      {viewStatusId && (
         <ReadStatusModal 
           isOpen={!!viewStatusId}
           onClose={() => setViewStatusId(null)}
           announcement={announcements.find(a => a.id === viewStatusId)!}
           users={users}
           departments={departments}
         />
      )}

      {/* 圖片預覽模態框 */}
      {previewImage && (
         <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
         >
            <div className="relative max-w-7xl max-h-full">
               <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
               >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
               <img 
                  src={previewImage} 
                  alt="預覽圖片"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
               />
            </div>
         </div>
      )}
    </div>
  );
};
