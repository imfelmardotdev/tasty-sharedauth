import React, { useState, useEffect } from "react";
import { generateTOTP, getTimeRemaining } from "@/lib/utils/totp";
import { Progress } from "@/components/ui/progress";
import { updateGroupCodeWithSecret } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/components/ui/use-toast";

interface GroupTOTPDisplayProps {
  secret: string | null;
  codeId: string;
  groupName?: string;
  codeName?: string;
}

const GroupTOTPDisplay = ({ 
  secret, 
  codeId, 
  groupName = "Group",
  codeName = "Code"
}: GroupTOTPDisplayProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState<string>("");
  const [updateError, setUpdateError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    if (!secret || !codeId) return;

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
        const updated = await updateGroupCodeWithSecret(codeId);
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
  }, [secret, codeId]);

  if (!secret) {
    return null;
  }

  const handleBackup = async () => {
    if (!secret) return;
    
    try {
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(groupName)}:${encodeURIComponent(codeName)}?secret=${secret}&issuer=${encodeURIComponent(groupName)}&algorithm=SHA1&digits=6&period=30`;
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
      
      // Create temporary link element
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${groupName}-${codeName}-totp-backup.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "QR Code downloaded",
        description: "Your TOTP backup QR code has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code backup.",
        variant: "destructive",
      });
    }
  };

  return (
    <div data-code-id={codeId} className="flex flex-col items-center">
      <div className={`font-mono text-3xl sm:text-5xl tracking-[0.25em] sm:tracking-[0.5em] text-primary font-bold text-center ${updateError ? 'text-yellow-500' : ''}`}>
        {code}
      </div>
    </div>
  );
};

export default GroupTOTPDisplay;
