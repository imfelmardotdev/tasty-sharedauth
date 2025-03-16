import React, { useState, useEffect } from "react";
import { generateTOTP, getTimeRemaining } from "@/lib/utils/totp";
import { updateModelCode } from "@/lib/db/queries";
import { Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

interface TOTPDisplayProps {
  secret: string | null;
  modelId: string;
}

const TOTPDisplay = ({ secret, modelId }: TOTPDisplayProps) => {
  const { toast } = useToast();
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
        const updated = await updateModelCode(modelId, newCode);
        if (!isActive) return;

        if (!updated) {
          setUpdateError(true);
          console.warn("Failed to update model code in database");
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
  }, [secret, modelId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code copied!",
        description: "The 2FA code has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast({
        title: "Error",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!secret) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center">
        <div data-model-id={modelId} className={`font-mono text-3xl tracking-[0.25em] text-primary font-bold ${updateError ? 'text-yellow-500' : ''}`}>
          {code}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="shrink-0 h-8 w-8 ml-2"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TOTPDisplay;
