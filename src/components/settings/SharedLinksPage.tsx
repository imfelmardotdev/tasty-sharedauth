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
import { 
  Copy, 
  ExternalLink, 
  Trash2, 
  FolderClosed,
  Database,
  Search
} from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import FloatingActionBar from "@/components/ui/floating-action-bar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import DeleteLinksDialog from "./DeleteLinksDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteShare, deleteManyShares } from "@/lib/db/queries";

interface SharedLinkBase {
  id: string;
  created_at: string;
  access_token: string;
  views_count: number;
  access_type: 'anyone' | 'specific';
}

interface SharedGroupLink extends SharedLinkBase {
  type: 'group';
  group_id: string;
  group: {
    id: string;
    title: string;
  };
}

interface SharedModelLink extends SharedLinkBase {
  type: 'model';
  model_id: string;
  model: {
    id: string;
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
  const [selected, setSelected] = useState<Selected>({
    links: new Set(),
    groupCount: 0,
    modelCount: 0
  });
  const { toast } = useToast();

  const fetchSharedLinks = async () => {
    try {
      // Fetch group shared links
      const { data: groupLinkData, error: groupLinkError } = await supabase
        .from("shared_links")
        .select(`
          id,
          created_at,
          access_token,
          views_count,
          access_type,
          group_id
        `)
        .order("created_at", { ascending: false });

      if (groupLinkError) throw groupLinkError;

      // Fetch model shared links
      const { data: modelLinkData, error: modelLinkError } = await supabase
        .from("shared_model_links")
        .select(`
          id,
          created_at,
          access_token,
          views_count,
          access_type,
          model_id
        `)
        .order("created_at", { ascending: false });

      if (modelLinkError) throw modelLinkError;

      // Fetch groups for group links
      const groupIds = [...new Set((groupLinkData || []).map(link => link.group_id))];
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id, title")
        .in("id", groupIds);

      // Create groups lookup map
      const groupsMap = new Map(
        (groupsData || []).map(group => [group.id, group])
      );

      // Fetch models for model links
      const modelIds = [...new Set((modelLinkData || []).map(link => link.model_id))];
      const { data: modelsData } = await supabase
        .from("models")
        .select("id, name, username")
        .in("id", modelIds);

      // Create models lookup map
      const modelsMap = new Map(
        (modelsData || []).map(model => [model.id, model])
      );

      // Transform group links
      const transformedGroupLinks: SharedLink[] = (groupLinkData || []).map(link => ({
        ...link,
        type: 'group' as const,
        group: groupsMap.get(link.group_id) || { id: link.group_id, title: 'Unknown Group' }
      }));

      // Transform model links
      const transformedModelLinks: SharedLink[] = (modelLinkData || []).map(link => ({
        ...link,
        type: 'model' as const,
        model: modelsMap.get(link.model_id) || { id: link.model_id, name: 'Unknown Model', username: '' }
      }));

      // Combine and sort all links by created_at
      const allLinks = [...transformedGroupLinks, ...transformedModelLinks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSharedLinks(allLinks);
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
  }, []);

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

  const handleCopyLink = async (link: SharedLink) => {
    const url = link.type === 'group'
      ? `${window.location.origin}/share/group/${link.group_id}?token=${link.access_token}`
      : `${window.location.origin}/share/model/${link.model_id}?token=${link.access_token}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Success",
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
      ? `${window.location.origin}/share/group/${link.group_id}?token=${link.access_token}`
      : `${window.location.origin}/share/model/${link.model_id}?token=${link.access_token}`;
    
    window.open(url, '_blank');
  };

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const toggleSelection = (link: SharedLink) => {
    const newSelected = new Set(selected.links);
    if (newSelected.has(link.id)) {
      newSelected.delete(link.id);
    } else {
      newSelected.add(link.id);
    }

    // Count selected items by type
    const groupCount = sharedLinks.filter(l => 
      l.type === 'group' && newSelected.has(l.id)
    ).length;
    const modelCount = sharedLinks.filter(l => 
      l.type === 'model' && newSelected.has(l.id)
    ).length;

    setSelected({
      links: newSelected,
      groupCount,
      modelCount
    });
  };

  const filteredLinks = sharedLinks.filter(link => {
    const matchesSearch = searchTerm.toLowerCase().trim() === "" || 
      (link.type === "group" && link.group.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (link.type === "model" && link.model.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || link.type === filterType;
    
    return matchesSearch && matchesType;
  });

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex justify-between items-center w-full md:w-auto">
              <h2 className="text-xl sm:text-2xl font-semibold">Shared Links</h2>
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

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl">
              <Button
                variant={filterType === "group" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(filterType === "group" ? "all" : "group")}
                className="whitespace-nowrap"
              >
                <FolderClosed className="w-4 h-4 mr-1" />
                Groups
              </Button>
              <Button
                variant={filterType === "model" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(filterType === "model" ? "all" : "model")}
                className="whitespace-nowrap"
              >
                <Database className="w-4 h-4 mr-1" />
                Models
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search links..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border bg-background text-sm"
                />
              </div>
            </div>
          </div>

            {/* Table content using filteredLinks */}
            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredLinks.length > 0 && selected.links.size === filteredLinks.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const allIds = new Set(filteredLinks.map(link => link.id));
                            const groupCount = filteredLinks.filter(l => l.type === 'group').length;
                            const modelCount = filteredLinks.filter(l => l.type === 'model').length;
                            setSelected({ links: allIds, groupCount, modelCount });
                          } else {
                            setSelected({ links: new Set(), groupCount: 0, modelCount: 0 });
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.links.has(link.id)}
                          onCheckedChange={() => toggleSelection(link)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.type === 'group' ? 'default' : 'secondary'}>
                          {link.type === 'group' ? 'Group' : 'Model'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {link.type === 'group' ? link.group.title : link.model.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.access_type === 'anyone' ? 'outline' : 'secondary'}>
                          {link.access_type === 'anyone' ? 'Anyone' : 'Specific Users'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {link.views_count || 0}
                      </TableCell>
                      <TableCell>{new Date(link.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(link)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLink(link)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
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
                              }
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <FloatingActionBar className="md:hidden">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant={filterType === "group" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setFilterType(filterType === "group" ? "all" : "group")}
            >
              <FolderClosed className="w-4 h-4 mr-1" />
              Groups
            </Button>
            <Button
              variant={filterType === "model" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setFilterType(filterType === "model" ? "all" : "model")}
            >
              <Database className="w-4 h-4 mr-1" />
              Models
            </Button>
            <div className="relative flex-[2]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-md border bg-background text-sm"
              />
            </div>
          </div>
        </FloatingActionBar>

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
      </main>
    </div>
  );
};

export default SharedLinksPage;
