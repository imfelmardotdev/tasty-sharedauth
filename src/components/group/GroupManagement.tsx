import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TotpCode from "./TotpCode";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Users, Copy, Share2, Trash2, Clock } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { type Role } from "@/lib/utils/roles";
import AddCodeModal from "../dashboard/AddCodeModal";
import ShareModal from "../dashboard/ShareModal";
import Timer from "./Timer";
import { useDatabase } from "@/contexts/DatabaseContext";
import { generateCode } from "@/lib/utils/2fa";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GroupManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentRole = localStorage.getItem("userRole") as Role;
  const userId = localStorage.getItem("userId");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sharingDetails, setSharedDetails] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { groups, loading, error, refreshData } = useDatabase();
  const group = groups.find((g) => g.id === id);

  const canDeleteGroup =
    currentRole === "Admin" ||
    currentRole === "Manager" ||
    group?.created_by === userId;

  const handleDeleteGroup = async () => {
    if (!group) return;

    try {
      const { data: codes, error: codesError } = await supabase
        .from("codes")
        .select("id")
        .eq("group_id", group.id);

      if (codesError) throw codesError;

      if (codes && codes.length > 0) {
        toast({
          title: "Cannot Delete Group",
          description: "Please delete all codes in this group before deleting the group.",
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", group.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
      navigate("/groups");
    } catch (err) {
      console.error("Error deleting group:", err);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleAddCode = async (values: any) => {
    if (!group) return;

    try {
      const { data: groupExists, error: groupError } = await supabase
        .from("groups")
        .select("id")
        .eq("id", group.id)
        .single();

      if (groupError || !groupExists) {
        toast({
          title: "Error",
          description: "This group no longer exists",
          variant: "destructive",
        });
        navigate("/groups");
        return;
      }

      const expirationMap = {
        "30s": 30,
        "1m": 60,
        "5m": 5 * 60,
        "15m": 15 * 60,
        "30m": 30 * 60,
        "1h": 60 * 60,
        "1d": 24 * 60 * 60,
      };

      const expirationSeconds = expirationMap[values.expiration as keyof typeof expirationMap] || 30;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationSeconds * 1000);

      const { error } = await supabase.from("codes").insert({
        group_id: group.id,
        name: values.name || "Untitled Code",
        code: values.code || generateCode(),
        secret: values.secret || null,
        notes: values.notes || "",
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      await refreshData();
      setIsAddModalOpen(false);
      toast({
        title: "Success",
        description: "Code added successfully",
      });
    } catch (err: any) {
      console.error("Error adding code:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentRole={currentRole} />
        <Header currentRole={currentRole} />
        <main className="flex-1 md:ml-64 ml-0 pt-16 container mx-auto max-w-7xl">
          <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentRole={currentRole} />
        <Header currentRole={currentRole} />
        <main className="flex-1 md:ml-64 ml-0 pt-16 container mx-auto max-w-7xl">
          <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
            <div className="text-destructive">
              Error loading group: {error.message}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentRole={currentRole} />
        <Header currentRole={currentRole} />
        <main className="flex-1 md:ml-64 ml-0 pt-16 container mx-auto max-w-7xl">
          <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
            <div className="text-destructive">Group not found</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentRole={currentRole} />
      <Header currentRole={currentRole} />

      <main className="flex-1 md:ml-64 ml-0 pt-16 container mx-auto max-w-7xl">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/groups")}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight break-words">{group.title}</h2>
                {group.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="flex items-center gap-1 sm:gap-1.5">
                <Users className="w-3 h-3" />
                <span>{group.member_count?.[0]?.count ?? 0} members</span>
              </Badge>
              {canDeleteGroup && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 ml-auto sm:ml-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Code</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {(!group.codes || group.codes.length === 0) && (
              <div className="col-span-full text-center py-8 sm:py-12 text-muted-foreground/80 text-sm sm:text-base">
                No codes found. Click "Add Code" to create one.
              </div>
            )}
            
            {group.codes?.map((code) => (
              <Card
                key={code.id}
                className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <div className="space-y-1.5">
                    {code.name && (
                      <h3 className="text-base font-semibold text-foreground">{code.name}</h3>
                    )}
                    <div className="text-xs text-muted-foreground/80 flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <span>Created {new Date(code.created_at).toLocaleString()}</span>
                      <Timer expiresAt={code.expires_at} codeId={code.id} groupId={group.id} />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                  <div className="space-y-4">
                    <div className="p-3 sm:p-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-inner">
                      <div className="text-lg sm:text-2xl lg:text-3xl font-mono tracking-[0.15em] sm:tracking-[0.25em] lg:tracking-[0.35em] text-primary font-bold text-center break-all">
                        {code.code}
                      </div>
                    </div>
                    
                    {code.notes && (
                      <p className="text-sm text-muted-foreground text-center px-2">
                        {code.notes}
                      </p>
                    )}

                    <div className="flex justify-center items-center gap-2 sm:gap-3">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex items-center gap-1.5 sm:gap-2 hover:bg-primary/10 hover:text-primary transition-colors py-2 h-auto"
                              onClick={() => {
                                navigator.clipboard.writeText(code.code);
                                toast({
                                  title: "Code copied!",
                                  description: "The code has been copied to your clipboard.",
                                });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Copy Code</span>
                              <span className="sm:hidden">Copy</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Copy code to clipboard
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex items-center gap-1.5 sm:gap-2 hover:bg-primary/10 hover:text-primary transition-colors py-2 h-auto"
                              onClick={() => {
                                setSharedDetails({
                                  id: group.id,
                                  title: `${group.title} - Code: ${code.code}`,
                                });
                                setIsShareModalOpen(true);
                              }}
                            >
                              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Share</span>
                              <span className="sm:hidden">Share</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Share this code
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex items-center gap-1.5 sm:gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors py-2 h-auto"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("codes")
                                    .delete()
                                    .eq("id", code.id);

                                  if (error) throw error;

                                  await refreshData();
                                  toast({
                                    title: "Success",
                                    description: "Code deleted successfully",
                                  });
                                } catch (err) {
                                  console.error("Error deleting code:", err);
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete code",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Delete</span>
                              <span className="sm:hidden">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Delete this code
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
          groupId={sharingDetails?.id}
          groupName={sharingDetails?.title}
        />

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{group.title}"? This action
                cannot be undone. All codes in this group will be permanently
                deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteGroup}
              >
                Delete Group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default GroupManagement;
