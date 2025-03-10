import React, { useState, useEffect, useCallback } from "react";
import { getPermissions, type Role } from "@/lib/utils/roles";
import Sidebar from "./layout/Sidebar";
import { generateCode } from "@/lib/utils/2fa";
import Header from "./dashboard/Header";
import CodeGroupGrid from "./dashboard/CodeGroupGrid";
import AddCodeModal from "./dashboard/AddCodeModal";
import ShareModal from "./dashboard/ShareModal";
import StatsCard from "./dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Plus, Users, FolderClosed, KeyRound, Share2 } from "lucide-react";
import { useDatabase } from "@/contexts/DatabaseContext";
import { createGroup, createCode } from "@/lib/db/queries";
import { supabase } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { Loader2 } from "lucide-react";

interface HomeProps {
  initialRole?: Role;
}

const Home = ({ initialRole = "User" }: HomeProps) => {
  // Use the improved auth guard
  const { loading: authLoading, isAuthenticated } = useAuthGuard();
  
  const [currentRole, setCurrentRole] = useState<Role>(
    (localStorage.getItem("userRole") as Role) || initialRole,
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalCodes: 0,
    totalMembers: 0,
    totalSharedLinks: 0,
  });

  const { groups, loading, error, refreshData } = useDatabase();
  const [localGroups, setLocalGroups] = useState(groups);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  // Prevent caching of the dashboard page
  useEffect(() => {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />`
    );
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta http-equiv="Pragma" content="no-cache" />`
    );
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta http-equiv="Expires" content="0" />`
    );

    // Clean up meta tags when component unmounts
    return () => {
      const metaTags = document.head.querySelectorAll('meta[http-equiv]');
      metaTags.forEach(tag => tag.remove());
    };
  }, []);

  // Update stats when groups change
  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;

      try {
        // Get total members
        const { count: membersCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        // Get total shared links
        const { count: sharedLinksCount } = await supabase
          .from("shared_links")
          .select("*", { count: "exact", head: true });

        // Calculate total codes
        const totalCodes = groups.reduce(
          (sum, group) => sum + (group.codes?.length || 0),
          0,
        );

        setStats({
          totalGroups: groups.length,
          totalCodes,
          totalMembers: membersCount || 0,
          totalSharedLinks: sharedLinksCount || 0,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
  }, [groups]);

  // Update local groups when database groups change
  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  const handleAddCode = async (values: any) => {
    if (
      !getPermissions(currentRole).canCreateGroups &&
      !getPermissions(currentRole).canAddCodes
    ) {
      return;
    }
    try {
      let groupId;
      const existingGroup = groups.find((g) => g.title === values.groupName);

      if (existingGroup) {
        groupId = existingGroup.id;
      } else {
        const newGroup = await createGroup({
          title: values.groupName,
          description: values.notes,
          created_by: localStorage.getItem("userId"),
          created_at: new Date().toISOString(),
        });

        const userId = localStorage.getItem("userId");
        if (userId) {
          await supabase.from("user_groups").insert({
            user_id: userId,
            group_id: newGroup.id,
            created_at: new Date().toISOString(),
          });
        }
        groupId = newGroup.id;
      }

      const expirationMap = {
        "30s": 30 * 1000,
        "1m": 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
      };

      const expirationMs = expirationMap[values.expiration] || 30 * 1000;

      await createCode({
        group_id: groupId,
        name: values.name,
        code: values.code || generateCode(),
        notes: values.notes,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + expirationMs).toISOString(),
      });

      await refreshData();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error adding code:", err);
    }
  };

  const handleShare = (id: string) => {
    const group = localGroups.find((g) => g.id === id);
    if (group) {
      setSelectedGroup({ id: group.id, title: group.title });
      setIsShareModalOpen(true);
    }
  };

  const handleCopy = async (id: string) => {
    const group = localGroups.find((g) => g.id === id);
    if (group && group.codes?.[0]) {
      await navigator.clipboard.writeText(group.codes[0].code);
    }
  };

  // Transform groups to include member count
  const groupsWithMemberCount = localGroups.map((group) => ({
    ...group,
    memberCount: group.user_groups?.[0]?.count || 0,
  }));

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verifying authentication...</p>
      </div>
    );
  }

  // Only render dashboard if authenticated
  if (!isAuthenticated) {
    return null; // This prevents flash of content before redirect completes
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        currentRole={currentRole} 
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <Header 
        currentRole={currentRole} 
        toggleMobileSidebar={toggleMobileSidebar}
      />

      <main className="flex-1 md:ml-64 ml-0 pt-16 px-4 container mx-auto max-w-7xl bg-background min-h-screen">
        <div className="py-6">
          <h2 className="text-2xl font-semibold mb-6">Dashboard Overview</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCard
              title="Total Groups"
              value={stats.totalGroups}
              icon={FolderClosed}
              description="Active Sharedauth groups"
            />
            <StatsCard
              title="Total Codes"
              value={stats.totalCodes}
              icon={KeyRound}
              description="Active Sharedauth codes"
            />
            {currentRole !== "User" && (
              <StatsCard
                title="Team Members"
                value={stats.totalMembers}
                icon={Users}
                description="Total team members"
              />
            )}
            {currentRole === "Admin" && (
              <StatsCard
                title="Shared Links"
                value={stats.totalSharedLinks}
                icon={Share2}
                description="Active shared links"
              />
            )}
          </div>
        </div>

        <AddCodeModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCode}
        />

        <ShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          groupId={selectedGroup?.id}
          groupName={selectedGroup?.title}
        />
      </main>
    </div>
  );
};

export default Home;
