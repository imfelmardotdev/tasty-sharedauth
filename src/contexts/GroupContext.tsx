import React, { createContext, useContext, useState } from "react";
import { mockGroups as initialMockGroups } from "@/lib/utils/mockDb";
import type { Group } from "@/lib/utils/mockDb";

interface GroupContextType {
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  deleteGroup: (groupId: string) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState(initialMockGroups);

  const deleteGroup = (groupId: string) => {
    setGroups((currentGroups) => currentGroups.filter((g) => g.id !== groupId));
  };

  return (
    <GroupContext.Provider value={{ groups, setGroups, deleteGroup }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroups must be used within a GroupProvider");
  }
  return context;
}
