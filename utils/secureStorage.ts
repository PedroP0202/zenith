import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY_NAME = 'zenith_store_encryption_key';

/**
 * Retrieves the encryption key from iOS Keychain / Android Keystore.
 * Generates and saves a new one if it doesn't exist.
 */
async function getEncryptionKey(): Promise<string> {
    try {
        const { value } = await SecureStoragePlugin.get({ key: ENCRYPTION_KEY_NAME });
        return value;
    } catch (e: any) {
        // Item not found typically throws an error
        const newKey = CryptoJS.lib.WordArray.random(32).toString();
        await SecureStoragePlugin.set({ key: ENCRYPTION_KEY_NAME, value: newKey });
        return newKey;
    }
}

/**
 * Encrypts a string payload using AES and the secure key.
 */
export async function encryptData(data: string): Promise<string> {
    try {
        const key = await getEncryptionKey();
        return CryptoJS.AES.encrypt(data, key).toString();
    } catch (e) {
        console.error("Encryption failed:", e);
        return data; // Fallback to raw data in a catastrophic failure
    }
}

/**
 * Decrypts an AES encrypted payload using the secure key.
 */
export async function decryptData(encryptedData: string): Promise<string> {
    try {
        const key = await getEncryptionKey();
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("Decryption failed:", e);
        return encryptedData; // Fallback in case it wasn't encrypted yet
    }
}

// ----------------------------------------------------------------------
// Dedicated JWT Storage Methods (Keeps JWT completely out of Zustand persist)
// ----------------------------------------------------------------------

const JWT_KEY_NAME = 'zenith_auth_jwt';

export async function saveSecureJwt(token: string): Promise<void> {
    try {
        await SecureStoragePlugin.set({ key: JWT_KEY_NAME, value: token });
    } catch (e) {
        console.error("Failed to save JWT to secure storage:", e);
    }
}

export async function getSecureJwt(): Promise<string | null> {
    try {
        const { value } = await SecureStoragePlugin.get({ key: JWT_KEY_NAME });
        return value || null;
    } catch (e) {
        // Normal error if the key doesn't exist (e.g., user is logged out)
        return null;
    }
}

export async function removeSecureJwt(): Promise<void> {
    try {
        await SecureStoragePlugin.remove({ key: JWT_KEY_NAME });
    } catch (e) {
        console.error("Failed to remove JWT from secure storage:", e);
    }
}
