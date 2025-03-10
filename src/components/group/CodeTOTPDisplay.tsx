import React, { useState, useEffect } from "react";
import { generateTOTP, getTimeRemaining } from "@/lib/utils/totp";
import { Progress } from "@/components/ui/progress";
import { updateCodeWithSecret } from "@/lib/db/queries";

interface CodeTOTPDisplayProps {
  secret: string | null;
  codeId: string;
}

const CodeTOTPDisplay = ({ secret, codeId }: CodeTOTPDisplayProps) => {
  const [code, setCode] = useState<string>("");
  const [updateError, setUpdateError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    if (!secret) return;

    let isActive = true;
    let timerInterval: NodeJS.Timeout;
    let forceUpdateInterval: NodeJS.Timeout;

    const updateCode = async () => {
      if (!isActive) return;

      try {
        // Generate TOTP code using the secret
        const newCode = await generateTOTP(secret);
        
        if (!isActive) return;
        
        // Update local state
        setCode(newCode);
        
        // Update the database using the secret directly
        const updated = await updateCodeWithSecret(codeId);
        
        if (!isActive) return;
        
        if (!updated) {
          setUpdateError(true);
          console.warn("Failed to update code in database");
        } else {
          setUpdateError(false);
        }
      } catch (error) {
        if (!isActive) return;
        console.error("Error generating TOTP:", error);
        setUpdateError(true);
        setCode("Error");
      }
    };

    const updateTimer = () => {
      if (!isActive) return;
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      // Update code when timer reaches 30 or 0
      if (remaining === 30 || remaining === 0) {
        updateCode();
      }
    };

    // Initial updates
    updateCode();
    updateTimer();
    
    // Force an update every 30 seconds regardless of timer state
    forceUpdateInterval = setInterval(() => {
      if (!isActive) return;
      updateCode();
    }, 30000);

    // Set up interval for timer updates
    timerInterval = setInterval(updateTimer, 1000);
    
    return () => {
      isActive = false;
      clearInterval(timerInterval);
      clearInterval(forceUpdateInterval);
    };
  }, [secret, codeId]);

  if (!secret) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className={`font-mono text-lg ${updateError ? 'text-yellow-500' : ''}`}>{code}</div>
      <Progress value={(timeRemaining / 30) * 100} className="h-1" />
      <div className="text-xs text-gray-500">
        Refreshes in {timeRemaining}s
      </div>
    </div>
  );
};

export default CodeTOTPDisplay;
