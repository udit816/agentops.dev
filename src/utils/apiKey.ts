import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

// Generate a secure API key
export function generateApiKey(): string {
    // Generate 24 random bytes and convert to base64url
    const bytes = randomBytes(24);
    return bytes
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Hash an API key for storage
export async function hashApiKey(apiKey: string): Promise<string> {
    return bcrypt.hash(apiKey, SALT_ROUNDS);
}

// Verify an API key against a hash
export async function verifyApiKey(
    apiKey: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(apiKey, hash);
}
