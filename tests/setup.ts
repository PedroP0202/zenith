import '@testing-library/jest-dom';
import { vi } from 'vitest';

type TestCrypto = {
  randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
};

// Mock crypto.randomUUID if not available in environment
const globalWithCrypto = globalThis as typeof globalThis & { crypto?: TestCrypto };
if (!globalWithCrypto.crypto) {
  globalWithCrypto.crypto = {};
}
if (!globalWithCrypto.crypto.randomUUID) {
  globalWithCrypto.crypto.randomUUID = vi.fn(
    () => '00000000-0000-0000-0000-000000000000' as `${string}-${string}-${string}-${string}-${string}`
  );
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
