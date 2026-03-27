import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID if not available in environment
if (!global.crypto) {
  (global as any).crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => 'test-uuid-' + Math.random());
}

// Mock fetch
global.fetch = vi.fn();

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
  },
}));

// Mock secure storage
vi.mock('@/utils/secureStorage', () => ({
  encryptData: vi.fn((data) => Promise.resolve(data)),
  decryptData: vi.fn((data) => Promise.resolve(data)),
  saveSecureJwt: vi.fn(() => Promise.resolve()),
  getSecureJwt: vi.fn(() => Promise.resolve(null)),
  removeSecureJwt: vi.fn(() => Promise.resolve()),
}));
