import { TaskStatus, Urgency } from '../types';

export const statusToChinese = (status: string): string => {
  const map: Record<string, string> = {
    'Open': '待分派',
    'Assigned': '已指派',
    'In Progress': '進行中',
    'Completed': '已完成',
    'Cancelled': '已取消'
  };
  return map[status] || status;
};

export const urgencyToChinese = (urgency: string): string => {
  const map: Record<string, string> = {
    'low': '低優先級',
    'medium': '中優先級',
    'high': '高優先級',
    'urgent': '最高緊急'
  };
  return map[urgency] || urgency;
};

export const translateTaskContent = (content: string): string => {
  let translated = content;
  
  // 替換狀態相關的英文
  translated = translated.replace(/\b(Open|Assigned|In Progress|Completed|Cancelled)\b/g, (match) => {
    return statusToChinese(match);
  });
  
  // 替換優先級相關的英文
  translated = translated.replace(/\b(low|medium|high|urgent)\b/gi, (match) => {
    return urgencyToChinese(match.toLowerCase());
  });
  
  return translated;
};
