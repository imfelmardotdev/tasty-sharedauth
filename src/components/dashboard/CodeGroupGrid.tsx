import React from "react";
import CodeGroupCard from "./CodeGroupCard";

interface CodeGroup {
  id: string;
  title: string;
  description?: string;
  codes?: {
    id: string;
    name: string;
    code: string;
    notes?: string;
    expires_at: string;
  }[];
  timeRemaining?: number;
  user_groups?: [{ count: number }];
  user_access?: boolean;
  member_count?: [{ count: number }];
}

interface CodeGroupGridProps {
  currentRole?: "Admin" | "Manager" | "User";
  groups?: CodeGroup[];
  onCopy?: (id: string) => void;
  onShare?: (id: string) => void;
}

const CodeGroupGrid = ({
  groups = [],
  onCopy = (id: string) => console.log(`Copy clicked for ${id}`),
  onShare = (id: string) => console.log(`Share clicked for ${id}`),
  currentRole = "User",
}: CodeGroupGridProps) => {
  const userId = localStorage.getItem("userId");

  // Filter groups based on user access
  const accessibleGroups = groups.filter((group) => {
    if (currentRole === "Admin") return true;
    if (currentRole === "Manager") return true;
    return group.user_access;
  });

  return (
    <div className="w-full bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {accessibleGroups.map((group) => {
          const latestCode = group.codes?.[0];
          const timeRemaining = latestCode
            ? Math.max(
                0,
                Math.floor(
                  (new Date(latestCode.expires_at).getTime() - Date.now()) /
                    1000,
                ),
              )
            : 0;

          return (
            <div key={group.id}>
              <CodeGroupCard
                id={group.id}
                title={group.title}
                description={group.description}
                codes={group.codes}
                timeRemaining={timeRemaining}
                memberCount={group.member_count?.[0]?.count ?? 0}
                onCopy={() => onCopy(group.id)}
                onShare={() => onShare(group.id)}
                currentRole={currentRole}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CodeGroupGrid;
