import { DepartmentDef } from '../types';

export interface FlatDepartment extends DepartmentDef {
  level: number;
  parentName?: string;
  fullPath: string;
}

/**
 * 將階層部門結構扁平化，並生成完整路徑
 * @param depts 部門陣列
 * @param level 當前層級（從 0 開始）
 * @param parentName 父部門名稱
 * @param parentPath 父部門完整路徑
 * @returns 扁平化的部門陣列，包含層級和路徑資訊
 */
export const flattenDepartments = (
  depts: DepartmentDef[], 
  level = 0, 
  parentName?: string,
  parentPath?: string
): FlatDepartment[] => {
  const result: FlatDepartment[] = [];
  
  depts.forEach(dept => {
    const fullPath = parentPath ? `${parentPath} > ${dept.name}` : dept.name;
    
    result.push({ 
      ...dept, 
      level, 
      parentName,
      fullPath
    });
    
    if (dept.subdepartments && dept.subdepartments.length > 0) {
      result.push(...flattenDepartments(
        dept.subdepartments, 
        level + 1, 
        dept.name,
        fullPath
      ));
    }
  });
  
  return result;
};

/**
 * 格式化部門名稱顯示
 * @param dept 扁平化的部門物件
 * @param style 顯示樣式：'path' 顯示完整路徑，'indent' 顯示縮排
 * @returns 格式化後的部門名稱
 */
export const formatDepartmentName = (
  dept: FlatDepartment, 
  style: 'indent' | 'path' = 'path'
): string => {
  if (style === 'path') {
    return dept.fullPath;
  }
  
  // indent 樣式（保留以備未來使用）
  if (dept.level === 0) return dept.name;
  return '　'.repeat(dept.level) + '└─ ' + dept.name;
};

/**
 * 根據部門 ID 查找部門資訊
 * @param departments 部門陣列
 * @param id 部門 ID
 * @returns 部門物件或 undefined
 */
export const findDepartmentById = (
  departments: DepartmentDef[], 
  id: string
): DepartmentDef | undefined => {
  for (const dept of departments) {
    if (dept.id === id) return dept;
    if (dept.subdepartments && dept.subdepartments.length > 0) {
      const found = findDepartmentById(dept.subdepartments, id);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * 獲取部門的完整路徑名稱
 * @param departments 部門陣列
 * @param id 部門 ID
 * @returns 完整路徑名稱，例如：「資訊管理部 > 客服部」
 */
export const getDepartmentFullPath = (
  departments: DepartmentDef[], 
  id: string
): string => {
  const flatDepts = flattenDepartments(departments);
  const dept = flatDepts.find(d => d.id === id);
  return dept?.fullPath || id;
};
