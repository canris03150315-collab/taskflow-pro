# Production Polish 5-8 Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

Four UI polish items to bring TaskFlow Pro to production-grade visual quality:
1. Loading skeleton shimmer animation
2. System settings version display
3. Unified empty state component
4. Brand footer bar

---

## 1. Loading Skeleton Shimmer

### Current State
- `App.tsx:46-56` has a generic `PageSkeleton` using Tailwind's `animate-pulse` (opacity fade)
- Used as `<Suspense fallback={<PageSkeleton />}>` for all lazy-loaded pages

### Design
Replace `animate-pulse` with a shimmer (left-to-right light sweep) effect.

**CSS addition** (`index.css`):
```css
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

**Component change** (`App.tsx` PageSkeleton):
- Replace `bg-slate-200 animate-pulse` classes with `animate-shimmer`
- Keep the same layout structure (title bar + 3-col grid + content block)

### Files Changed
- `index.css` — add shimmer keyframes + class
- `App.tsx` — update PageSkeleton classes (~5 lines)

---

## 2. System Settings Version Display

### Current State
- `package.json` version is `0.0.0`
- Backend version fetched from `/api/version` and shown in bottom-right corner (`App.tsx:1579-1581`)
- `SystemSettingsView.tsx` has `about` tab but no version info

### Design

**Version number:** Set `package.json` to `1.0.0`.

**Build-time injection:** Use Vite's `define` to inject the frontend version at build time:
```ts
// vite.config.ts
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  // ...existing config
});
```
Note: project uses ESM (`"type": "module"`), so use `readFileSync` instead of `require`.

**About tab content:** Add a version info card in `SystemSettingsView.tsx` about tab:
- Frontend version: read from `__APP_VERSION__`
- Backend version: passed as prop from App.tsx (already fetched)
- Display as a clean card with two rows

**Props change:** `SystemSettingsView` needs a new prop `backendVersion: string`.

### Files Changed
- `package.json` — version `0.0.0` → `1.0.0`
- `vite.config.ts` — add `define` for `__APP_VERSION__`
- `SystemSettingsView.tsx` — add version card in about tab, accept `backendVersion` prop
- `App.tsx` — pass `backendVersion` prop to SystemSettingsView

---

## 3. Unified Empty State Component

### Current State
Various pages show empty state differently:
- Dashboard: emoji + bold text + description + action button (best)
- Most others: plain gray italic text like `目前沒有相關紀錄`
- No consistent pattern

### Design

**New component:** `components/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon: string;        // emoji
  title: string;       // bold heading
  description?: string; // lighter subtitle
  actionLabel?: string; // button text
  onAction?: () => void; // button click handler
}
```

**Visual style** (matching Dashboard's existing pattern):
- Centered layout
- Large emoji (text-5xl, 50% opacity)
- Bold title (text-slate-400)
- Lighter description (text-slate-300, text-xs)
- Optional blue action button
- `animate-fade-in` entrance

**Pages to update** (replace existing plain-text empty states):

| Page | Icon | Title | Action |
|------|------|-------|--------|
| BulletinView | 📢 | 目前沒有任何公告 | 發布第一則公告 (if BOSS/MANAGER) |
| ForumView | 💡 | 目前沒有提案 | 提出第一個提案 |
| MemoView | 📝 | 目前沒有備忘錄 | 新增一張吧 |
| FinanceView (table) | 💰 | 目前沒有相關紀錄 | — |
| FinanceView (cards) | 💰 | 目前沒有相關紀錄 | — |
| ReportView | 📊 | 沒有符合條件的報表 | — |
| WorkLogTab | 📓 | 今天還沒有工作日誌 | — |
| LeaveManagementView | 📭 | 目前沒有假期記錄 | — |
| SOPManagement | 📁 | 目前沒有文件 | 建立第一份文件 |
| DocumentLibraryView | 📁 | 目前沒有文件 | — |
| SubordinateView | 👥 | 該部門目前沒有一般員工資料 | — |
| AuditLogView | 🔍 | 沒有找到審核記錄 | — |

**Note:** Dashboard already has good empty states — leave as-is, no change needed.

### Files Changed
- `components/EmptyState.tsx` — new file
- 12 existing component files — replace plain-text empty states with `<EmptyState />`

---

## 4. Brand Footer Bar

### Current State
- `App.tsx:1579-1581`: floating bottom-right version text (`後端版本: x.x.x`)
- No brand footer anywhere

### Design

**Remove** the floating bottom-right version div (version info now lives in System Settings about tab).

**Add** a footer bar at the bottom of the main content area (inside the scrollable region, not fixed):
```html
<div class="text-center text-xs text-slate-400 py-4 border-t border-slate-100 mt-8">
  © 2026 TaskFlow Pro
</div>
```

Placement: after the `</Suspense>` / task board section, still inside the scrollable `overflow-y-auto` div. This means:
- It scrolls with content (not permanently visible)
- Only shows when user scrolls to bottom
- Doesn't eat up screen real estate

### Files Changed
- `App.tsx` — remove floating version div, add footer inside content area

---

## Out of Scope
- Per-page custom skeleton screens (decided against — maintenance cost too high)
- System health monitoring in about page (decided against — keep it simple)
- Fixed/sticky footer (decided against — bottom bar that scrolls with content)

## Dependencies
- No backend changes required
- No new npm packages
- No database changes
