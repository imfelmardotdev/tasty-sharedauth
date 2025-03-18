import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getTimeRemaining } from "@/lib/utils/totp";
import { updateGroupCodeWithSecret } from "@/lib/db/queries";

interface TimerProps {
  expiresAt: string;
  codeId?: string;
  groupId?: string;
  showRefreshText?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ 
  expiresAt, 
  codeId, 
  groupId,
  showRefreshText = true // Default to true for backward compatibility
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isNearExpiry, setIsNearExpiry] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    let isActive = true;
    let timerInterval: NodeJS.Timeout;
    let forceUpdateInterval: NodeJS.Timeout;

    const updateCode = async () => {
      if (!isActive || !codeId) return;

      try {
        console.log("Updating code...");
        // Update the code in the database using the same function as the models page
        const success = await updateGroupCodeWithSecret(codeId);
        
        if (!isActive) return;
        
        if (!success) {
          setUpdateError(true);
          console.warn("Failed to update code in database");
        } else {
          setUpdateError(false);
          console.log("Code updated successfully");
        }
      } catch (error) {
        if (!isActive) return;
        console.error("Error updating code:", error);
        setUpdateError(true);
      }
    };

    const updateTimer = () => {
      if (!isActive) return;

      // Calculate time remaining based on expiresAt prop
      const now = new Date();
      const expiry = new Date(expiresAt);
      const remaining = Math.max(0, Math.round((expiry.getTime() - now.getTime()) / 1000));
      
      setTimeLeft(remaining);
      setIsNearExpiry(remaining <= 5);

      // Update code when timer reaches 30 or 0
      if (remaining === 30 || remaining === 0) {
        console.log(`Timer reached ${remaining}, updating code`);
        updateCode();
      }
    };

    // Initial updates
    updateTimer();
    
    if (codeId) {
      // Force an update every 30 seconds regardless of timer state
      forceUpdateInterval = setInterval(() => {
        if (!isActive) return;
        updateCode();
      }, 30000);
    }

    // Set up interval for timer updates
    timerInterval = setInterval(updateTimer, 1000);
    
    return () => {
      isActive = false;
      if (timerInterval) clearInterval(timerInterval);
      if (forceUpdateInterval) clearInterval(forceUpdateInterval);
    };
  }, [codeId, expiresAt]);


  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Expired";

    const parts = [];

    if (seconds >= 86400) {
      // Days
      const days = Math.floor(seconds / 86400);
      parts.push(`${days}d`);
      seconds %= 86400;
    }

    if (seconds >= 3600) {
      // Hours
      const hours = Math.floor(seconds / 3600);
      parts.push(`${hours}h`);
      seconds %= 3600;
    }

    if (seconds >= 60) {
      // Minutes
      const minutes = Math.floor(seconds / 60);
      parts.push(`${minutes}m`);
      seconds %= 60;
    }

    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}s`);
    }

    return parts.join(" ");
  };

  const getTimerColor = () => {
    if (timeLeft === 0)
      return "bg-destructive/10 text-destructive hover:bg-destructive/20";
    if (isNearExpiry)
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
    return "bg-primary/10 text-primary hover:bg-primary/20";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`flex items-center gap-2 px-3 py-1.5 font-medium text-sm transition-all duration-300 ${getTimerColor()}`}
        >
          <Clock className={`w-4 h-4 ${timeLeft === 0 ? "animate-pulse" : ""}`} />
          <span className="tracking-wide">{timeLeft}s</span>
        </Badge>
        {isNearExpiry && timeLeft > 0 && (
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
        )}
      </div>
      <Progress value={(timeLeft / 30) * 100} className="h-1" />
      {showRefreshText && (
        <div className="text-xs text-gray-500">
          Refreshes in {timeLeft}s
        </div>
      )}
    </div>
  );
};

export default Timer;
