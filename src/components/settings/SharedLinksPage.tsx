import React, { useState, useEffect } from "react";
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
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserMetadata {
  name?: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  raw_user_meta_data: UserMetadata;
}

interface SharedLinkData {
  id: string;
  group_id: string;
  code_id?: string;
  created_by: string;
  access_token: string;
  expires_at: string | null;
  access_type: string;
  one_time_view: boolean;
  created_at: string;
  views_count: number;
  group: {
    title: string;
  };
}

interface SharedLink extends SharedLinkData {
  user: {
    name: string;
    email: string;
  };
}

const SharedLinksPage = () => {
  const currentRole = localStorage.getItem("userRole") as "Admin" | "Manager" | "User";
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSharedLinks = async () => {
    try {
      // First get the shared links with group info
      // First, get all shared links
      const { data: linksData, error: linksError } = await supabase
        .from("shared_links")
        .select()
        .order("created_at", { ascending: false });

      if (linksError) throw linksError;
      if (!linksData) return;

      // Get all unique group IDs
      const groupIds = [...new Set(linksData.map(link => link.group_id))];

      // Fetch group data
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("id, title")
        .in("id", groupIds);

      if (groupsError) throw groupsError;

      // Create a map of group data
      const groupMap = new Map(
        (groupsData || []).map(group => [group.id, group])
      );

      // Transform the links data to include group info
      const linksWithGroups = linksData.map(link => ({
        ...link,
        group: {
          title: groupMap.get(link.group_id)?.title || 'Unknown Group'
        }
      }));

      if (linksError) throw linksError;
      if (!linksData) return;

      // Then get user details for all creators from users
      const userIds = [...new Set(linksData.map(link => link.created_by))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Map users to their IDs for easy lookup
      const userMap = new Map(
        (usersData || []).map(user => [user.id, user])
      );

      // Transform the data to include user details
      const transformedData = linksData.map(link => {
        const user = userMap.get(link.created_by);
        return {
          ...link,
          user: {
            email: user?.email || 'Unknown',
            name: user?.name || user?.email?.split('@')[0] || 'Unknown'
          }
        };
      });

      setSharedLinks(transformedData);
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

    // Set up realtime subscription
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCopyLink = async (link: SharedLink) => {
    const url = `${window.location.origin}/share/${link.group_id}${link.code_id ? `/${link.code_id}` : ''}?token=${link.access_token}`;
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
    const url = `${window.location.origin}/share/${link.group_id}${link.code_id ? `/${link.code_id}` : ''}?token=${link.access_token}`;
    window.open(url, '_blank');
  };

  const handleDeleteLink = async () => {
    if (!deletingLinkId) return;

    try {
      console.log('Attempting to delete link:', deletingLinkId);
      
      // Delete directly with proper policy
      const { error } = await supabase
        .from("shared_links")
        .delete()
        .eq("id", deletingLinkId)
        .throwOnError(); // Force error if delete fails

      console.log('Delete response:', error ? 'Error' : 'Success');

      if (error) throw error;

      // Wait a moment for the delete to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update UI
      setSharedLinks(current => 
        current.filter(link => link.id !== deletingLinkId)
      );

      toast({
        title: "Success",
        description: "Link has been deleted"
      });
    } catch (err) {
      console.error("Failed to delete link:", err);
      toast({
        title: "Error",
        description: "Failed to delete the link",
        variant: "destructive"
      });
    } finally {
      setDeletingLinkId(null);
    }
  };

  if (currentRole !== "Admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentRole={currentRole} />
      <Header currentRole={currentRole} />

      <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl">
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Shared Links</h2>

          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Share Link</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Access Type</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{link.group?.title}</TableCell>
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
                        onClick={() => setDeletingLinkId(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && sharedLinks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No shared links found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <AlertDialog
          open={!!deletingLinkId}
          onOpenChange={(open) => !open && setDeletingLinkId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the shared link and revoke access for anyone using it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDeleteLink}
              >
                Delete Link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default SharedLinksPage;
