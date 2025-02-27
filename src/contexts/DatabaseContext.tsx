import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Group, Code } from "@/lib/db/types";
import { getGroups } from "@/lib/db/queries";

interface DatabaseContextType {
  groups: Group[];
  codes: Code[];
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined,
);

export const DatabaseProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      const groupsData = await getGroups();
      setGroups(groupsData);

      // Extract codes from groups
      const allCodes = groupsData.flatMap((g) => g.codes || []);
      setCodes(allCodes);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Only set up subscriptions if supabase is initialized
    if (supabase) {
      // Set up realtime subscriptions with enhanced configuration
      const channel = supabase
        .channel("db-changes", {
          config: {
            broadcast: { self: true },
            presence: { key: "user_presence" },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "groups",
          },
          async (payload) => {
            console.log("Group change detected:", payload);
            await refreshData();
          },
        )
        .subscribe((status) => {
          console.log("Realtime subscription status:", status);
          if (status === "SUBSCRIBED") {
            console.log("Successfully subscribed to database changes");
          }
        });

      return () => {
        console.log("Cleaning up realtime subscription");
        supabase.removeChannel(channel);
      };
    }
  }, []);

  return (
    <DatabaseContext.Provider
      value={{ groups, codes, loading, error, refreshData }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};

export { useDatabase };
export default DatabaseProvider;
