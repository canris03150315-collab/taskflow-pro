// authSession.ts
// Session management for report authorization
import { ReportAuthorization } from '../types';

const AUTH_STORAGE_KEY = 'report_authorization';

// Generate session ID
export const generateSessionId = (): string => {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Save authorization to sessionStorage
export const saveAuthorization = (auth: ReportAuthorization): void => {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch (error) {
    console.error('Failed to save authorization:', error);
  }
};

// Get authorization from sessionStorage
export const getAuthorization = (): ReportAuthorization | null => {
  try {
    const data = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;
    
    const auth = JSON.parse(data) as ReportAuthorization;
    
    // Check if expired
    if (new Date(auth.expiresAt) < new Date()) {
      clearAuthorization();
      return null;
    }
    
    return auth;
  } catch (error) {
    console.error('Failed to get authorization:', error);
    return null;
  }
};

// Check if authorization is valid
export const isAuthorizationValid = (): boolean => {
  const auth = getAuthorization();
  if (!auth) return false;
  
  // Check if active and not expired
  return auth.isActive && new Date(auth.expiresAt) > new Date();
};

// Clear authorization
export const clearAuthorization = (): void => {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear authorization:', error);
  }
};

// Get remaining time in seconds
export const getRemainingTime = (): number => {
  const auth = getAuthorization();
  if (!auth) return 0;
  
  const expiresAt = new Date(auth.expiresAt);
  const now = new Date();
  const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  
  return remaining > 0 ? remaining : 0;
};

// Format time (seconds to MM:SS)
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Generate device fingerprint (simplified version)
export const generateDeviceFingerprint = (): string => {
  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  
  // Simple hash
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};
