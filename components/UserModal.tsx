import React, { useState, useRef, useEffect } from 'react';
import { User, Role, Permission, DepartmentDef, hasPermission } from '../types';
import { api } from '../services/api';
import { compressAvatar, isImageFile } from '../utils/imageUtils';
import { useToast } from './Toast';
import { flattenDepartments } from '../utils/departmentUtils';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => void;
  currentUser: User;
  editingUser?: User | null;
  departments: DepartmentDef[]; // New prop
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  editingUser,
  departments,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.EMPLOYEE);
  const [department, setDepartment] = useState<string>('');
  const [avatar, setAvatar] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [excludeFromAttendance, setExcludeFromAttendance] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setName(editingUser.name);
        setUsername(editingUser.username);
        setPassword(editingUser.password);
        setRole(editingUser.role);
        setDepartment(editingUser.department);
        setAvatar(
          editingUser.avatar ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(editingUser.name || 'default')}&backgroundColor=b6e3f4`
        );
        setPermissions(editingUser.permissions || []);
        setExcludeFromAttendance(!!editingUser.exclude_from_attendance);
      } else {
        // Default values for new user
        setName('');
        setUsername('');
        setPassword('1234');
        setRole(Role.EMPLOYEE);
        // Supervisors default to their own department, else first available
        setDepartment(
          currentUser.role === Role.SUPERVISOR ? currentUser.department : departments[0]?.id || ''
        );
        setAvatar(
          `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.random()}&backgroundColor=b6e3f4`
        );
        setPermissions([]);
        setExcludeFromAttendance(false);
      }
    }
  }, [isOpen, editingUser, currentUser, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 編輯自己時只傳送允許修改的欄位 (name, avatar)
      const isSelfEdit = editingUser?.id === currentUser.id;
      if (isSelfEdit) {
        await onSubmit({
          name,
          avatar,
        });
      } else {
        // 編輯他人時，只在密碼不為空時才傳送
        const userData: any = {
          name,
          username,
          role,
          department,
          avatar,
          permissions,
          exclude_from_attendance: excludeFromAttendance,
        };

        // 只有在密碼不為空時才添加密碼欄位
        if (password && password.trim() !== '') {
          userData.password = password;
        }

        await onSubmit(userData);
      }
      onClose();
    } catch (error) {
      // 錯誤已在 onSubmit 中處理，保持模態框打開
      console.error('創建用戶失敗:', error);
    }
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查是否為圖片
    if (!isImageFile(file)) {
      toast.warning('請選擇圖片檔案（JPG、PNG、GIF 等）');
      return;
    }

    try {
      // 壓縮圖片（頭像使用 200x200，約 70% 品質）— compressAvatar 內部會自己讀檔
      const compressedBase64 = await compressAvatar(file);

      // 如果是編輯模式，直接上傳頭像
      if (editingUser) {
        await api.users.updateAvatar(editingUser.id, compressedBase64);
        toast.success('頭像已更新');
      }
      setAvatar(compressedBase64);
    } catch (error) {
      console.error('頭像處理失敗:', error);
      toast.error('頭像處理失敗，請重試');
    }

    // 清除 input 以允許重複選擇同一檔案
    e.target.value = '';
  };

  const togglePermission = (perm: Permission) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const permissionOptions: { value: Permission; label: string; isDangerous?: boolean }[] = [
    { value: 'CREATE_TASK', label: '建立任務' },
    { value: 'MANAGE_FINANCE', label: '管理公費/收支' },
    { value: 'POST_ANNOUNCEMENT', label: '發布公告' },
    { value: 'MANAGE_FORUM', label: '管理論壇提案' },
    { value: 'MANAGE_USERS', label: '管理使用者帳號' },
    { value: 'MANAGE_DEPARTMENTS', label: '管理部門' },
    { value: 'APPROVE_LEAVES', label: '審核假期' },
    { value: 'MANAGE_LEAVE_RULES', label: '設定排假規則' },
    { value: 'SYSTEM_RESET', label: '系統重置 (危險功能)', isDangerous: true },
  ];

  // Logic for editing permissions
  const isSelf = editingUser?.id === currentUser.id;
  const isBossOrManager = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;
  const hasAdminRights = isBossOrManager || hasPermission(currentUser, 'MANAGE_USERS');

  // Can modify sensitive fields (Role, Dept, Permissions)?
  const canEditSensitive = hasAdminRights && !isSelf;

  // Can view password field?
  // - Creating new user: always show (editingUser is null)
  // - BOSS/MANAGER: can see all users' passwords
  // - SUPERVISOR: can see passwords of users in their department
  // - Self: cannot see password field when editing self
  const canViewPassword =
    !editingUser ||
    (!isSelf &&
      (isBossOrManager ||
        (currentUser.role === Role.SUPERVISOR &&
          editingUser?.department === currentUser.department)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 tracking-wide">
            {editingUser ? (isSelf ? '編輯個人檔案' : '編輯人員資料') : '新增人員帳號'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden shadow-sm relative group">
              <img
                src={
                  avatar ||
                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name || 'default')}&backgroundColor=b6e3f4`
                }
                alt="Avatar"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                onClick={handleUploadClick}
              >
                更換
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRandomAvatar}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
              >
                🎲 隨機生成
              </button>
              <button
                type="button"
                onClick={handleUploadClick}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
              >
                📂 上傳照片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">真實姓名</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                placeholder="例如：王小明"
              />
            </div>

            {/* Account Info - Show based on permissions */}
            {canViewPassword && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">登入帳號</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    placeholder="user01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">
                    登入密碼{' '}
                    {editingUser && <span className="text-gray-400 text-xs">(留空則不修改)</span>}
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    placeholder={editingUser ? '留空則不修改' : '1234'}
                  />
                </div>
              </div>
            )}

            {/* Role */}
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">
                職務角色 {isSelf && <span className="text-orange-400 text-xs">(無法變更自己)</span>}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={!canEditSensitive}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value={Role.EMPLOYEE}>一般員工</option>
                {/* Only Show higher roles options if the current user is Boss/Manager */}
                {(currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) && (
                  <>
                    <option value={Role.SUPERVISOR}>部門主管</option>
                    <option value={Role.MANAGER}>總經理 (管理職)</option>
                    <option value={Role.BOSS}>董事長 (最高權限)</option>
                  </>
                )}
                {/* Ensure the current role is visible even if user can't select it */}
                {!isBossOrManager && role !== Role.EMPLOYEE && <option value={role}>{role}</option>}
              </select>
            </div>

            {/* Department (Dynamic) */}
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">
                所屬部門 {isSelf && <span className="text-orange-400 text-xs">(無法變更自己)</span>}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={!canEditSensitive}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {flattenDepartments(departments).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 免打卡標記（僅管理員可改別人；自己編輯自己也可改）*/}
            {(canEditSensitive || editingUser?.id === currentUser.id) && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeFromAttendance}
                    onChange={(e) => setExcludeFromAttendance(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-800">
                      🏖️ 免打卡（不列入出勤統計）
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      勾選後，此使用者不會出現在「出勤異常提醒」、「未交工作日誌提醒」、
                      與部門出勤統計中。適合管理層、顧問、外包人員。
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Custom Permissions (Only visible if can edit sensitive) */}
            {canEditSensitive && role !== Role.BOSS && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  特權設定 (進階授權)
                </label>
                <div className="space-y-2">
                  {permissionOptions.map((option) => {
                    // Hide SYSTEM_RESET if current user isn't Boss
                    if (option.value === 'SYSTEM_RESET' && currentUser.role !== Role.BOSS)
                      return null;

                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition ${option.isDangerous ? 'text-red-600' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={permissions.includes(option.value)}
                          onChange={() => togglePermission(option.value)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span
                          className={`text-sm ${option.isDangerous ? 'font-bold' : 'text-slate-600'}`}
                        >
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  💡 勾選項目將允許該人員執行特定管理操作。
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg transition font-bold"
          >
            取消
          </button>
          <button
            type="submit"
            form="user-form"
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition"
          >
            {editingUser ? '儲存變更' : '新增人員'}
          </button>
        </div>
      </div>
    </div>
  );
};
