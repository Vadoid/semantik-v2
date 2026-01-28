'use client';

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      // Check if localStorage exists and has getItem
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage.getItem(key);
      }
      // Handle case where localStorage exists but is not standard (e.g. some dev environments)
      if (typeof localStorage !== 'undefined' && (localStorage as any)[key]) {
        return (localStorage as any)[key];
      }
    } catch (e) {
      console.warn('localStorage access failed', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage access failed', e);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('localStorage access failed', e);
    }
  }
};
