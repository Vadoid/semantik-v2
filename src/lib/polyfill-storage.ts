const noop = () => { };
const mockStorage = {
  getItem: (_key: string) => null,
  setItem: noop,
  removeItem: noop,
  clear: noop,
  length: 0,
  key: () => null,
};

if (typeof window === 'undefined') {
  try {
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  } catch (e) {
    // console.error('[Polyfill] Failed to define localStorage:', e);
    (global as any).localStorage = mockStorage;
  }
}

export { };
