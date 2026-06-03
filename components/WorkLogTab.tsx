// components/WorkLogTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  WorkLog,
  WorkLogImage,
  WorkLogImages,
  User,
  DepartmentDef,
  Role,
  SubmissionStats,
} from '../types';
import { api } from '../services/api';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';
import { EmptyState } from './EmptyState';
import { ImageUploader } from './files/ImageUploader';
import { ImageLightbox } from './files/ImageLightbox';

interface WorkLogTabProps {
  currentUser: User;
  departments: DepartmentDef[];
  users: User[];
}

type Section = 'today' | 'tomorrow' | 'notes';
type DateMode = 'day' | 'week';

const emptyImages = (): WorkLogImages => ({ today: [], tomorrow: [], notes: [] });

const formatDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayStr = () => formatDate(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
};
const weekStartStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return formatDate(d);
};

const WorkLogTab: React.FC<WorkLogTabProps> = ({ currentUser, departments, users }) => {
  const isManager = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [dateMode, setDateMode] = useState<DateMode>('day');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [formData, setFormData] = useState({
    date: todayStr(),
    todayTasks: '',
    tomorrowTasks: '',
    notes: '',
  });
  // Pending images for NEW log creation (uploaded after the log is created).
  // Each File is kept alongside a synthetic blob URL for thumbnail preview.
  const [pendingImages, setPendingImages] = useState<{
    today: { file: File; localUrl: string; hash: string }[];
    tomorrow: { file: File; localUrl: string; hash: string }[];
    notes: { file: File; localUrl: string; hash: string }[];
  }>({ today: [], tomorrow: [], notes: [] });
  const [yesterdayLog, setYesterdayLog] = useState<WorkLog | null>(null);

  const [lightbox, setLightbox] = useState<{ images: WorkLogImage[]; idx: number } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState<SubmissionStats | null>(null);

  const availableDepts = useMemo(
    () => (isManager ? departments : departments.filter((d) => d.id === currentUser.department)),
    [departments, isManager, currentUser.department]
  );

  const filteredUsers = useMemo(
    () => (selectedDept === 'ALL' ? users : users.filter((u) => u.department === selectedDept)),
    [users, selectedDept]
  );

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateMode === 'day') {
        params.date = selectedDate;
      } else {
        params.startDate = weekStartStr();
        params.endDate = todayStr();
        if (!isManager) params.userId = currentUser.id;
      }
      if (selectedDept !== 'ALL') params.departmentId = selectedDept;
      if (selectedUser !== 'ALL') params.userId = selectedUser;

      const response = await api.workLogs.getAll(params);
      const list = Array.isArray(response) ? response : response.logs || [];
      setLogs(list);
    } catch (error) {
      console.error('Failed to load work logs:', error);
      showError('載入工作日誌失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!isManager) return;
    try {
      const s = await api.workLogs.getSubmissionStats(todayStr());
      setStats(s);
    } catch {
      // Silent — stats are optional
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedUser, selectedDate, dateMode]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => {
      loadLogs();
      loadStats();
    };
    window.addEventListener('worklog-updated', handler);
    return () => window.removeEventListener('worklog-updated', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedUser, selectedDate, dateMode]);

  // ESC closes modal
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModalOpen]);

  const fetchYesterdayLog = async () => {
    try {
      const response = await api.workLogs.getAll({ date: yesterdayStr(), userId: currentUser.id });
      const list = Array.isArray(response) ? response : response.logs || [];
      setYesterdayLog(list.find((l: WorkLog) => l.userId === currentUser.id) || null);
    } catch {
      setYesterdayLog(null);
    }
  };

  const clearPendingImages = () => {
    setPendingImages((p) => {
      for (const sec of ['today', 'tomorrow', 'notes'] as Section[]) {
        for (const item of p[sec]) URL.revokeObjectURL(item.localUrl);
      }
      return { today: [], tomorrow: [], notes: [] };
    });
  };

  const handleCreate = () => {
    setEditingLog(null);
    setFormData({ date: selectedDate, todayTasks: '', tomorrowTasks: '', notes: '' });
    clearPendingImages();
    setFormError('');
    fetchYesterdayLog();
    setIsModalOpen(true);
  };

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      todayTasks: log.todayTasks,
      tomorrowTasks: log.tomorrowTasks,
      notes: log.notes,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCopyFromYesterday = async () => {
    if (!yesterdayLog) return;
    if (formData.todayTasks.trim() && !(await showConfirm('目前內容會被取代，確定嗎？'))) return;
    setFormData((d) => ({ ...d, todayTasks: yesterdayLog.tomorrowTasks }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.todayTasks.trim() || !formData.tomorrowTasks.trim()) {
      showWarning('請填寫今日工作事項和明天工作事項');
      return;
    }
    try {
      if (editingLog) {
        await api.workLogs.update(editingLog.id, formData);
      } else {
        const result = await api.workLogs.create(formData);
        const newLogId = result?.log?.id || result?.id;
        if (newLogId) {
          // Upload buffered pending images now that we have a log id
          let failed = 0;
          for (const sec of ['today', 'tomorrow', 'notes'] as Section[]) {
            for (const item of pendingImages[sec]) {
              try {
                await api.workLogs.images.upload(newLogId, sec, item.file);
              } catch {
                failed++;
              }
            }
          }
          if (failed > 0) showError(`${failed} 張圖片上傳失敗，可在編輯時重試`);
        }
        clearPendingImages();
      }
      setIsModalOpen(false);
      showSuccess(editingLog ? '工作日誌已更新' : '工作日誌已建立');
      await loadLogs();
      await loadStats();
    } catch (error: any) {
      const msg = error.message || '保存失敗';
      const displayMsg =
        msg.includes('already exists') || msg.includes('已有')
          ? '今天的工作日誌已存在，無法重複建立'
          : msg;
      setFormError(displayMsg);
      showError(displayMsg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('確定要刪除這條工作日誌嗎？'))) return;
    try {
      await api.workLogs.delete(id);
      await loadLogs();
      await loadStats();
    } catch {
      showError('刪除失敗');
    }
  };

  const refreshOneLog = async () => {
    await loadLogs();
  };

  const handleImageUpload = async (logId: string, section: Section, file: File) => {
    await api.workLogs.images.upload(logId, section, file);
    await refreshOneLog();
  };

  const handleImageRemove = async (logId: string, section: Section, hash: string) => {
    if (!(await showConfirm('確定要刪除這張圖片？'))) return;
    await api.workLogs.images.delete(logId, hash, section);
    await refreshOneLog();
  };

  const canRemoveImage = (img: WorkLogImage, log: WorkLog): boolean =>
    img.uploader_id === currentUser.id || log.userId === currentUser.id || isManager;

  const toggleCard = (id: string) =>
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const charCountClass = (n: number) =>
    n > 500 ? 'text-red-600' : n > 300 ? 'text-amber-600' : 'text-slate-400';

  return (
    <div>
      {/* Manager submission stats */}
      {isManager && stats && stats.totalEligible > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-slate-900 text-sm">📊 今日提交率</h3>
            <span
              className="font-mono font-bold text-emerald-700"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {stats.submittedCount} / {stats.totalEligible}（
              {Math.round((stats.submittedCount / stats.totalEligible) * 100)}%）
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(stats.submittedCount / stats.totalEligible) * 100}%` }}
            />
          </div>
          {stats.notSubmitted.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-bold mr-2">未交：</span>
              {stats.notSubmitted.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => {
                    setSelectedDept(u.department);
                    setSelectedUser(u.userId);
                  }}
                  className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 hover:bg-amber-100 rounded text-slate-700 hover:text-amber-800"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date chips + filters + create button */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex gap-1">
          {[
            { label: '昨天', date: yesterdayStr(), mode: 'day' as DateMode },
            { label: '今天', date: todayStr(), mode: 'day' as DateMode },
            { label: '本週', date: '', mode: 'week' as DateMode },
          ].map((chip) => {
            const active =
              dateMode === chip.mode && (chip.mode === 'week' || selectedDate === chip.date);
            return (
              <button
                key={chip.label}
                onClick={() => {
                  setDateMode(chip.mode);
                  if (chip.mode === 'day') setSelectedDate(chip.date);
                }}
                className={`px-3 h-9 text-sm font-bold rounded-lg transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-stone-50 text-slate-600 hover:bg-stone-100 border border-slate-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {dateMode === 'day' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 h-9 bg-stone-50 border border-slate-200 rounded-lg text-sm"
          />
        )}

        {isManager && (
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedUser('ALL');
            }}
            className="px-3 h-9 bg-stone-50 border border-slate-200 rounded-lg text-sm"
            aria-label="部門"
          >
            <option value="ALL">全部部門</option>
            {availableDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-3 h-9 bg-stone-50 border border-slate-200 rounded-lg text-sm"
          aria-label="員工"
        >
          <option value="ALL">全部員工</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <button
            onClick={handleCreate}
            className="px-4 h-10 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700"
          >
            + 新增日誌
          </button>
        </div>
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="📓"
          title={
            dateMode === 'week'
              ? '本週還沒有工作日誌'
              : selectedDate === todayStr()
                ? '今天還沒有工作日誌'
                : '這天沒有工作日誌'
          }
          description={
            dateMode === 'day' && selectedDate === todayStr() ? '寫一篇記錄今日進度吧' : undefined
          }
          actionLabel={
            dateMode === 'day' && selectedDate === todayStr() ? '立刻寫今日日誌' : undefined
          }
          onAction={dateMode === 'day' && selectedDate === todayStr() ? handleCreate : undefined}
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const images = log.images || emptyImages();
            const isOwner = log.userId === currentUser.id;
            const isExpanded = expandedCards.has(log.id);
            const longest = Math.max(
              log.todayTasks.length,
              log.tomorrowTasks.length,
              log.notes.length
            );
            const needsCollapse = longest > 200;

            const renderSection = (
              label: string,
              text: string,
              imgs: WorkLogImage[],
              _section: Section
            ) => (
              <div className="mb-3">
                <div className="font-bold text-slate-700 text-sm mb-1">{label}</div>
                <div
                  className={`text-sm text-slate-700 whitespace-pre-wrap ${
                    needsCollapse && !isExpanded ? 'line-clamp-3' : ''
                  }`}
                >
                  {text || <span className="text-slate-400 italic">（無）</span>}
                </div>
                {imgs.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                    {imgs.map((img, idx) => (
                      <button
                        key={img.hash + idx}
                        onClick={() => setLightbox({ images: imgs, idx })}
                        className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 bg-slate-50"
                        aria-label={`預覽 ${img.filename}`}
                      >
                        <img
                          src={api.workLogs.images.getUrl(img.hash, img.filename)}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <span className="font-bold text-slate-900">{log.userName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-600">{log.departmentName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-600">{log.date}</span>
                  </div>
                  {(isOwner || isManager) && (
                    <div className="flex gap-1">
                      {isOwner && (
                        <button
                          onClick={() => handleEdit(log)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          編輯
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>

                {renderSection('今日工作事項', log.todayTasks, images.today, 'today')}
                {renderSection('明天工作事項', log.tomorrowTasks, images.tomorrow, 'tomorrow')}
                {log.notes && renderSection('特別備註', log.notes, images.notes, 'notes')}

                {needsCollapse && (
                  <button
                    onClick={() => toggleCard(log.id)}
                    className="text-xs font-bold text-blue-600 hover:underline mt-1"
                  >
                    {isExpanded ? '收合' : '展開全文'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ animation: 'modalEnter 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-black text-slate-900 text-lg">
                {editingLog ? '編輯工作日誌' : '新增工作日誌'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                aria-label="關閉"
                title="關閉 (Esc)"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-bold">
                  {formError}
                </div>
              )}

              {!editingLog && yesterdayLog && (
                <button
                  type="button"
                  onClick={handleCopyFromYesterday}
                  className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-sm font-bold text-amber-800 flex items-center justify-center gap-2"
                >
                  📋 從昨日「明天工作事項」複製到今日
                </button>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!!editingLog}
                  className="w-full px-3 h-10 bg-stone-50 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>

              {[
                {
                  key: 'todayTasks',
                  label: '今日工作事項',
                  section: 'today' as Section,
                  required: true,
                },
                {
                  key: 'tomorrowTasks',
                  label: '明天工作事項',
                  section: 'tomorrow' as Section,
                  required: true,
                },
                { key: 'notes', label: '特別備註', section: 'notes' as Section, required: false },
              ].map(({ key, label, section, required }) => {
                const value = (formData as any)[key] as string;
                const imgs = editingLog?.images?.[section] || [];
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between mb-1">
                      <label className="block text-sm font-bold text-slate-700">
                        {label} {required && <span className="text-red-500">*</span>}
                      </label>
                      <span
                        className={`text-xs font-mono ${charCountClass(value.length)}`}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {value.length} / 500
                      </span>
                    </div>
                    <textarea
                      value={value}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                      rows={4}
                      placeholder={required ? `請輸入${label}...` : '其他需要注意的事項...'}
                      required={required}
                    />
                    {editingLog ? (
                      <div className="mt-2">
                        <ImageUploader
                          images={imgs}
                          maxCount={10}
                          onAdd={(file) => handleImageUpload(editingLog.id, section, file)}
                          onRemove={(hash) => handleImageRemove(editingLog.id, section, hash)}
                          onPreview={(_, idx) => setLightbox({ images: imgs, idx })}
                          canRemove={(img) => canRemoveImage(img, editingLog)}
                          label="附件圖片"
                        />
                      </div>
                    ) : (
                      <div className="mt-2">
                        <ImageUploader
                          images={pendingImages[section].map((p) => ({
                            hash: p.hash,
                            filename: p.file.name,
                            size: p.file.size,
                            mime_type: p.file.type,
                            uploader_id: currentUser.id,
                            uploaded_at: new Date().toISOString(),
                          }))}
                          maxCount={10}
                          onAdd={async (file) => {
                            const localUrl = URL.createObjectURL(file);
                            const hash = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                            setPendingImages((p) => ({
                              ...p,
                              [section]: [...p[section], { file, localUrl, hash }],
                            }));
                          }}
                          onRemove={async (hash) => {
                            const item = pendingImages[section].find((p) => p.hash === hash);
                            if (item) URL.revokeObjectURL(item.localUrl);
                            setPendingImages((p) => ({
                              ...p,
                              [section]: p[section].filter((x) => x.hash !== hash),
                            }));
                          }}
                          onPreview={(img) => {
                            const url = pendingImages[section].find(
                              (p) => p.hash === img.hash
                            )?.localUrl;
                            if (url) window.open(url, '_blank', 'noopener');
                          }}
                          canRemove={() => true}
                          label="附件圖片（建立後一併上傳）"
                          resolveUrl={(img) =>
                            pendingImages[section].find((p) => p.hash === img.hash)?.localUrl || ''
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </form>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 h-10 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any)}
                className="px-5 h-10 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                {editingLog ? '更新' : '建立'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogTab;
