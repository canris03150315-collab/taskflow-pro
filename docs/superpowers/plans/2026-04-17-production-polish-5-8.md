# Production Polish 5-8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shimmer loading skeleton, version display in settings, unified empty states across all pages, and a brand footer bar.

**Architecture:** Four independent UI-only changes. No backend changes. A new reusable `EmptyState` component replaces scattered plain-text empty states. Version is injected at build time via Vite `define`. Shimmer is pure CSS.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `index.css` | Add shimmer keyframes |
| Modify | `App.tsx` | Update PageSkeleton, add footer, pass backendVersion prop, remove floating version |
| Modify | `package.json` | Version 0.0.0 → 1.0.0 |
| Modify | `vite.config.ts` | Inject `__APP_VERSION__` at build time |
| Modify | `components/SystemSettingsView.tsx` | Add version card in about tab |
| Create | `components/EmptyState.tsx` | Reusable empty state component |
| Modify | `components/BulletinView.tsx` | Use EmptyState |
| Modify | `components/ForumView.tsx` | Use EmptyState |
| Modify | `components/MemoView.tsx` | Use EmptyState |
| Modify | `components/FinanceView.tsx` | Use EmptyState (2 places) |
| Modify | `components/ReportView.tsx` | Use EmptyState |
| Modify | `components/WorkLogTab.tsx` | Use EmptyState |
| Modify | `components/LeaveManagementView.tsx` | Use EmptyState |
| Modify | `components/SOPManagement.tsx` | Use EmptyState |
| Modify | `components/DocumentLibraryView.tsx` | Use EmptyState |
| Modify | `components/SubordinateView.tsx` | Use EmptyState (2 places) |
| Modify | `components/SubordinateRoutineView.tsx` | Use EmptyState |
| Modify | `components/AuditLogView.tsx` | Use EmptyState |

---

### Task 1: Shimmer Loading Animation

**Files:**
- Modify: `index.css`
- Modify: `App.tsx:46-56`

- [ ] **Step 1: Add shimmer CSS keyframes to index.css**

Open `index.css` and add at the end:

```css
/* Shimmer loading animation */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

- [ ] **Step 2: Update PageSkeleton in App.tsx**

In `App.tsx`, replace the existing `PageSkeleton` component (lines 46-56):

```tsx
// 載入中骨架屏組件
const PageSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 animate-shimmer rounded-lg w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-32 animate-shimmer rounded-xl"></div>
      <div className="h-32 animate-shimmer rounded-xl"></div>
      <div className="h-32 animate-shimmer rounded-xl"></div>
    </div>
    <div className="h-64 animate-shimmer rounded-xl"></div>
  </div>
);
```

- [ ] **Step 3: Verify locally**

Start the dev server and navigate between pages. The skeleton should show a smooth left-to-right light sweep instead of a pulsing opacity flash.

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部" && npx vite --port 3000
```

- [ ] **Step 4: Commit**

```bash
git add index.css App.tsx
git commit -m "feat: replace pulse with shimmer animation for loading skeleton"
```

---

### Task 2: Version Display in System Settings

**Files:**
- Modify: `package.json:4`
- Modify: `vite.config.ts`
- Modify: `components/SystemSettingsView.tsx:8-13` (props), `390-401` (about tab)
- Modify: `App.tsx:1432` (pass prop)

- [ ] **Step 1: Update package.json version**

In `package.json`, change line 4:

Old: `"version": "0.0.0",`
New: `"version": "1.0.0",`

- [ ] **Step 2: Add build-time version injection in vite.config.ts**

In `vite.config.ts`, add `readFileSync` import and `define` config:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // ...existing build config unchanged
```

- [ ] **Step 3: Add TypeScript declaration for __APP_VERSION__**

In `types.ts`, add at the very end of the file:

```ts
// Build-time injected version
declare const __APP_VERSION__: string;
```

- [ ] **Step 4: Update SystemSettingsView props and about tab**

In `components/SystemSettingsView.tsx`:

Add `backendVersion` to the props interface (around line 9):

Old:
```tsx
interface SystemSettingsViewProps {
  currentUser: User;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
}
```

New:
```tsx
interface SystemSettingsViewProps {
  currentUser: User;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
  backendVersion?: string;
}
```

Update the destructuring (around line 15):

Old:
```tsx
export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ currentUser, onLogout, onUserUpdate }) => {
```

New:
```tsx
export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ currentUser, onLogout, onUserUpdate, backendVersion }) => {
```

Replace the about tab content (lines 390-401):

Old:
```tsx
{activeTab === 'about' && (
    <div className="text-center py-10">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-4 transform rotate-3">
            T
        </div>
        <h3 className="text-xl font-black text-slate-800">TaskFlow Pro</h3>
        <p className="text-slate-500 mb-6">企業級協作管理系統</p>
        <div className="text-xs text-slate-400 space-y-1">
            <p>Version 2.5.0 (Build 20240101)</p>
            <p>© 2024 TaskFlow Inc. All rights reserved.</p>
        </div>
    </div>
)}
```

New:
```tsx
{activeTab === 'about' && (
    <div className="text-center py-10">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-4 transform rotate-3">
            T
        </div>
        <h3 className="text-xl font-black text-slate-800">TaskFlow Pro</h3>
        <p className="text-slate-500 mb-6">企業級協作管理系統</p>

        <div className="max-w-xs mx-auto bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
                <span className="text-slate-500">前端版本</span>
                <span className="font-bold text-slate-700">v{__APP_VERSION__}</span>
            </div>
            <div className="border-t border-slate-200"></div>
            <div className="flex justify-between">
                <span className="text-slate-500">後端版本</span>
                <span className="font-bold text-slate-700">v{backendVersion || '未知'}</span>
            </div>
        </div>

        <div className="text-xs text-slate-400 mt-6">
            <p>&copy; 2026 TaskFlow Pro. All rights reserved.</p>
        </div>
    </div>
)}
```

- [ ] **Step 5: Pass backendVersion prop in App.tsx**

In `App.tsx`, find line 1432:

Old:
```tsx
{currentPage === 'settings' && <SystemSettingsView currentUser={currentUser} onLogout={handleLogout} />}
```

New:
```tsx
{currentPage === 'settings' && <SystemSettingsView currentUser={currentUser} onLogout={handleLogout} backendVersion={backendVersion} />}
```

- [ ] **Step 6: Verify locally**

Navigate to System Settings → About tab. Confirm:
- Frontend version shows `v1.0.0`
- Backend version shows the value from `/api/version`
- Copyright says 2026

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.ts types.ts components/SystemSettingsView.tsx App.tsx
git commit -m "feat: add version display in system settings about tab"
```

---

### Task 3: Create EmptyState Component

**Files:**
- Create: `components/EmptyState.tsx`

- [ ] **Step 1: Create the EmptyState component**

Create `components/EmptyState.tsx`:

```tsx
import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed animate-fade-in">
      <div className="text-5xl mb-4 grayscale opacity-50">{icon}</div>
      <p className="text-slate-400 font-bold text-base">{title}</p>
      {description && (
        <p className="text-slate-300 text-sm mt-2">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-lg transition transform hover:scale-105 active:scale-95 min-h-[44px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/EmptyState.tsx
git commit -m "feat: create reusable EmptyState component"
```

---

### Task 4: Replace Empty States — BulletinView, ForumView, MemoView

**Files:**
- Modify: `components/BulletinView.tsx:79-84`
- Modify: `components/ForumView.tsx:153-158`
- Modify: `components/MemoView.tsx:363-367`

- [ ] **Step 1: Update BulletinView**

Add import at the top of `components/BulletinView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 79-84:

Old:
```tsx
{sortedAnnouncements.length === 0 && (
    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-400">
       <div className="text-4xl mb-2 grayscale">📭</div>
       <p>目前沒有任何公告</p>
    </div>
)}
```

New:
```tsx
{sortedAnnouncements.length === 0 && (
    <EmptyState icon="📢" title="目前沒有任何公告" description="公告將會顯示在這裡" />
)}
```

- [ ] **Step 2: Update ForumView**

Add import at the top of `components/ForumView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 153-158:

Old:
```tsx
{displayedSuggestions.length === 0 && (
   <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
      <div className="text-4xl mb-4 grayscale opacity-50">🗣️</div>
      <h3 className="text-xl font-bold text-slate-700">目前沒有提案</h3>
      <p className="text-slate-400 mt-2">成為第一個發聲的人吧！</p>
   </div>
)}
```

New:
```tsx
{displayedSuggestions.length === 0 && (
    <EmptyState icon="💡" title="目前沒有提案" description="成為第一個發聲的人吧！" />
)}
```

- [ ] **Step 3: Update MemoView**

Add import at the top of `components/MemoView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 363-367:

Old:
```tsx
<div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
    <div className="text-4xl mb-4 grayscale opacity-50">✨</div>
    <p className="text-slate-400 font-bold">目前沒有備忘錄，新增一張吧！</p>
</div>
```

New:
```tsx
<EmptyState icon="📝" title="目前沒有備忘錄" description="新增一張吧！" />
```

- [ ] **Step 4: Commit**

```bash
git add components/BulletinView.tsx components/ForumView.tsx components/MemoView.tsx
git commit -m "feat: apply EmptyState to BulletinView, ForumView, MemoView"
```

---

### Task 5: Replace Empty States — FinanceView, ReportView, WorkLogTab

**Files:**
- Modify: `components/FinanceView.tsx:455-458, 525-526`
- Modify: `components/ReportView.tsx:528-532`
- Modify: `components/WorkLogTab.tsx:207-212`

- [ ] **Step 1: Update FinanceView (desktop table)**

Add import at the top of `components/FinanceView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 455-458 (inside `<tbody>`):

Old:
```tsx
{displayedRecords.length === 0 ? (
    <tr>
        <td colSpan={6} className="p-8 text-center text-slate-400 italic">目前沒有相關紀錄</td>
    </tr>
) : (
```

New:
```tsx
{displayedRecords.length === 0 ? (
    <tr>
        <td colSpan={6} className="p-0">
            <EmptyState icon="💰" title="目前沒有相關紀錄" />
        </td>
    </tr>
) : (
```

- [ ] **Step 2: Update FinanceView (mobile cards)**

Replace line 525-526:

Old:
```tsx
{displayedRecords.length === 0 ? (
    <div className="p-8 text-center text-slate-400 italic">目前沒有相關紀錄</div>
) : (
```

New:
```tsx
{displayedRecords.length === 0 ? (
    <EmptyState icon="💰" title="目前沒有相關紀錄" />
) : (
```

- [ ] **Step 3: Update ReportView**

Add import at the top of `components/ReportView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 528-532:

Old:
```tsx
<div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
    {filterDepartment !== 'all' || filterEmployee !== 'all' || filterStartDate || filterEndDate 
        ? '沒有符合篩選條件的報表' 
        : '尚無報表紀錄'}
</div>
```

New:
```tsx
<EmptyState 
    icon="📊" 
    title={filterDepartment !== 'all' || filterEmployee !== 'all' || filterStartDate || filterEndDate 
        ? '沒有符合篩選條件的報表' 
        : '尚無報表紀錄'} 
/>
```

- [ ] **Step 4: Update WorkLogTab**

Add import at the top of `components/WorkLogTab.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 207-212:

Old:
```tsx
) : !logs || logs.length === 0 ? (
    <div className="text-center py-8 text-gray-500">
      {selectedDate === new Date().toISOString().split('T')[0] 
        ? '今天還沒有工作日誌' 
        : '這天沒有工作日誌'}
    </div>
) : (
```

New:
```tsx
) : !logs || logs.length === 0 ? (
    <EmptyState 
        icon="📓" 
        title={selectedDate === new Date().toISOString().split('T')[0] 
            ? '今天還沒有工作日誌' 
            : '這天沒有工作日誌'} 
    />
) : (
```

- [ ] **Step 5: Commit**

```bash
git add components/FinanceView.tsx components/ReportView.tsx components/WorkLogTab.tsx
git commit -m "feat: apply EmptyState to FinanceView, ReportView, WorkLogTab"
```

---

### Task 6: Replace Empty States — LeaveManagement, SOP, DocumentLibrary

**Files:**
- Modify: `components/LeaveManagementView.tsx:1210-1214`
- Modify: `components/SOPManagement.tsx:380-384`
- Modify: `components/DocumentLibraryView.tsx:212-216`

- [ ] **Step 1: Update LeaveManagementView**

Add import at the top of `components/LeaveManagementView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 1210-1214:

Old:
```tsx
{filteredLeaves.length === 0 ? (
    <div className="text-center py-12 text-slate-500">
        <p className="text-lg">📭 目前沒有假期記錄</p>
        <p className="text-sm mt-2">點擊「申請假期」開始使用</p>
    </div>
) : (
```

New:
```tsx
{filteredLeaves.length === 0 ? (
    <EmptyState icon="📭" title="目前沒有假期記錄" description="點擊「申請假期」開始使用" />
) : (
```

- [ ] **Step 2: Update SOPManagement**

Add import at the top of `components/SOPManagement.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 380-384:

Old:
```tsx
{visibleTemplates.length === 0 ? (
    <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <div className="text-4xl mb-2 grayscale opacity-30">📂</div>
        <p>{searchTerm ? '找不到符合的文件' : '目前沒有文件，請點擊上方按鈕建立。'}</p>
    </div>
) : (
```

New:
```tsx
{visibleTemplates.length === 0 ? (
    <EmptyState 
        icon="📁" 
        title={searchTerm ? '找不到符合的文件' : '目前沒有文件'} 
        description={searchTerm ? undefined : '請點擊上方按鈕建立'}
    />
) : (
```

- [ ] **Step 3: Update DocumentLibraryView**

Add import at the top of `components/DocumentLibraryView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 212-216:

Old:
```tsx
{filteredDocuments.length === 0 ? (
    <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <div className="text-4xl mb-2 grayscale opacity-30">📂</div>
        <p>{searchTerm ? '找不到符合的文件' : '目前沒有文件'}</p>
    </div>
) : (
```

New:
```tsx
{filteredDocuments.length === 0 ? (
    <EmptyState 
        icon="📂" 
        title={searchTerm ? '找不到符合的文件' : '目前沒有文件'} 
    />
) : (
```

- [ ] **Step 4: Commit**

```bash
git add components/LeaveManagementView.tsx components/SOPManagement.tsx components/DocumentLibraryView.tsx
git commit -m "feat: apply EmptyState to LeaveManagement, SOP, DocumentLibrary"
```

---

### Task 7: Replace Empty States — SubordinateView, SubordinateRoutineView, AuditLogView

**Files:**
- Modify: `components/SubordinateView.tsx:455, 482-484`
- Modify: `components/SubordinateRoutineView.tsx:370-372`
- Modify: `components/AuditLogView.tsx:184-187`

- [ ] **Step 1: Update SubordinateView**

Add import at the top of `components/SubordinateView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

**Skip** line 455 (inline "no tasks" inside employee card) — too small a context for EmptyState.

Replace lines 481-484 (the "no employees" message):

Old:
```tsx
{subordinates.length === 0 && (
   <div className="col-span-full py-10 text-center text-slate-400">
      該部門目前沒有一般員工資料
   </div>
)}
```

New:
```tsx
{subordinates.length === 0 && (
    <div className="col-span-full">
        <EmptyState icon="👥" title="該部門目前沒有一般員工資料" />
    </div>
)}
```

- [ ] **Step 2: Update SubordinateRoutineView**

Add import at the top of `components/SubordinateRoutineView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 369-373:

Old:
```tsx
{subordinates.length === 0 && (
    <div className="col-span-full py-10 text-center text-slate-400">
        該部門目前沒有下屬資料
    </div>
)}
```

New:
```tsx
{subordinates.length === 0 && (
    <div className="col-span-full">
        <EmptyState icon="👥" title="該部門目前沒有下屬資料" />
    </div>
)}
```

- [ ] **Step 3: Update AuditLogView**

Add import at the top of `components/AuditLogView.tsx`:
```tsx
import { EmptyState } from './EmptyState';
```

Replace lines 185-187:

Old:
```tsx
) : logs.length === 0 ? (
    <div className="p-8 text-center text-gray-500">
        沒有找到審核記錄
    </div>
) : (
```

New:
```tsx
) : logs.length === 0 ? (
    <EmptyState icon="🔍" title="沒有找到審核記錄" />
) : (
```

- [ ] **Step 4: Commit**

```bash
git add components/SubordinateView.tsx components/SubordinateRoutineView.tsx components/AuditLogView.tsx
git commit -m "feat: apply EmptyState to SubordinateView, RoutineView, AuditLog"
```

---

### Task 8: Brand Footer Bar

**Files:**
- Modify: `App.tsx:1434, 1578-1581`

- [ ] **Step 1: Remove floating version display**

In `App.tsx`, delete lines 1578-1581:

```tsx
{/* 版本號顯示 */}
<div className="hidden md:block fixed bottom-2 right-2 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded shadow-sm">
    後端版本: {backendVersion}
</div>
```

- [ ] **Step 2: Add brand footer after content area**

In `App.tsx`, after line 1434 (`</ErrorBoundary>`), and before the tasks board section (line 1436), insert:

```tsx
{/* Brand Footer */}
<div className="text-center text-xs text-slate-400 py-4 border-t border-slate-100 mt-8">
    &copy; 2026 TaskFlow Pro
</div>
```

**Important:** This goes inside the scrollable `overflow-y-auto` div, after `</ErrorBoundary>` but we need it to show on ALL pages including the tasks page. So place it right before the closing of the scrollable div.

Actually, looking at the structure more carefully: the tasks page (line 1436+) is rendered OUTSIDE the `<Suspense>` block but still inside the same scrollable div. So the footer should go after ALL page content, just before the scrollable div closes.

Find the closing `</div>` of the scrollable content area. The footer should be the last element inside `<div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-8 pb-20 md:pb-8">`.

- [ ] **Step 3: Verify locally**

Check:
- Floating version number in bottom-right is gone
- Scrolling to bottom of any page shows "© 2026 TaskFlow Pro"
- Footer doesn't eat screen space (only visible when scrolled to bottom)

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: add brand footer bar, remove floating version display"
```

---

### Task 9: Final Verification & Push

- [ ] **Step 1: Run lint**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部" && npm run lint
```

Fix any lint errors if they appear.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Verify the build succeeds. This also confirms the `__APP_VERSION__` injection works at build time.

- [ ] **Step 3: Visual verification checklist**

Start dev server and manually check:

| Check | Page |
|-------|------|
| Shimmer animation on page transitions | Any lazy page |
| Version card in about tab | Settings → About |
| EmptyState in bulletin | Bulletin (if no announcements) |
| EmptyState in forum | Forum (if no proposals) |
| EmptyState in memo | Memo (if empty) |
| EmptyState in finance | Finance (if no records) |
| EmptyState in reports | Reports (if no reports) |
| EmptyState in work log | Work Log (if no logs) |
| EmptyState in leave | Leave (if no records) |
| EmptyState in SOP | SOP (if no documents) |
| EmptyState in audit log | Audit Log (if no logs) |
| Footer visible at bottom | Any page, scroll down |
| No floating version in bottom-right | Any page |

- [ ] **Step 4: Push to GitHub**

```bash
git push origin master
```
