import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateCode } from "@/lib/utils/2fa";
import { useDatabase } from "@/contexts/DatabaseContext";

interface TimerProps {
  expiresAt: string;
  codeId?: string;
  groupId?: string;
}

export const Timer: React.FC<TimerProps> = ({ expiresAt, codeId, groupId }) => {
  const { refreshData } = useDatabase();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isNearExpiry, setIsNearExpiry] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = async () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft(0);
        setIsNearExpiry(true);

        if (codeId) {
          // Generate new code when expired
          const newCode = generateCode();
          const { error } = await supabase
            .from("codes")
            .update({
              code: newCode,
              expires_at: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
            })
            .eq("id", codeId);

          if (!error) {
            await refreshData();
          }
        }
        return;
      }

      setTimeLeft(Math.floor(difference / 1000));
      setIsNearExpiry(difference <= 30000); // 30 seconds
    };

    // Initial calculation
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [expiresAt, codeId, refreshData]);


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
    <div className="relative inline-flex items-center gap-2 group">
      <Badge
        variant="secondary"
        className={`flex items-center gap-2 px-3 py-1.5 font-medium text-sm transition-all duration-300 ${getTimerColor()}`}
      >
        <Clock className={`w-4 h-4 ${timeLeft === 0 ? "animate-pulse" : ""}`} />
        <span className="tracking-wide">{formatTime(timeLeft)}</span>
      </Badge>
      {isNearExpiry && timeLeft > 0 && (
        <span className="absolute -right-2 -top-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
      )}
    </div>
  );
};

export default Timer;
