import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID if not available in environment
if (!global.crypto) {
  (global as any).crypto = {};
}
if (!global.crypto.randomUUID) {
  (global.crypto as any).randomUUID = vi.fn(() => '00000000-0000-0000-0000-000000000000' as `${string}-${string}-${string}-${string}-${string}`);
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
