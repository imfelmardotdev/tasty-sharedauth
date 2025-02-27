import React, { useState, useEffect } from "react";
import { generateTOTP } from "@/lib/utils/totp";
import { supabase } from "@/lib/supabase";

interface TotpCodeProps {
  codeId?: string;
  secret?: string;
}

export default function TotpCode({ codeId, secret }: TotpCodeProps) {
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const { data, error } = await supabase
          .from("codes")
          .select("code, secret, expires_at")
          .eq("id", codeId)
          .single();

        if (error) {
          console.error("Error fetching code:", error);
          return;
        }

        if (data) {
          setCode(data.code);
          setExpiresAt(data.expires_at);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    const generateCodeFromSecret = async () => {
      if (secret) {
        const totpCode = await generateTOTP(secret);
        setCode(totpCode);
      }
    };

    const refreshExpiredCode = async () => {
      try {
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + 30 * 1000); // 30 seconds from now
        const newCode = await generateTOTP(secret || "");

        const { error } = await supabase
          .from("codes")
          .update({
            code: newCode,
            expires_at: newExpiresAt.toISOString(),
          })
          .eq("id", codeId);

        if (error) throw error;

        setCode(newCode);
        setExpiresAt(newExpiresAt.toISOString());
      } catch (error) {
        console.error("Error refreshing code:", error);
      }
    };

    if (codeId) {
      fetchCode();
    } else if (secret) {
      generateCodeFromSecret();
    }

    const interval = setInterval(() => {
      if (expiresAt) {
        const now = new Date();
        const expires = new Date(expiresAt);
        let diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
        setTimeLeft(diff);

        if (diff <= 0 && codeId) {
          refreshExpiredCode();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeId, expiresAt, secret]);

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4 rounded-2xl shadow-xl w-72">
      <div className="text-2xl font-mono text-gray-700 break-words">{code}</div>
      <div className="mt-2 text-[0.5rem] text-gray-500 uppercase tracking-widest">
        expires in {timeLeft}s
      </div>
    </div>
  );
}
