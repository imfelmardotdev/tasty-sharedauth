import React from "react";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { GroupProvider } from "@/contexts/GroupContext";

interface StoryboardWrapperProps {
  children: React.ReactNode;
}

const StoryboardWrapper = ({ children }: StoryboardWrapperProps) => {
  return (
    <DatabaseProvider>
      <GroupProvider>{children}</GroupProvider>
    </DatabaseProvider>
  );
};

export default StoryboardWrapper;
