import React, { useState, useEffect } from "react";
import { generateTOTP, getTimeRemaining } from "@/lib/utils/totp";
import { Progress } from "@/components/ui/progress";
import { updateGroupCodeWithSecret } from "@/lib/db/queries";

interface GroupTOTPDisplayProps {
  secret: string | null;
  groupId: string;
}

const GroupTOTPDisplay = ({ secret, groupId }: GroupTOTPDisplayProps) => {
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
        const newCode = await generateTOTP(secret);
        if (!isActive) return; // Check again before state updates
        
        setCode(newCode);
        
        // Try to update the database
        const updated = await updateGroupCodeWithSecret(groupId);
        if (!isActive) return;

        if (!updated) {
          setUpdateError(true);
          console.warn("Failed to update group code in database");
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
  }, [secret, groupId]);

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

export default GroupTOTPDisplay;
