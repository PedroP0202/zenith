// Secure hashing using Cloudflare Workers Web Crypto API (PBKDF2)
// This is significantly more secure than plain SHA-256 against brute-force attacks.

const ITERATIONS = 100000;
const SALT_SIZE = 16; // bytes

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    
    // Import the password as a key
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive the hash
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        256 // length in bits
    );

    // Encode as salt:hash in hex
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
    if (!storedValue || !storedValue.includes(':')) {
        // Fallback for old SHA-256 hashes if any exist during migration
        const encoder = new TextEncoder();
        const data = encoder.encode(password + "ZENITH_GLOBAL_SALT");
        const hash = await crypto.subtle.digest('SHA-256', data);
        const legacyHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        return legacyHash === storedValue;
    }

    const [saltHex, originalHashHex] = storedValue.split(':');
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        256
    );

    const newHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return newHashHex === originalHashHex;
}
