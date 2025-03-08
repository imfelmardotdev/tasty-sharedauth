import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Trash2, CheckSquare, Square } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import DeleteLinksDialog from "./DeleteLinksDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteShare, deleteManyShares } from "@/lib/db/queries";

interface SharedLinkBase {
  id: string;
  created_by: string;
  access_token: string;
  expires_at: string | null;
  access_type: string;
  one_time_view: boolean;
  created_at: string;
  views_count: number;
  user?: {
    name: string;
    email: string;
  };
}

interface SharedGroupLink extends SharedLinkBase {
  type: 'group';
  group_id: string;
  group: {
    title: string;
  };
}

interface SharedModelLink extends SharedLinkBase {
  type: 'model';
  model_id: string;
  model: {
    name: string;
    username: string;
  };
}

type SharedLink = SharedGroupLink | SharedModelLink;

interface Selected {
  links: Set<string>;
  groupCount: number;
  modelCount: number;
}

const SharedLinksPage = () => {
  const currentRole = localStorage.getItem("userRole") as "Admin" | "Manager" | "User";
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLink, setDeletingLink] = useState<SharedLink | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "group" | "model">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "views">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const filteredAndSortedLinks = sharedLinks
    .filter(link => {
    const matchesSearch = searchTerm.toLowerCase().trim() === "" || 
      (link.type === "group" && link.group.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (link.type === "model" && link.model.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || link.type === filterType;
    
    return matchesSearch && matchesType;
  });
  
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);
  const [selected, setSelected] = useState<Selected>({
    links: new Set(),
    groupCount: 0,
    modelCount: 0
  });
  const { toast } = useToast();

  const fetchSharedLinks = async () => {
    try {
      // Fetch group shares
      const { data: linkData, error: linkError } = await supabase
        .from("shared_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (linkError) throw linkError;

      // Fetch groups for those links
      const groupIds = [...new Set((linkData || []).map(link => link.group_id))];
      const { data: groupsData, error: groupsError } = groupIds.length > 0 
        ? await supabase
            .from("groups")
            .select("id, title")
            .in("id", groupIds)
        : { data: [], error: null };

      if (groupsError) throw groupsError;

      // Create groups lookup map
      const groupsMap = new Map(
        (groupsData || []).map(group => [group.id, group])
      );

      // Fetch model shares
      const { data: modelLinkData, error: modelLinkError } = await supabase
        .from("shared_model_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (modelLinkError) throw modelLinkError;

      // Fetch models for those links
      const modelIds = [...new Set((modelLinkData || []).map(link => link.model_id))];
      const { data: modelsData, error: modelsError } = modelIds.length > 0
        ? await supabase
            .from("models")
            .select("id, name, username")
            .in("id", modelIds)
        : { data: [], error: null };

      if (modelsError) throw modelsError;

      // Create models lookup map
      const modelsMap = new Map(
        (modelsData || []).map(model => [model.id, model])
      );

      // Get all unique user IDs from both types of links
      const userIds = [...new Set([
        ...(linkData || []).map(link => link.created_by),
        ...(modelLinkData || []).map(link => link.created_by)
      ])];

      // Fetch user details
      const { data: usersData, error: usersError } = userIds.length > 0
        ? await supabase
            .from('users')
            .select('id, email, name')
            .in('id', userIds)
        : { data: [], error: null };

      if (usersError) throw usersError;

      // Create user lookup map
      const userMap = new Map(
        (usersData || []).map(user => [user.id, user])
      );

      // Transform group links
      const transformedGroupLinks: SharedLink[] = (linkData || []).map(link => ({
        ...link,
        type: 'group' as const,
        group: groupsMap.get(link.group_id) || { title: 'Unknown Group', id: link.group_id },
        user: {
          email: userMap.get(link.created_by)?.email || 'Unknown',
          name: userMap.get(link.created_by)?.name || userMap.get(link.created_by)?.email?.split('@')[0] || 'Unknown'
        }
      }));

      // Transform model links
      const transformedModelLinks: SharedLink[] = (modelLinkData || []).map(link => ({
        ...link,
        type: 'model' as const,
        model: modelsMap.get(link.model_id) || { name: 'Unknown Model', id: link.model_id, username: 'unknown' },
        user: {
          email: userMap.get(link.created_by)?.email || 'Unknown',
          name: userMap.get(link.created_by)?.name || userMap.get(link.created_by)?.email?.split('@')[0] || 'Unknown'
        }
      }));

      // Combine and sort by creation date
      const combined = [...transformedGroupLinks, ...transformedModelLinks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSharedLinks(combined);
      // Clear selection when links are refreshed
      setSelected({
        links: new Set(),
        groupCount: 0,
        modelCount: 0
      });
    } catch (err) {
      console.error("Error fetching shared links:", err);
      toast({
        title: "Error",
        description: "Failed to fetch shared links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedLinks();

    // Set up realtime subscriptions for both tables
    const groupChannel = supabase
      .channel("shared-links-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_links",
        },
        () => fetchSharedLinks()
      )
      .subscribe();

    const modelChannel = supabase
      .channel("shared-model-links-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_model_links",
        },
        () => fetchSharedLinks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(groupChannel);
      supabase.removeChannel(modelChannel);
    };
  }, []);

  const handleCopyLink = async (link: SharedLink) => {
    const url = link.type === 'group'
      ? `${window.location.origin}/share/${link.group_id}?token=${link.access_token}`
      : `${window.location.origin}/share/model/${link.model_id}?token=${link.access_token}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleOpenLink = (link: SharedLink) => {
    const url = link.type === 'group'
      ? `${window.location.origin}/share/${link.group_id}?token=${link.access_token}`
      : `${window.location.origin}/share/model/${link.model_id}?token=${link.access_token}`;
    
    window.open(url, '_blank');
  };

  const handleSingleDelete = async (link: SharedLink) => {
    try {
      console.log('Deleting single link:', link);
      const result = await deleteShare(link.type, link.id);
      
      if (result) {
        toast({
          title: "Success",
          description: "Share link deleted successfully"
        });
        await fetchSharedLinks();
      } else {
        throw new Error("Failed to delete share link");
      }
    } catch (err) {
      console.error("Failed to delete link:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete the share link",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setDeletingLink(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selected.links.size === 0) return;

    try {
      const groupLinks: string[] = [];
      const modelLinks: string[] = [];
      
      sharedLinks.forEach(link => {
        if (selected.links.has(link.id)) {
          if (link.type === 'group') {
            groupLinks.push(link.id);
          } else {
            modelLinks.push(link.id);
          }
        }
      });

      const shares = [];
      if (groupLinks.length > 0) shares.push({ type: 'group' as const, ids: groupLinks });
      if (modelLinks.length > 0) shares.push({ type: 'model' as const, ids: modelLinks });

      console.log('Deleting multiple links:', shares);
      const result = await deleteManyShares(shares);

      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully deleted ${result.deletedCount} shared ${result.deletedCount === 1 ? 'link' : 'links'}`
        });
        await fetchSharedLinks();
      } else {
        throw new Error(result.errors.join('\n'));
      }
    } catch (err) {
      console.error("Failed to delete links:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete the selected links",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setDeletingLink(null);
    }
  };

  const toggleSelectAll = () => {
    if (selected.links.size === sharedLinks.length) {
      // Deselect all
      setSelected({
        links: new Set(),
        groupCount: 0,
        modelCount: 0
      });
    } else {
      // Select all
      const newLinks = new Set(sharedLinks.map(link => link.id));
      const counts = sharedLinks.reduce(
        (acc, link) => {
          if (link.type === 'group') acc.groupCount++;
          else acc.modelCount++;
          return acc;
        },
        { groupCount: 0, modelCount: 0 }
      );
      
      setSelected({
        links: newLinks,
        ...counts
      });
    }
  };

  const toggleSelect = (link: SharedLink) => {
    const newLinks = new Set(selected.links);
    let { groupCount, modelCount } = selected;

    if (newLinks.has(link.id)) {
      newLinks.delete(link.id);
      if (link.type === 'group') groupCount--;
      else modelCount--;
    } else {
      newLinks.add(link.id);
      if (link.type === 'group') groupCount++;
      else modelCount++;
    }

    setSelected({
      links: newLinks,
      groupCount,
      modelCount
    });
  };

  if (currentRole !== "Admin") {
    return <div>Access denied</div>;
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

      <main className="flex-1 md:ml-64 ml-0 pt-16 px-2 sm:px-4 container mx-auto max-w-7xl">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h2 className="text-xl sm:text-2xl font-semibold">Shared Links</h2>
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search links..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                    aria-label="Search links"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "group" | "model")}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                  aria-label="Filter by type"
                >
                  <option value="all">All Types</option>
                  <option value="group">Groups Only</option>
                  <option value="model">Models Only</option>
                </select>
              </div>
              <div className="flex justify-end">
                {selected.links.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeletingLink(null);
                      setShowDeleteDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete Selected</span>
                    <span className="sm:hidden">Delete</span>
                    <span className="ml-1">({selected.links.size})</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-lg bg-card overflow-x-auto -mx-3 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] whitespace-nowrap">
                      <Checkbox
                        checked={selected.links.size === sharedLinks.length && sharedLinks.length > 0}
                        onClick={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap w-[80px]">Type</TableHead>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[180px]">Share Link</TableHead>
                    <TableHead className="min-w-[150px]">Created By</TableHead>
                    <TableHead className="min-w-[120px]">Access Type</TableHead>
                    <TableHead className="whitespace-nowrap w-[100px]">Expires</TableHead>
                    <TableHead className="whitespace-nowrap w-[80px]">Views</TableHead>
                    <TableHead className="whitespace-nowrap w-[100px]">Created</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharedLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.links.has(link.id)}
                          onClick={() => toggleSelect(link)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.type === 'group' ? 'default' : 'secondary'}>
                          {link.type === 'group' ? 'Group' : 'Model'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {link.type === 'group' 
                          ? link.group.title
                          : link.model.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(link)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenLink(link)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{link.user?.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {link.user?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{link.access_type}</Badge>
                          {link.one_time_view && (
                            <Badge variant="secondary">One-time use</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {link.expires_at ? (
                          <span className={`${new Date(link.expires_at) < new Date() ? "text-destructive" : ""}`}>
                            {new Date(link.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell>{link.views_count}</TableCell>
                      <TableCell>
                        {new Date(link.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-100 text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingLink(link);
                            setSelected({
                              links: new Set([link.id]),
                              groupCount: link.type === 'group' ? 1 : 0,
                              modelCount: link.type === 'model' ? 1 : 0
                            });
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && sharedLinks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No shared links found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DeleteLinksDialog
              open={showDeleteDialog}
              onOpenChange={(open) => {
                if (!open) {
                  setShowDeleteDialog(false);
                  setDeletingLink(null);
                }
              }}
              onConfirm={async () => {
                if (deletingLink) {
                  await handleSingleDelete(deletingLink);
                } else {
                  await handleBatchDelete();
                }
              }}
              selectedCount={selected.links.size}
              groupCount={selected.groupCount}
              modelCount={selected.modelCount}
              isSingleDelete={!!deletingLink}
              itemType={deletingLink?.type}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SharedLinksPage;
