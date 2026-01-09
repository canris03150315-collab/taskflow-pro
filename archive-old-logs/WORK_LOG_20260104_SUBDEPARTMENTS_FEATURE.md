# 子部門功能實現工作日誌

**日期**: 2026-01-04  
**版本**: v8.9.8-subdepartments-complete  
**狀態**: ✅ 已完成

---

## 需求

實現部門階層結構，允許在主部門下設置子部門。例如：
- 資訊管理部門
  - 客服部（處理客服）
  - 會計部（處理金錢）

---

## 實現方案

### 1. 資料庫遷移

**添加欄位**: `parent_department_id TEXT DEFAULT NULL`

```javascript
// add-subdepartments-column.js
ALTER TABLE departments ADD COLUMN parent_department_id TEXT DEFAULT NULL
```

**執行結果**: ✅ 成功添加欄位

---

### 2. 後端實現（Pure ASCII）

**文件**: `/app/dist/routes/departments.js`

#### 主要功能

1. **GET /api/departments** - 返回階層結構
   ```javascript
   // 建立階層結構
   const departmentMap = {};
   const rootDepartments = [];
   
   // 第一次遍歷：建立 map
   departments.forEach(dept => {
       departmentMap[dept.id] = { ...dept, subdepartments: [] };
   });
   
   // 第二次遍歷：建立階層
   departments.forEach(dept => {
       if (dept.parent_department_id && departmentMap[dept.parent_department_id]) {
           departmentMap[dept.parent_department_id].subdepartments.push(departmentMap[dept.id]);
       } else {
           rootDepartments.push(departmentMap[dept.id]);
       }
   });
   ```

2. **GET /api/departments/flat** - 返回平坦列表（相容性）

3. **GET /api/departments/:id** - 包含子部門和父部門資訊

4. **POST /api/departments** - 支援 `parent_department_id` 參數
   - 驗證父部門是否存在

5. **PUT /api/departments/:id** - 支援修改父部門
   - 防止循環引用（部門不能設定自己為父部門）
   - 檢查是否會造成循環（父部門不能是當前部門的子孫部門）

6. **DELETE /api/departments/:id** - 增強驗證
   - 檢查是否有子部門（有子部門不能刪除）
   - 檢查是否有用戶
   - 檢查是否有相關任務

---

### 3. 前端實現

**文件**: `components/DepartmentManager.tsx`

#### 類型定義更新

```typescript
export interface DepartmentDef {
  id: string;
  name: string;
  theme: 'slate' | 'blue' | 'purple' | 'rose' | 'emerald' | 'orange' | 'cyan';
  icon: string;
  parent_department_id?: string | null;  // 新增
  subdepartments?: DepartmentDef[];      // 新增
}

interface FlatDepartment extends DepartmentDef {
  level: number;
  parentName?: string;
}
```

#### 主要功能

1. **階層扁平化函數**
   ```typescript
   const flattenDepartments = (depts: DepartmentDef[], level = 0, parentName?: string): FlatDepartment[] => {
     const result: FlatDepartment[] = [];
     depts.forEach(dept => {
       result.push({ ...dept, level, parentName });
       if (dept.subdepartments && dept.subdepartments.length > 0) {
         result.push(...flattenDepartments(dept.subdepartments, level + 1, dept.name));
       }
     });
     return result;
   };
   ```

2. **階層顯示**
   - 使用 `marginLeft` 縮排顯示層級
   - 子部門前顯示 `└─` 符號
   - 顯示「隸屬於 XXX」標籤

3. **父部門選擇器**
   - 下拉選單選擇父部門
   - 編輯時排除自己（防止設定自己為父部門）
   - 排除「待分配/新人」部門
   - 使用縮排顯示階層結構

4. **刪除保護**
   - 有子部門的部門不能刪除
   - 有成員的部門不能刪除

---

## 部署流程

### 1. 創建快照（修改前）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.7-before-subdepartments"
```
- 快照: `taskflow-snapshot-v8.9.7-before-subdepartments-20260104_141522.tar.gz` (214MB)

### 2. 資料庫遷移
```powershell
Get-Content "add-subdepartments-column.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/add-subdepartments-column.js"
ssh root@165.227.147.40 "docker cp /tmp/add-subdepartments-column.js taskflow-pro:/app/add-subdepartments-column.js; docker exec -w /app taskflow-pro node add-subdepartments-column.js"
```

### 3. 部署後端
```powershell
Get-Content "departments-with-subdepartments.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/departments.js"
ssh root@165.227.147.40 "docker cp /tmp/departments.js taskflow-pro:/app/dist/routes/departments.js; docker restart taskflow-pro"
```

### 4. 部署前端
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```
- Deploy ID: `695a7744aaec2a353050c899`

### 5. 創建新映像和快照
```bash
docker commit taskflow-pro taskflow-pro:v8.9.8-subdepartments-complete
/root/create-snapshot.sh v8.9.8-subdepartments-complete
```
- 映像: `taskflow-pro:v8.9.8-subdepartments-complete`
- 快照: `taskflow-snapshot-v8.9.8-subdepartments-complete-20260104_142113.tar.gz` (214MB)

---

## 使用方式

### 創建子部門

1. 進入「部門管理」頁面
2. 填寫部門名稱（例如：客服部）
3. 在「父部門」下拉選單選擇上層部門（例如：資訊管理部門）
4. 選擇圖示和顏色主題
5. 點擊「新增部門」

### 修改部門階層

1. 點擊部門卡片的「編輯」按鈕
2. 在「父部門」下拉選單中選擇新的父部門
3. 或選擇「無（頂層部門）」將其設為頂層部門
4. 點擊「儲存變更」

### 刪除部門

- 只能刪除**沒有子部門**且**沒有成員**的部門
- 系統會自動檢查並阻止不當刪除

---

## 技術特點

### 1. 循環引用防護
- 部門不能設定自己為父部門
- 父部門不能是當前部門的子孫部門
- 後端在 PUT 路由中實現完整檢查

### 2. 階層顯示
- 前端自動計算層級深度
- 使用視覺縮排和符號標示
- 顯示父部門名稱

### 3. Pure ASCII
- 所有後端路由使用 Unicode Escape
- 避免中文字符導致容器崩潰

### 4. 相容性
- 提供 `/api/departments/flat` 端點返回平坦列表
- 保持向後相容

---

## 測試建議

1. **創建階層結構**
   - 創建頂層部門「資訊管理部」
   - 在其下創建子部門「客服部」
   - 在其下創建子部門「會計部」

2. **測試編輯**
   - 修改子部門的父部門
   - 嘗試將部門設為自己的父部門（應被阻止）

3. **測試刪除**
   - 嘗試刪除有子部門的部門（應被阻止）
   - 刪除空的子部門（應成功）

4. **測試顯示**
   - 確認階層縮排正確
   - 確認父部門名稱顯示正確

---

## 最終版本

- **後端**: `taskflow-pro:v8.9.8-subdepartments-complete`
- **前端**: Deploy ID `695a7744aaec2a353050c899`
- **快照**: `taskflow-snapshot-v8.9.8-subdepartments-complete-20260104_142113.tar.gz`
- **狀態**: ✅ 功能完整實現

---

## 關鍵教訓

1. ✅ **遵循全域規則** - 修改前創建快照
2. ✅ **Pure ASCII 規則** - 後端路由使用 Unicode Escape
3. ✅ **循環引用防護** - 實現完整的父子關係驗證
4. ✅ **使用 Get-Content | ssh** - 上傳文件的可靠方法
5. ✅ **創建新 Docker 映像** - 修改後必須 commit

---

**最後更新**: 2026-01-04  
**作者**: Cascade AI
