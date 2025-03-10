// Use Web Crypto API for browser environment
const textEncoder = new TextEncoder();

// Format detection
function isHexFormat(str: string): boolean {
  return /^[0-9A-Fa-f]+$/.test(str);
}

function isBase32Format(str: string): boolean {
  return /^[A-Za-z2-7]+=*$/.test(str);
}

// Convert hex to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Convert ASCII to bytes
function asciiToBytes(str: string): Uint8Array {
  return textEncoder.encode(str);
}

// Convert base32 to bytes with improved handling
function base32ToBytes(base32: string): Uint8Array {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  // Clean the input but preserve case temporarily
  const cleanedInput = base32.replace(/[^A-Za-z2-7]/g, "");
  const length = Math.floor((cleanedInput.length * 5) / 8);
  const result = new Uint8Array(length);

  let bits = 0;
  let currentByte = 0;
  let byteIndex = 0;

  for (let i = 0; i < cleanedInput.length; i++) {
    // Case-insensitive lookup
    const val = base32chars.indexOf(cleanedInput[i].toUpperCase());
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

// Normalize secret key to bytes
function normalizeSecret(secret: string): Uint8Array {
  if (!secret) {
    throw new Error("Secret key cannot be empty");
  }

  // Remove whitespace and special characters
  const cleaned = secret.replace(/[\s-]/g, "");
  
  if (isHexFormat(cleaned)) {
    return hexToBytes(cleaned);
  }
  
  if (isBase32Format(cleaned)) {
    return base32ToBytes(cleaned);
  }
  
  // Default to treating as ASCII text
  return asciiToBytes(cleaned);
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
    // Normalize and convert secret to bytes
    const secretBytes = normalizeSecret(secret);

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
  const currentSeconds = Math.floor(Date.now() / 1000);
  const secondsIntoCurrentWindow = currentSeconds % window;
  const secondsUntilNextWindow = window - secondsIntoCurrentWindow;
  
  // Return the full window time when it's exactly at the boundary
  return secondsUntilNextWindow === 0 ? window : secondsUntilNextWindow;
}
