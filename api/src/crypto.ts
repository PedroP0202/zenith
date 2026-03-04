// Custom lightweight hashing using Cloudflare Workers Web Crypto API
// Suitable for edge computing without relying on heavy Node.js libraries.

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    // In production, we should use a random salt per user. 
    // Using a static salt + SHA-256 for this MVP for maximum edge speed.
    const data = encoder.encode(password + "ZENITH_GLOBAL_SALT");
    const hash = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function verifyPassword(password: string, hashToVerify: string): Promise<boolean> {
    const newHash = await hashPassword(password);
    return newHash === hashToVerify;
}
