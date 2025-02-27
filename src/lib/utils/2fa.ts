// Simple TOTP-like code generation (for demo purposes)
export const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getTimeRemaining = () => {
  const now = new Date();
  return 30 - (now.getSeconds() % 30);
};
