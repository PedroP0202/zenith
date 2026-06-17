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
    // Legacy SHA-256 fallback removed — all passwords must be PBKDF2 hashes (salt:hash format).
    // Accounts with old hashes must reset their password.
    if (!storedValue || !storedValue.includes(':')) {
        return false;
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

    // Constant-time comparison to prevent timing attacks
    if (newHashHex.length !== originalHashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < newHashHex.length; i++) {
        diff |= newHashHex.charCodeAt(i) ^ originalHashHex.charCodeAt(i);
    }
    return diff === 0;
}
