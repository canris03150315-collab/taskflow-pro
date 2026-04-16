import { DepartmentDef } from '../types';

// Extended type for flattened departments that includes hierarchical display info
type DepartmentDefWithPath = DepartmentDef & {
  fullPath: string;
  depth: number;
  subdepartments?: DepartmentDefWithPath[];
};

export const getDepartmentName = (departmentId: string, departments: DepartmentDef[]): string => {
  const flat = flattenDepartments(departments);
  const dept = flat.find(d => d.id === departmentId);
  return dept ? dept.name : departmentId;
};

export const getDepartmentById = (departmentId: string, departments: DepartmentDef[]): DepartmentDef | undefined => {
  const flat = flattenDepartments(departments);
  return flat.find(d => d.id === departmentId);
};

/**
 * Recursively flatten a tree of departments into a flat array.
 * Supports both tree-structure input (with `subdepartments`) and flat-list input.
 * Adds `fullPath` (e.g. "營運管理部 / 行銷組") and `depth` to each entry.
 */
export const flattenDepartments = (departments: DepartmentDef[]): DepartmentDefWithPath[] => {
  const result: DepartmentDefWithPath[] = [];
  const visit = (dept: any, parentPath: string, depth: number) => {
    if (!dept || !dept.id) return;
    const fullPath = parentPath ? `${parentPath} / ${dept.name}` : dept.name;
    result.push({ ...dept, fullPath, depth });
    if (Array.isArray(dept.subdepartments)) {
      for (const child of dept.subdepartments) {
        visit(child, fullPath, depth + 1);
      }
    }
  };
  for (const root of departments || []) {
    visit(root, '', 0);
  }
  return result;
};

export const getDepartmentFullPath = (departmentId: string, departments: DepartmentDef[]): string => {
  const flat = flattenDepartments(departments);
  const dept = flat.find(d => d.id === departmentId);
  return dept ? dept.fullPath : departmentId;
};
