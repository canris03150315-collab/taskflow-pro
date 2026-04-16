export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// Authorization helpers for report access
const AUTH_KEY = 'report_authorization';

export const saveAuthorization = (auth: any): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

export const getAuthorization = (): any | null => {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const isAuthorizationValid = (): boolean => {
  const auth = getAuthorization();
  if (!auth?.expiresAt) return false;
  return new Date(auth.expiresAt).getTime() > Date.now();
};

export const clearAuthorization = (): void => {
  localStorage.removeItem(AUTH_KEY);
};

export const getRemainingTime = (auth: any): number => {
  if (!auth?.expiresAt) return 0;
  const remaining = Math.floor((new Date(auth.expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
