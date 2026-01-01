
import React, { useState, useMemo } from 'react';
import { User, Role, DepartmentDef } from '../types';
import { DepartmentManager } from './DepartmentManager';

interface PersonnelViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddDepartment: (dept: DepartmentDef) => void;
  onUpdateDepartment: (dept: DepartmentDef) => void; // New Prop
  onDeleteDepartment: (id: string) => void;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({ 
  currentUser, 
  users, 
  departments, 
  onAddUser, 
  onEditUser, 
  onDeleteUser,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment
}) => {
  const [viewMode, setViewMode] = useState<'GRID' | 'TREE' | 'DEPT_MGMT'>('GRID');
  const [filterDept, setFilterDept] = useState<string>('ALL');

  // Dynamic Map
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;
  const getDeptColor = (id: string) => {
      const theme = departments.find(d => d.id === id)?.theme || 'slate';
      return `border-${theme}-200 bg-${theme}-50`;
  };

  const visibleUsers = useMemo(() => {
    let result = users;

    if (currentUser.role === Role.SUPERVISOR) {
      result = result.filter(u => u.department === currentUser.department);
    }

    if (currentUser.role === Role.BOSS && filterDept !== 'ALL') {
      result = result.filter(u => u.department === filterDept);
    }
    
    return result.sort((a, b) => {
        const roleOrder = { [Role.BOSS]: 0, [Role.MANAGER]: 1, [Role.SUPERVISOR]: 2, [Role.EMPLOYEE]: 3 };
        return roleOrder[a.role] - roleOrder[b.role];
    });
  }, [users, currentUser, filterDept]);

  const getRoleBadgeColor = (role: Role) => {
    switch(role) {
      case Role.BOSS: return 'bg-slate-800 text-white';
      case Role.MANAGER: return 'bg-indigo-600 text-white';
      case Role.SUPERVISOR: return 'bg-purple-100 text-purple-700';
      case Role.EMPLOYEE: return 'bg-blue-50 text-blue-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getRoleLabel = (role: Role) => {
    switch(role) {
      case Role.BOSS: return '董事長';
      case Role.MANAGER: return '總經理';
      case Role.SUPERVISOR: return '部門主管';
      case Role.EMPLOYEE: return '員工';
      default: return '未知';
    }
  };

  // --- Tree View Component ---
  const TreeCard = ({ user, isRoot = false }: { user: User, isRoot?: boolean }) => (
    <div className={`
      relative group flex flex-col items-center p-2 md:p-3 rounded-xl border shadow-sm transition-all hover:shadow-md bg-white z-10 w-32 md:w-48
      ${isRoot ? 'border-slate-800 ring-2 ring-slate-100' : 'border-slate-200'}
      ${user.role === Role.MANAGER ? 'border-indigo-200 ring-1 ring-indigo-50' : ''}
      ${user.role === Role.SUPERVISOR ? 'border-purple-200' : ''}
    `}>
       <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-slate-200 overflow-hidden mb-1 md:mb-2">
           <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
       </div>
       <div className="text-center w-full">
           <div className="font-bold text-slate-800 text-xs md:text-sm truncate">{user.name}</div>
           <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase inline-block mb-1 ${getRoleBadgeColor(user.role)}`}>
               {getRoleLabel(user.role)}
           </span>
           <div className="text-[10px] text-slate-400 font-bold">{getDeptName(user.department)}</div>
       </div>

       {!(currentUser.role === Role.SUPERVISOR && (user.role === Role.BOSS || user.role === Role.MANAGER)) && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg shadow-sm border border-slate-100 flex">
               <button onClick={() => onEditUser(user)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="編輯"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
               {currentUser.id !== user.id && (
                  <button onClick={() => onDeleteUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="刪除"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
               )}
          </div>
       )}
    </div>
  );

  const renderTree = () => {
    // 1. Find Root (Boss)
    const rootUser = currentUser.role === Role.BOSS 
        ? users.find(u => u.role === Role.BOSS) 
        : currentUser;

    if (!rootUser) return <div className="p-10 text-center text-slate-400">找不到管理層資料</div>;

    // Helper: Get Employees for a department
    const getEmployees = (deptId: string) => {
        return users.filter(u => u.role === Role.EMPLOYEE && u.department === deptId);
    };

    // Helper: Get Managers
    const getManagers = () => {
        return users.filter(u => u.role === Role.MANAGER);
    };

    // Helper: Build structure (Department -> Supervisor -> Employees)
    const getBranches = () => {
        return departments.map(dept => {
            const supervisor = users.find(u => u.role === Role.SUPERVISOR && u.department === dept.id);
            const employees = getEmployees(dept.id);
            
            // Only show department branch if there is a supervisor OR employees
            if (!supervisor && employees.length === 0) return null;
            
            return { dept, supervisor, employees };
        }).filter(Boolean); // remove nulls
    };

    const managers = getManagers();
    const branches = getBranches();
    const myDeptEmployees = currentUser.role === Role.SUPERVISOR ? getEmployees(currentUser.department) : [];

    return (
      <div className="flex flex-col items-center py-10 overflow-x-auto min-h-[600px] w-full bg-slate-50/50 rounded-xl">
         
         {/* --- LEVEL 1: ROOT (BOSS or SUPERVISOR or MANAGER?) --- */}
         <div className="flex flex-col items-center relative z-20">
            <TreeCard user={rootUser} isRoot />
            {/* Connector to next level */}
            {(managers.length > 0 || branches?.length || myDeptEmployees.length) ? <div className="h-8 w-px bg-slate-300"></div> : null}
         </div>

         {/* --- LEVEL 2: MANAGERS (If Boss View) --- */}
         {currentUser.role === Role.BOSS && managers.length > 0 && (
            <div className="flex flex-col items-center relative">
                 <div className="flex items-start justify-center gap-8 relative px-10">
                     {managers.length > 1 && (
                        <div className="absolute top-0 left-0 right-0 h-px bg-slate-300 mx-[10%]"></div>
                     )}
                     {managers.map(mgr => (
                         <div key={mgr.id} className="flex flex-col items-center relative">
                             <div className="w-px h-8 bg-slate-300"></div>
                             <TreeCard user={mgr} />
                             {/* Connector to departments (shared) */}
                             <div className="w-px h-8 bg-slate-300"></div>
                         </div>
                     ))}
                 </div>
                 {/* Shared connector to branches */}
                 <div className="w-full h-px bg-slate-300 mb-0"></div>
            </div>
         )}
         {/* If Boss View and no managers, just connector */}
         {currentUser.role === Role.BOSS && managers.length === 0 && branches && branches.length > 0 && (
             <div className="w-px h-0 bg-slate-300"></div>
         )}


         {/* --- LEVEL 3: BRANCHES (DEPARTMENTS) - BOSS/MANAGER VIEW --- */}
         {(currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) && branches && branches.length > 0 && (
            <div className="flex items-start justify-center gap-8 relative px-10 pt-0">
                {/* Horizontal Connector Line */}
                {branches.length > 1 && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-slate-300 mx-[15%]"></div>
                )}
                
                {/* Render each Department Branch */}
                {branches.map((branch: any) => (
                    <div key={branch.dept.id} className="flex flex-col items-center relative">
                         {/* Vertical Connector from Horizontal Line */}
                         <div className="w-px h-8 bg-slate-300"></div>
                         
                         {/* Supervisor Card */}
                         {branch.supervisor ? (
                             <TreeCard user={branch.supervisor} />
                         ) : (
                             // Placeholder if no supervisor
                             <div className="w-32 md:w-48 p-2 md:p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-400">
                                 <div className="font-bold mb-1 truncate">{branch.dept.name}</div>
                                 (主管職缺)
                             </div>
                         )}

                         {/* Vertical Connector to Employees */}
                         {branch.employees.length > 0 && <div className="h-8 w-px bg-slate-300"></div>}
                         
                         {/* --- LEVEL 4: LEAVES (EMPLOYEES) --- */}
                         {branch.employees.length > 0 && (
                             <div className="flex flex-col gap-4 relative">
                                 {branch.employees.map((emp: User, idx: number) => (
                                     <div key={emp.id} className="relative flex flex-col items-center">
                                         {/* Small vertical connector between employees */}
                                         {idx > 0 && <div className="h-4 w-px bg-slate-300 absolute -top-4"></div>}
                                         <TreeCard user={emp} />
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                ))}
            </div>
         )}

         {/* --- LEVEL 2: LEAVES (EMPLOYEES) - SUPERVISOR VIEW --- */}
         {currentUser.role === Role.SUPERVISOR && myDeptEmployees.length > 0 && (
             <div className="flex flex-col items-center relative pt-0">
                  {/* Horizontal Bar for visual balance (Optional, or just stack them) */}
                  <div className="absolute top-0 left-1/2 w-8 h-px bg-slate-300 -translate-x-1/2"></div>
                  
                  <div className="flex flex-col gap-4 relative pt-0">
                       {myDeptEmployees.map((emp, idx) => (
                           <div key={emp.id} className="flex flex-col items-center relative">
                               {idx > 0 && <div className="h-4 w-px bg-slate-300 absolute -top-4"></div>}
                               <TreeCard user={emp} />
                           </div>
                       ))}
                  </div>
             </div>
         )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>👥</span> 人員帳號管理
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">
            新增、修改或刪除系統使用者帳號與部門
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200 overflow-x-auto">
                <button 
                  onClick={() => setViewMode('GRID')}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${viewMode === 'GRID' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   卡片列表
                </button>
                <button 
                  onClick={() => setViewMode('TREE')}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${viewMode === 'TREE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   組織樹狀圖
                </button>
                {currentUser.role === Role.BOSS && (
                  <button 
                    onClick={() => setViewMode('DEPT_MGMT')}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${viewMode === 'DEPT_MGMT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    部門設定
                  </button>
                )}
            </div>

            {currentUser.role === Role.BOSS && viewMode === 'GRID' && (
            <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <option value="ALL">🏢 所有部門</option>
                {departments.map(d => (
                   <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
            )}

            {viewMode !== 'DEPT_MGMT' && (
              <button 
                  onClick={onAddUser}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition"
              >
                  新增人員
              </button>
            )}
        </div>
      </div>

      {viewMode === 'DEPT_MGMT' ? (
          <DepartmentManager 
            departments={departments}
            users={users}
            onAdd={onAddDepartment}
            onUpdate={onUpdateDepartment}
            onDelete={onDeleteDepartment}
          />
      ) : viewMode === 'TREE' ? (
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
              {renderTree()}
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleUsers.map(user => (
                  <div key={user.id} className={`rounded-xl border shadow-sm p-5 flex items-start gap-4 relative group hover:shadow-md transition ${getDeptColor(user.department)}`}>
                      <div className="w-16 h-16 rounded-full bg-white flex-shrink-0 border border-slate-200 overflow-hidden">
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                              <h3 className="text-lg font-bold text-slate-800 truncate">{user.name}</h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getRoleBadgeColor(user.role)}`}>
                                  {getRoleLabel(user.role)}
                              </span>
                          </div>
                          <p className="text-xs text-slate-500 font-bold mb-1">{getDeptName(user.department)}</p>
                          
                          <div className="mt-2 bg-white/60 p-2 rounded text-xs text-slate-600 font-mono">
                              <div className="flex justify-between">
                                <span>ID:</span> <span className="font-bold text-slate-800">{user.username}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>PW:</span> <span className="font-bold text-slate-400">••••</span>
                              </div>
                          </div>
                      </div>

                      {!(currentUser.role === Role.SUPERVISOR && (user.role === Role.BOSS || user.role === Role.MANAGER)) && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                              <button onClick={() => onEditUser(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                              {currentUser.id !== user.id && (
                                  <button onClick={() => onDeleteUser(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                              )}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};
