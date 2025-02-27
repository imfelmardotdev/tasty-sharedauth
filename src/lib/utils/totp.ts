// Use Web Crypto API for browser environment
const textEncoder = new TextEncoder();

// Convert base32 to bytes
function base32ToBytes(base32: string): Uint8Array {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanedInput = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const length = Math.floor((cleanedInput.length * 5) / 8);
  const result = new Uint8Array(length);

  let bits = 0;
  let currentByte = 0;
  let byteIndex = 0;

  for (let i = 0; i < cleanedInput.length; i++) {
    const val = base32chars.indexOf(cleanedInput[i]);
    if (val === -1) continue;

    currentByte = (currentByte << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      result[byteIndex++] = (currentByte >> bits) & 0xff;
    }
  }

  return result;
}

// HMAC-based One-time Password (HOTP) calculation
async function generateHOTP(
  secret: Uint8Array,
  counter: number,
): Promise<string> {
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = counter >> 8;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

// Time-based One-time Password (TOTP) generation
export async function generateTOTP(
  secret: string,
  window = 30,
): Promise<string> {
  try {
    // Clean and validate the secret
    const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z2-7]+=*$/.test(cleanSecret)) {
      throw new Error("Invalid base32 secret");
    }

    // Convert base32 secret to bytes
    const secretBytes = base32ToBytes(cleanSecret);

    // Calculate counter based on current time
    const counter = Math.floor(Date.now() / 1000 / window);

    // Generate HOTP
    return await generateHOTP(secretBytes, counter);
  } catch (error) {
    console.error("TOTP generation error:", error);
    throw error;
  }
}

// Get remaining time until next TOTP rotation
export function getTimeRemaining(window = 30): number {
  return window - (Math.floor(Date.now() / 1000) % window);
}
