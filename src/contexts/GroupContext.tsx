import React, { createContext, useContext, useState } from "react";
import { Code, GroupCode } from "@/lib/db/types";
import { supabase } from "@/lib/supabase";
import { generateCode } from "@/lib/utils/2fa";
import { generateTOTP } from "@/lib/utils/totp";

interface GroupContextType {
  updateCodeInGroup: (codeId: string) => Promise<boolean>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider = ({ children }: { children: React.ReactNode }) => {
  // Function to update a specific code without refreshing the entire database
  const updateCodeInGroup = async (codeId: string): Promise<boolean> => {
    try {
      // First, check if the code has a secret (for TOTP)
      let { data: codeData, error: fetchError } = await supabase
        .from("group_codes")
        .select("secret")
        .eq("id", codeId)
        .single();

      // If not found in group_codes, try codes table
      if (fetchError || !codeData) {
        ({ data: codeData, error: fetchError } = await supabase
          .from("codes")
          .select("secret")
          .eq("id", codeId)
          .single());
      }

      // Generate new code based on whether there's a secret
      let newCode;
      if (codeData?.secret) {
        // Generate TOTP code using the secret
        newCode = await generateTOTP(codeData.secret);
        console.log("Generated TOTP code using secret");
      } else {
        // Generate random code
        newCode = generateCode();
        console.log("Generated random code");
      }

      const newExpiresAt = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now
      
      const updateData = {
        code: newCode,
        expires_at: newExpiresAt
      };
      
      console.log(`Updating code ${codeId} with new code ${newCode} and expiry ${newExpiresAt}`);
      
      // First try to update in the group_codes table
      let { data, error } = await supabase
        .from("group_codes")
        .update(updateData)
        .eq("id", codeId)
        .select();

      // If there's no error, the update was successful
      if (!error && data) {
        console.log("Updated code in group_codes table:", data);
        return true;
      }
      
      // If there was an error, try the codes table
      ({ data, error } = await supabase
        .from("codes")
        .update(updateData)
        .eq("id", codeId)
        .select());

      if (error) {
        console.error("Error updating code:", error);
        return false;
      }
      
      console.log("Updated code in codes table:", data);
      return true;
    } catch (err) {
      console.error("Error in updateCodeInGroup:", err);
      return false;
    }
  };

  return (
    <GroupContext.Provider value={{ updateCodeInGroup }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
};
