import React, { useState } from "react";
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
      // Check if group has any codes first
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
      // Check if group still exists
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

      const expirationSeconds = expirationMap[values.expiration] || 30;
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

      if (error) {
        console.error("Error adding code:", error);
        throw error;
      }

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
        <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl">
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
        <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl">
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
        <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl">
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

      <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/groups")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-semibold">{group.title}</h2>
                {group.description && (
                  <p className="text-sm text-muted-foreground">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
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
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Code
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.codes?.map((code) => (
              <Card
                key={code.id}
                className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group h-[320px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="pb-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      {code.name && (
                        <h3 className="text-base font-semibold text-foreground">{code.name}</h3>
                      )}
                      
                      <div className="text-xs text-muted-foreground/80 flex items-center gap-2">
                        <span>Created {new Date(code.created_at).toLocaleString()}</span>
                        <Timer expiresAt={code.expires_at} codeId={code.id} groupId={group.id} />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="w-full p-6 bg-background/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-inner flex justify-center">
                      <div className="text-4xl font-mono tracking-[0.5em] text-primary font-bold">
                        {code.code}
                      </div>
                    </div>
                    
                    {code.notes && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground text-center">
                          {code.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-3 bg-gradient-to-t from-background/90 to-transparent backdrop-blur-sm">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(code.code);
                            toast({
                              title: "Code copied!",
                              description: "The code has been copied to your clipboard.",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-medium">
                        <p>Copy code to clipboard</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => {
                            setSharedDetails({
                              id: group.id,
                              title: `${group.title} - Code: ${code.code}`,
                            });
                            setIsShareModalOpen(true);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-medium">
                        <p>Share this code</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
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
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-medium">
                        <p>Delete this code</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </Card>
            ))}

            {(!group.codes || group.codes.length === 0) && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No codes found. Click "Add Code" to create one.
              </div>
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
