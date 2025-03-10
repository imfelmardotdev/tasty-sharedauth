// Simple TOTP-like code generation (for demo purposes)
export const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getTimeRemaining = () => {
  const now = new Date();
  const secondsIntoCurrentWindow = now.getSeconds() % 30;
  const secondsUntilNextWindow = 30 - secondsIntoCurrentWindow;
  
  // Return the full window time when it's exactly at the boundary
  return secondsUntilNextWindow === 0 ? 30 : secondsUntilNextWindow;
};
