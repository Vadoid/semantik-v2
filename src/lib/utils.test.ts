
import { describe, it, expect } from 'vitest';
import { cn, formatBytes } from './utils';

describe('src/lib/utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('p-4', 'text-center')).toBe('p-4 text-center');
    });

    it('should handle conditional classes', () => {
      expect(cn('p-4', true && 'text-center', false && 'hidden')).toBe('p-4 text-center');
    });

    it('should merge tailwind classes using tailwind-merge', () => {
      // p-4 is padding: 1rem, p-8 is padding: 2rem. p-8 should win.
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes to human readable string', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1234)).toBe('1.21 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should handle decimals argument', () => {
      expect(formatBytes(1234, 3)).toBe('1.205 KB');
      expect(formatBytes(1234, 0)).toBe('1 KB');
    });
  });
});
