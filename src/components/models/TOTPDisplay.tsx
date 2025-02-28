import React, { useState, useEffect } from "react";
import { generateTOTP, getTimeRemaining } from "@/lib/utils/totp";
import { Progress } from "@/components/ui/progress";

interface TOTPDisplayProps {
  secret: string | null;
}

const TOTPDisplay = ({ secret }: TOTPDisplayProps) => {
  const [code, setCode] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    if (!secret) return;

    let intervalId: NodeJS.Timeout;

    const updateCode = async () => {
      try {
        const newCode = await generateTOTP(secret);
        setCode(newCode);
      } catch (error) {
        console.error("Error generating TOTP:", error);
        setCode("Error");
      }
    };

    const updateTimer = () => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      // If we're at the start of a new period, update the code
      if (remaining === 30) {
        updateCode();
      }
    };

    // Initial updates
    updateCode();
    updateTimer();

    // Set up intervals
    const timerInterval = setInterval(updateTimer, 1000);
    
    return () => {
      clearInterval(timerInterval);
    };
  }, [secret]);

  if (!secret) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="font-mono text-lg">{code}</div>
      <Progress value={(timeRemaining / 30) * 100} className="h-1" />
      <div className="text-xs text-gray-500">
        Refreshes in {timeRemaining}s
      </div>
    </div>
  );
};

export default TOTPDisplay;
