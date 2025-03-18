import React, { useState, useEffect, useCallback } from "react";
import { getPermissions, type Role } from "@/lib/utils/roles";
import Sidebar from "./layout/Sidebar";
import { generateCode } from "@/lib/utils/2fa";
import Header from "./dashboard/Header";
import CodeGroupGrid from "./dashboard/CodeGroupGrid";
import FloatingActionBar from "./ui/floating-action-bar";
import AddGroupModal from "./dashboard/AddGroupModal";
import AddCodeModal from "./dashboard/AddCodeModal";
import ShareModal from "./dashboard/ShareModal";
import AddModelModal from "./models/AddModelModal";
import StatsCard from "./dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Plus, Users, FolderClosed, Share2, PuzzleIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDatabase } from "@/contexts/DatabaseContext";
import { createGroup, createGroupCode } from "@/lib/db/queries";
import { supabase } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { Loader2 } from "lucide-react";

interface HomeProps {
  initialRole?: Role;
}

const Home = ({ initialRole = "User" }: HomeProps) => {
  // Use the improved auth guard
  const { loading: authLoading, isAuthenticated } = useAuthGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [currentRole, setCurrentRole] = useState<Role>(
    (localStorage.getItem("userRole") as Role) || initialRole,
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
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

  const { groups, models, loading, error, refreshData } = useDatabase();
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

  // Refresh data when dashboard is visited
  useEffect(() => {
    const refreshDashboard = async () => {
      if (location.pathname === '/') {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
      }
    };
    refreshDashboard();
  }, [location, refreshData]);

  // Update stats when groups change
  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;

      try {
        // Get total members
        const { count: membersCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        // Get total shared links only for admin users
        let totalSharedLinks = 0;
        if (currentRole === "Admin") {
          const { count: groupLinksCount } = await supabase
            .from("shared_links")
            .select("*", { count: "exact", head: true });

          const { count: modelLinksCount } = await supabase
            .from("shared_model_links")
            .select("*", { count: "exact", head: true });

          totalSharedLinks = (groupLinksCount || 0) + (modelLinksCount || 0);
        }

        // Calculate total codes from group_codes
        const totalCodes = groups.reduce(
          (sum, group) => sum + (group.group_codes?.length || 0),
          0,
        );

        setStats({
          totalGroups: groups.length,
          totalCodes,
          totalMembers: membersCount || 0,
          totalSharedLinks: totalSharedLinks,
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

      await createGroupCode({
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
    if (group && group.group_codes?.[0]) {
      await navigator.clipboard.writeText(group.group_codes[0].code);
    }
  };

  // Transform groups to include member count
  const groupsWithMemberCount = localGroups.map((group) => ({
    ...group,
    memberCount: group.user_groups?.[0]?.count || 0,
  }));

  // Show loading state while checking auth or refreshing data
  if (authLoading || isRefreshing) {
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
              description={<>with {stats.totalCodes} total sharedauth codes found </>}
              onClick={() => navigate('/groups')}
            />
            {currentRole !== "User" && (
              <StatsCard
                title="Team Members"
                value={stats.totalMembers}
                icon={Users}
                description="Total team members"
                onClick={() => navigate('/team')}
              />
            )}
            {currentRole !== "User" && (
              <StatsCard
                title="Extensions"
                value={models.length}
                icon={PuzzleIcon}
                description="Extensions are models or accounts that automate 2FA input in Chrome and other browsers"
                onClick={() => navigate('/models')}
              />
            )}
            {currentRole === "Admin" && (
              <StatsCard
                title="Shared Links"
                value={stats.totalSharedLinks}
                icon={Share2}
                description="Active shared links"
                onClick={() => navigate('/shared-links')}
              />
            )}
          </div>
        </div>

        <FloatingActionBar className="md:hidden">
          {getPermissions(currentRole).canCreateGroups && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => setIsAddGroupModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Group
            </Button>
          )}
          {getPermissions(currentRole).canCreateGroups && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => setIsAddModelModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Code
            </Button>
          )}
        </FloatingActionBar>

        <AddCodeModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCode}
        />

        <AddGroupModal
          open={isAddGroupModalOpen}
          onClose={() => setIsAddGroupModalOpen(false)}
          onSubmit={() => {}}
        />

        <AddModelModal
          open={isAddModelModalOpen}
          onClose={() => setIsAddModelModalOpen(false)}
          onSubmit={async (values) => {
            try {
              await navigate('/models');
            } catch (err) {
              console.error("Error navigating to models:", err);
            }
          }}
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
