import { generateTOTP } from "../totp";

describe("TOTP Generation", () => {
  it("should handle standard base32 secrets", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    await expect(generateTOTP(secret)).resolves.toMatch(/^\d{6}$/);
  });

  it("should handle mixed case base32 secrets", async () => {
    const secret = "jBsWy3dPeHpK3pXp";
    await expect(generateTOTP(secret)).resolves.toMatch(/^\d{6}$/);
  });

  it("should handle unpadded base32 secrets", async () => {
    // Your specific case
    const secret = "8TCPUFY4LSB8GE69QALNDTQT";
    await expect(generateTOTP(secret)).resolves.toMatch(/^\d{6}$/);
  });

  it("should handle hex secrets", async () => {
    const secret = "3132333435363738393031323334353637383930";
    await expect(generateTOTP(secret)).resolves.toMatch(/^\d{6}$/);
  });

  it("should handle ASCII secrets", async () => {
    const secret = "12345678901234567890";
    await expect(generateTOTP(secret)).resolves.toMatch(/^\d{6}$/);
  });

  it("should handle secrets with spaces and dashes", async () => {
    const secret = "JBSW Y3DP-EHPK 3PXP";
    await expect(generateTOTP(secret)).resolves.toMatch(/^\d{6}$/);
  });

  it("should reject empty secrets", async () => {
    await expect(generateTOTP("")).rejects.toThrow("Secret key cannot be empty");
  });
});
