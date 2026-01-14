
import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { User, FinanceRecord, DepartmentDef, Role, hasPermission } from '../types';

const KOLManagementView = lazy(() => import('./KOLManagementView').then(m => ({ default: m.KOLManagementView })));

interface FinanceViewProps {
  currentUser: User;
  users: User[];
  records: FinanceRecord[];
  departments: DepartmentDef[];
  onAddRecord: (record: Omit<FinanceRecord, 'id'>) => void;
  onConfirmRecord: (id: string) => void;
  onDeleteRecord: (id: string) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ 
  currentUser, 
  users, 
  records, 
  departments, 
  onAddRecord, 
  onConfirmRecord,
  onDeleteRecord 
}) => {
  const [mainTab, setMainTab] = useState<'PETTY_CASH' | 'KOL'>('PETTY_CASH');
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'DEPT' | 'ALL'>('DEPT');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null); // For image preview modal
  
  // Filter States (View Level)
  const [filterDept, setFilterDept] = useState<string>(currentUser.department);
  const [filterUser, setFilterUser] = useState<string>(currentUser.id);

  // Modal Form States
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formCategory, setFormCategory] = useState('餐費');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [requireConfirm, setRequireConfirm] = useState(false);
  const [attachment, setAttachment] = useState<string>('');
  
  // Modal Target States
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [targetUserId, setTargetUserId] = useState<string>('');

  // Searchable Dropdown States
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;
  const isSupervisor = currentUser.role === Role.SUPERVISOR;

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;
  const getUserName = (id?: string) => users.find(u => u.id === id)?.name || '公費';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Logic: Filter Records based on Tab & Role ---
  const filteredRecords = useMemo(() => {
    let result = records;

    if (activeTab === 'ALL') {
       // Boss Only View
       if (filterDept !== 'ALL') {
           result = result.filter(r => r.departmentId === filterDept);
       }
    } else if (activeTab === 'DEPT') {
       // Department Fund View
       // Supervisor/Employee sees their own dept. Boss sees selected filterDept.
       const targetDept = isBoss ? filterDept : currentUser.department;
       result = result.filter(r => r.scope === 'DEPARTMENT' && r.departmentId === targetDept);
    } else if (activeTab === 'PERSONAL') {
       // Personal Fund View
       if (isBoss || isSupervisor) {
           // Boss/Supervisor can see specific employee
           result = result.filter(r => r.scope === 'PERSONAL' && r.ownerId === filterUser);
       } else {
           // Employee sees only self
           result = result.filter(r => r.scope === 'PERSONAL' && r.ownerId === currentUser.id);
       }
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, activeTab, filterDept, filterUser, currentUser, isBoss, isSupervisor]);

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(50);
  
  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [activeTab, filterDept, filterUser]);

  const displayedRecords = useMemo(() => {
      return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, visibleCount]);

  // --- Logic: Calculate Stats (Completed Only) - Use filteredRecords for accurate stats ---
  const stats = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => {
        if (curr.status === 'PENDING') {
            if (curr.type === 'INCOME') acc.pendingIncome += curr.amount;
            return acc; // Skip balance calc for pending
        }

        if (curr.type === 'INCOME') {
            acc.income += curr.amount;
            acc.balance += curr.amount;
        } else {
            acc.expense += curr.amount;
            acc.balance -= curr.amount;
        }
        return acc;
    }, { income: 0, expense: 0, balance: 0, pendingIncome: 0 });
  }, [filteredRecords]);

  // --- Logic: Can current user Add Record? ---
  const canAddRecord = useMemo(() => {
      if (activeTab === 'ALL') return false; // Dashboard view only
      if (activeTab === 'DEPT') {
          // Boss can add to any dept (selector in modal)
          if (isBoss) return true;
          
          // Employees with permission or Supervisors can add to THEIR own dept
          const targetDept = isBoss ? filterDept : currentUser.department;
          if (currentUser.department === targetDept && (isSupervisor || hasPermission(currentUser, 'MANAGE_FINANCE'))) return true;
          
          // Fallback: Previously allowed all employees to add records to own dept
          if (currentUser.department === targetDept) return true;

          return false; 
      }
      if (activeTab === 'PERSONAL') {
          // Users can manage their own personal fund record
          return true; 
      }
      return false;
  }, [activeTab, isBoss, isSupervisor, currentUser, filterDept]);

  // Filter available users for dropdown in modal
  const modalAvailableUsers = useMemo(() => {
      if (isBoss) return users; // Boss sees all
      if (isSupervisor) return users.filter(u => u.department === currentUser.department);
      return [currentUser];
  }, [users, isBoss, isSupervisor, currentUser]);

  // Filtered users for search inside modal
  const filteredModalUsers = useMemo(() => {
      if (!userSearchQuery) return modalAvailableUsers;
      const lowerQ = userSearchQuery.toLowerCase();
      return modalAvailableUsers.filter(u => 
        u.name.toLowerCase().includes(lowerQ) || 
        u.username.toLowerCase().includes(lowerQ) ||
        getDeptName(u.department).toLowerCase().includes(lowerQ)
      );
  }, [modalAvailableUsers, userSearchQuery, departments]);

  const selectedTargetUser = users.find(u => u.id === targetUserId);

  // Determine if it's an "Allocation" scenario (Superior giving to subordinate)
  const isAllocationScenario = useMemo(() => {
      if (formType !== 'INCOME') return false;
      if (isBoss) return true; // Boss giving money is always allocation
      if (isSupervisor && activeTab === 'PERSONAL' && targetUserId !== currentUser.id) return true;
      return false;
  }, [formType, isBoss, isSupervisor, activeTab, targetUserId, currentUser]);

  const handleOpenModal = () => {
      setFormAmount('');
      setFormDesc('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setRequireConfirm(false);
      setAttachment('');
      setUserSearchQuery('');
      setIsUserDropdownOpen(false);
      
      // Initialize Target Defaults
      if (activeTab === 'DEPT') {
          setTargetDeptId(isBoss ? (filterDept !== 'ALL' ? filterDept : departments[0].id) : currentUser.department);
      } else {
          // Personal
          if (isBoss || isSupervisor) {
             setTargetUserId(filterUser !== 'ALL' ? filterUser : currentUser.id); 
          } else {
             setTargetUserId(currentUser.id);
          }
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      let ownerId: string | undefined = undefined;
      let scope: 'DEPARTMENT' | 'PERSONAL' = 'DEPARTMENT';
      let deptId = currentUser.department;

      if (activeTab === 'DEPT') {
          scope = 'DEPARTMENT';
          // Use the selected target dept from modal logic
          deptId = isBoss ? targetDeptId : currentUser.department;
      } else {
          scope = 'PERSONAL';
          // Use the selected target user from modal logic
          ownerId = (isBoss || isSupervisor) ? targetUserId : currentUser.id;
          deptId = users.find(u => u.id === ownerId)?.department || currentUser.department;
      }

      onAddRecord({
          date: formDate,
          amount: Number(formAmount),
          type: formType,
          status: requireConfirm ? 'PENDING' : 'COMPLETED',
          category: formCategory,
          description: formDesc,
          scope,
          departmentId: deptId,
          ownerId,
          recordedBy: currentUser.id,
          attachment
      });

      setIsModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAttachment(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const categories = ['餐費', '交通費', '文具雜支', '交際費', '設備採購', '獎金撥款', '公費撥款', '其他'];

  // Helper render for card and row to avoid duplication of confirm logic
  const renderConfirmButton = (record: FinanceRecord) => {
      const canConfirm = record.status === 'PENDING' && (
          (record.scope === 'DEPARTMENT' && currentUser.department === record.departmentId && (isSupervisor || isBoss || hasPermission(currentUser, 'MANAGE_FINANCE'))) ||
          (record.scope === 'PERSONAL' && record.ownerId === currentUser.id)
      );
      
      if (!canConfirm) return null;
      
      return (
          <button
              onClick={(e) => { e.stopPropagation(); onConfirmRecord(record.id); }}
              className="text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded text-xs font-bold shadow-sm transition mr-2"
          >
              確認收款
          </button>
      );
  };

  const renderDeleteButton = (record: FinanceRecord) => {
      if (!(isBoss || (isSupervisor && activeTab !== 'ALL'))) return null;
      return (
          <button 
              onClick={(e) => { e.stopPropagation(); if(window.confirm('確定要刪除這筆紀錄嗎？')) onDeleteRecord(record.id); }}
              className="text-slate-300 hover:text-red-500 transition p-1"
          >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
      );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* 主分頁導航 */}
        <div className="flex gap-4 mb-6">
            <button
                onClick={() => setMainTab('PETTY_CASH')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-md ${
                    mainTab === 'PETTY_CASH'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-105'
                        : 'bg-white text-gray-600 hover:shadow-lg'
                }`}
            >
                💰 零用金管理
            </button>
            <button
                onClick={() => setMainTab('KOL')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-md ${
                    mainTab === 'KOL'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105'
                        : 'bg-white text-gray-600 hover:shadow-lg'
                }`}
            >
                🎯 KOL 管理
            </button>
        </div>

        {/* 零用金管理內容 */}
        {mainTab === 'PETTY_CASH' && (
            <>
                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
                    <div className="w-full md:w-auto">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span>💰</span> 零用金管理
                        </h2>
                        <p className="text-sm text-slate-500 font-bold mt-1">部門公費與員工零用金收支紀錄</p>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
                        <button 
                            onClick={() => setActiveTab('DEPT')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === 'DEPT' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            部門零用金
                        </button>
                        <button 
                            onClick={() => setActiveTab('PERSONAL')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === 'PERSONAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            個人零用金
                        </button>
                        {isBoss && (
                            <button 
                                onClick={() => setActiveTab('ALL')}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === 'ALL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                        全公司總覽
                    </button>
                )}
            </div>
        </div>

        {/* Filters - Responsive Stack */}
        <div className="flex flex-col md:flex-row flex-wrap gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-start md:items-center">
            <div className="text-sm font-bold text-slate-400 uppercase">當前檢視：</div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                {/* Department Selector */}
                {isBoss && activeTab !== 'PERSONAL' ? (
                    <select 
                        value={filterDept} 
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {activeTab === 'ALL' && <option value="ALL">🏢 所有部門</option>}
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                ) : (
                    <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 flex items-center gap-2 cursor-not-allowed">
                        <span>🏢</span> {getDeptName(isBoss ? filterDept : currentUser.department)}
                    </div>
                )}

                {/* User Selector (For Personal Tab) */}
                {activeTab === 'PERSONAL' && (
                    <>
                        <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
                        {(isBoss || isSupervisor) ? (
                            <select 
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {users.filter(u => isBoss || u.department === currentUser.department).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 flex items-center gap-2 cursor-not-allowed">
                                <span>👤</span> {currentUser.name}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Dashboard Cards - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group col-span-1 md:col-span-2">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition text-6xl">💰</div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">當前可用餘額 (Balance)</h3>
                <div className={`text-4xl font-black font-mono tracking-tight ${stats.balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                    ${stats.balance.toLocaleString()}
                </div>
                {stats.pendingIncome > 0 && (
                    <div className="mt-2 text-xs font-bold text-amber-500 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
                        ⏳ 尚有 +${stats.pendingIncome.toLocaleString()} 待確認入帳
                    </div>
                )}
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition text-6xl text-emerald-500">📈</div>
                <h3 className="text-sm font-bold text-emerald-600 uppercase mb-2">總撥款 / 收入</h3>
                <div className="text-3xl font-black font-mono text-emerald-600">
                    +${stats.income.toLocaleString()}
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition text-6xl text-red-500">📉</div>
                <h3 className="text-sm font-bold text-red-500 uppercase mb-2">總支出 / 報銷</h3>
                <div className="text-3xl font-black font-mono text-red-500">
                    -${stats.expense.toLocaleString()}
                </div>
            </div>
        </div>

        {/* Action Bar */}
        {canAddRecord && (
            <div className="flex justify-end">
                <button 
                    onClick={handleOpenModal}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg shadow-slate-200 transition flex items-center gap-2"
                >
                    <span>＋</span> 新增收支紀錄
                </button>
            </div>
        )}

        {/* Transaction List Container */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            
            {/* Desktop View: Table */}
            <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <th className="p-4">日期</th>
                        <th className="p-4">類別</th>
                        <th className="p-4">說明 / 憑證</th>
                        <th className="p-4">狀態</th>
                        <th className="p-4 text-right">金額</th>
                        <th className="p-4 text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {displayedRecords.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">目前沒有相關紀錄</td>
                        </tr>
                    ) : (
                        displayedRecords.map(record => (
                            <tr key={record.id} className={`hover:bg-slate-50/50 transition ${record.status === 'PENDING' ? 'bg-amber-50/30' : ''}`}>
                                <td className="p-4 font-mono text-slate-500">{record.date}</td>
                                <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                                        {record.category}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="text-slate-700 font-medium">{record.description}</div>
                                    <div className="flex gap-2 items-center mt-1">
                                        <div className="text-[10px] text-slate-400">
                                            {record.scope === 'DEPARTMENT' 
                                                ? <span className="text-blue-600 font-bold">{getDeptName(record.departmentId)}公費</span> 
                                                : <span className="text-indigo-600 font-bold">{getUserName(record.ownerId)}</span>
                                            }
                                        </div>
                                        {record.attachment && (
                                            <button 
                                                onClick={() => setViewImage(record.attachment!)}
                                                className="text-[10px] flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition border border-slate-200"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                                憑證
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    {record.status === 'PENDING' ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded border border-amber-200 animate-pulse">
                                            ⏳ 待確認
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                            ✅ 已入帳
                                        </span>
                                    )}
                                </td>
                                <td className={`p-4 text-right font-mono font-bold text-base ${record.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {record.type === 'INCOME' ? '+' : '-'}{record.amount.toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                    {renderConfirmButton(record)}
                                    {renderDeleteButton(record)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            
            {filteredRecords.length > visibleCount && (
                <div className="text-center py-4 bg-slate-50 border-t border-slate-200">
                    <button 
                        onClick={() => setVisibleCount(prev => prev + 50)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                        載入更多紀錄 ({filteredRecords.length - visibleCount} 筆剩餘)...
                    </button>
                </div>
            )}

            {/* Mobile View: Cards */}
            <div className="md:hidden p-4 space-y-4 bg-slate-50/50">
                {displayedRecords.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">目前沒有相關紀錄</div>
                ) : (
                    displayedRecords.map(record => (
                        <div key={record.id} className={`bg-white p-4 rounded-xl border shadow-sm ${record.status === 'PENDING' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'}`}>
                            
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-mono text-slate-400 block mb-1">{record.date}</span>
                                    <div className="font-bold text-slate-700 text-sm line-clamp-2">{record.description}</div>
                                </div>
                                <div className={`font-mono font-black text-lg ${record.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {record.type === 'INCOME' ? '+' : '-'}{record.amount.toLocaleString()}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
                                    {record.category}
                                </span>
                                {record.scope === 'DEPARTMENT' 
                                    ? <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{getDeptName(record.departmentId)}公費</span> 
                                    : <span className="text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{getUserName(record.ownerId)}</span>
                                }
                                {record.status === 'PENDING' && (
                                    <span className="text-amber-600 text-xs font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200 animate-pulse">待確認</span>
                                )}
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                {record.attachment ? (
                                    <button 
                                        onClick={() => setViewImage(record.attachment!)}
                                        className="text-xs font-bold text-blue-500 flex items-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                        查看憑證
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-300">無憑證</span>
                                )}

                                <div className="flex gap-2">
                                    {renderConfirmButton(record)}
                                    {renderDeleteButton(record)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Create Record Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 bg-slate-50 z-10">
                        <h2 className="text-xl font-bold text-slate-800">
                            新增{activeTab === 'DEPT' ? '公費' : '零用金'}紀錄
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                            <button 
                                type="button"
                                onClick={() => setFormType('EXPENSE')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition ${formType === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                支出 (Expense)
                            </button>
                            <button 
                                type="button"
                                onClick={() => setFormType('INCOME')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition ${formType === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                收入 / 撥款 (Income)
                            </button>
                        </div>

                        {/* Target Selection Fields (Context Aware) */}
                        {activeTab === 'DEPT' && isBoss && (
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">目標部門</label>
                                <select 
                                    value={targetDeptId} 
                                    onChange={(e) => setTargetDeptId(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* SEARCHABLE DROPDOWN FOR USER SELECTION */}
                        {activeTab === 'PERSONAL' && (isBoss || isSupervisor) && (
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-sm font-bold text-slate-500 mb-1">目標員工 (可搜尋)</label>
                                
                                <div 
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg cursor-pointer bg-white hover:border-blue-400 transition flex items-center justify-between"
                                >
                                    {selectedTargetUser ? (
                                        <div className="flex items-center gap-2">
                                            <img src={selectedTargetUser.avatar} className="w-5 h-5 rounded-full" />
                                            <span className="text-slate-800 font-bold">{selectedTargetUser.name}</span>
                                            <span className="text-xs text-slate-400">({getDeptName(selectedTargetUser.department)})</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">請選擇員工...</span>
                                    )}
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>

                                {isUserDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                            <div className="relative">
                                                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                                <input 
                                                    type="text"
                                                    value={userSearchQuery}
                                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                                                    placeholder="輸入姓名或部門..."
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {filteredModalUsers.map(u => (
                                                <div 
                                                    key={u.id}
                                                    onClick={() => {
                                                        setTargetUserId(u.id);
                                                        setIsUserDropdownOpen(false);
                                                        setUserSearchQuery('');
                                                    }}
                                                    className={`px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0 transition ${targetUserId === u.id ? 'bg-blue-50' : ''}`}
                                                >
                                                    <img src={u.avatar} className="w-8 h-8 rounded-full border border-slate-100" />
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700">{u.name}</div>
                                                        <div className="text-xs text-slate-400">{getDeptName(u.department)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredModalUsers.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400">
                                                    找不到相關人員
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">日期</label>
                            <input type="date" required value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">金額</label>
                            <input type="number" required value={formAmount} onChange={e => setFormAmount(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg" placeholder="0" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">類別</label>
                            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">說明 / 用途</label>
                            <input type="text" required value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如：購買辦公室咖啡豆" />
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">上傳憑證 (發票/收據)</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition flex flex-col items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                                {attachment ? (
                                    <div className="relative group">
                                        <img src={attachment} alt="Preview" className="h-20 object-contain rounded" />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition rounded">
                                            更換
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        <span className="text-xs">點擊上傳圖片</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Confirmation Checkbox (Only for Allocations) */}
                        {isAllocationScenario && (
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={requireConfirm} 
                                        onChange={(e) => setRequireConfirm(e.target.checked)}
                                        className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-bold text-amber-800">
                                        需要接收方確認入帳 (Pending)
                                    </span>
                                </label>
                                <p className="text-xs text-amber-600 mt-1 pl-6">
                                    勾選後，對方需點擊「確認收款」款項才會計入餘額。
                                </p>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">取消</button>
                            <button type="submit" className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 shadow-md">確認儲存</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Image Preview Modal */}
        {viewImage && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-fade-in" onClick={() => setViewImage(null)}>
                <div className="relative max-w-4xl max-h-[90vh]">
                    <img src={viewImage} alt="Receipt" className="max-w-full max-h-[90vh] rounded shadow-2xl" />
                    <button onClick={() => setViewImage(null)} className="absolute -top-4 -right-4 bg-white rounded-full p-2 text-black hover:scale-110 transition shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
        )}
            </>
        )}

        {/* KOL 管理內容 */}
        {mainTab === 'KOL' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64">載入中...</div>}>
                <KOLManagementView currentUser={currentUser} departments={departments} />
            </Suspense>
        )}
    </div>
  );
};
