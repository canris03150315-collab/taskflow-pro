
import React from 'react';
import { Urgency, TaskStatus, DepartmentDef, Role } from '../types';

interface BadgeProps {
  type: 'urgency' | 'status' | 'department';
  value: string;
  departments?: DepartmentDef[]; // New prop for dynamic lookup
}

export const Badge: React.FC<BadgeProps> = ({ type, value, departments }) => {
  let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
  let label = value;
  let icon = '';

  if (type === 'urgency') {
    switch (value) {
      case Urgency.LOW: 
        colorClass = 'bg-slate-100 text-slate-600 border-slate-200'; 
        label = '低優先級'; 
        break;
      case Urgency.MEDIUM: 
        colorClass = 'bg-blue-50 text-blue-700 border-blue-200'; 
        label = '中優先級'; 
        break;
      case Urgency.HIGH: 
        colorClass = 'bg-orange-50 text-orange-700 border-orange-200'; 
        label = '高優先級'; 
        break;
      case Urgency.URGENT: 
        colorClass = 'bg-red-50 text-red-700 border-red-200 shadow-[0_0_8px_rgba(239,68,68,0.2)]'; 
        label = '最高緊急'; 
        icon = '🔥 ';
        break;
    }
  } else if (type === 'status') {
    switch (value) {
      case TaskStatus.OPEN: 
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; 
        label = '待分派';
        break;
      case TaskStatus.ASSIGNED: 
        colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200'; 
        label = '已指派';
        break;
      case TaskStatus.IN_PROGRESS: 
        colorClass = 'bg-blue-50 text-blue-600 border-blue-200'; 
        label = '進行中';
        break;
      case TaskStatus.COMPLETED: 
        colorClass = 'bg-slate-200 text-slate-500 border-slate-300'; 
        label = '已完成';
        break;
    }
  } else if (type === 'department') {
     colorClass = 'bg-slate-100 text-slate-700 border-slate-200 text-[10px] tracking-wider font-bold';
     
     // Dynamic lookup
     const dept = departments?.find(d => d.id === value);
     if (dept) {
         label = `[ ${dept.name} ]`;
     } else {
         label = `[ ${value} ]`;
     }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold tracking-wide ${colorClass}`}>
      {icon}{label}
    </span>
  );
};
