const CROCKFORD_BASE32 = '0123456789abcdefghjkmnpqrstvwxyz';

function encodeTimestamp(timestamp: number): string {
    let value = Math.floor(timestamp);
    let encoded = '';

    for (let index = 0; index < 10; index++) {
        encoded = CROCKFORD_BASE32[value % 32] + encoded;
        value = Math.floor(value / 32);
    }

    return encoded;
}

function encodeRandomness(randomBytes: Uint8Array): string {
    let value = 0;
    let bits = 0;
    let encoded = '';

    for (const byte of randomBytes) {
        value = value * 256 + byte;
        bits += 8;

        while (bits >= 5) {
            bits -= 5;
            encoded += CROCKFORD_BASE32[Math.floor(value / 2 ** bits) % 32];
            value %= 2 ** bits;
        }
    }

    return encoded;
}

/**
 * Generates a source-friendly task ID from the random suffix of a ULID.
 *
 * The first 10 ULID characters encode time and are deliberately discarded:
 * they are not sufficiently unique when multiple tasks are created together.
 */
export function generateTaskId(): string {
    const randomBytes = new Uint8Array(10);
    crypto.getRandomValues(randomBytes);

    const ulid = encodeTimestamp(Date.now()) + encodeRandomness(randomBytes);
    return `t-${ulid.slice(-12)}`;
}
