import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GroupCode } from "@/lib/db/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Copy, Share2, Trash2, QrCode, Plus } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import FloatingActionBar from "@/components/ui/floating-action-bar";
import { type Role } from "@/lib/utils/roles";
import ShareModal from "../dashboard/ShareModal";
import AddCodeModal from "../dashboard/AddCodeModal";
import Timer from "../group/Timer";
import GroupTOTPDisplay from "../group/GroupTOTPDisplay";
import { useDatabase } from "@/contexts/DatabaseContext";
import { getGroupCodes, createGroupCode, deleteGroupCode } from "@/lib/db/queries";
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sharingDetails, setSharedDetails] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [groupCodes, setGroupCodes] = useState<GroupCode[]>([]);
  const [isAddCodeModalOpen, setIsAddCodeModalOpen] = useState(false);

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(prev => !prev);

  const { groups, loading, error, refreshData } = useDatabase();
  const group = groups.find((g) => g.id === id);
  
  // Add a state to force refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (id) {
      fetchGroupCodes();
    }
  }, [id, refreshTrigger]);

  const fetchGroupCodes = async () => {
    if (!id) return;
    
    try {
      const codes = await getGroupCodes(id);
      setGroupCodes(codes);
    } catch (err) {
      console.error("Error fetching group codes:", err);
      toast({
        title: "Error",
        description: "Failed to fetch group codes",
        variant: "destructive",
      });
    }
  };

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


  if (loading) {
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
        <main className="flex-1 pt-16 w-full">
          <div className="p-2 md:pl-[16.5rem] md:pr-6 md:pt-6">
            <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
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
        <main className="flex-1 pt-16 w-full">
          <div className="p-2 md:pl-[16.5rem] md:pr-6 md:pt-6">
            <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
              <div className="text-destructive">
                Error loading group: {error.message}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!group) {
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
        <main className="flex-1 pt-16 w-full">
          <div className="p-2 md:pl-[16.5rem] md:pr-6 md:pt-6">
            <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
              <div className="text-destructive">Group not found</div>
            </div>
          </div>
        </main>
      </div>
    );
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

      <main className="flex-1 pt-16 w-full">
        <div className="p-2 md:pl-[16.5rem] md:pr-6 md:pt-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/groups")}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold truncate">{group.title}</h2>
                {group.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{group.member_count?.[0]?.count ?? 0} members</span>
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Group Details</h3>
            <Button
              variant="default"
              onClick={() => setIsAddCodeModalOpen(true)}
              className="hidden md:flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Code
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-foreground">Group Information</h3>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Created By</h4>
                    <p className="text-base">{group.created_by}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Created At</h4>
                    <p className="text-base">{new Date(group.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Members</h4>
                    <p className="text-base">{group.member_count?.[0]?.count ?? 0} members</p>
                  </div>
                  {group.description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                      <p className="text-base">{group.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <h3 className="text-xl font-semibold mb-4">Authentication Codes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {groupCodes.map((code) => (
              <Card
                key={code.id}
                className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group h-[280px] sm:h-[320px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="pb-2 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      {code.name && (
                        <h3 className="text-base font-semibold text-foreground truncate">{code.name}</h3>
                      )}
                      
                      <div className="text-xs text-muted-foreground/80 flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="truncate">Created {new Date(code.created_at).toLocaleString()}</span>
                        {code.secret && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            <span>TOTP</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
                    <div className="w-full p-4 sm:p-6 bg-background/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-inner flex flex-col items-center justify-center gap-4">
                      {code.secret ? (
                        <GroupTOTPDisplay secret={code.secret} codeId={code.id} />
                      ) : (
                        <div>
                          <div className="text-2xl sm:text-4xl font-mono tracking-[0.25em] sm:tracking-[0.5em] text-primary font-bold break-all sm:break-normal">
                            {code.code}
                          </div>
                          {code.expires_at && (
                            <div className="mt-2">
                              <Timer expiresAt={code.expires_at} codeId={code.id} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {code.notes && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground text-center line-clamp-2">
                          {code.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex justify-center gap-2 sm:gap-3 bg-gradient-to-t from-background/90 to-transparent backdrop-blur-sm">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors px-2.5 h-8"
                          onClick={() => {
                            const codeElement = document.querySelector(
                              `[data-code-id="${code.id}"] .font-mono`
                            );
                            const textToCopy = codeElement ? codeElement.textContent || code.code : code.code;
                            navigator.clipboard.writeText(textToCopy);
                            toast({
                              title: "Code copied!",
                              description: "The code has been copied to your clipboard.",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="hidden sm:inline">Copy</span>
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
                          className="flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors px-2.5 h-8"
                          onClick={() => {
                            setSharedDetails({
                              id: group.id,
                              title: `${group.title} - Code: ${code.code}`,
                            });
                            setIsShareModalOpen(true);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Share</span>
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
                          className="flex items-center gap-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors px-2.5 h-8"
                          onClick={async () => {
                            try {
                              await deleteGroupCode(code.id);
                              await fetchGroupCodes();
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
                          <span className="hidden sm:inline">Delete</span>
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

            {groupCodes.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No codes found. Click "Add Code" to create one.
              </div>
            )}
          </div>
        </div>


        <AddCodeModal
          open={isAddCodeModalOpen}
          onClose={() => setIsAddCodeModalOpen(false)}
          onSubmit={async (values) => {
            try {
              // Create a new group code
              await createGroupCode({
                group_id: group.id,
                name: values.name || "Untitled Code",
                code: values.code || "",
                secret: values.secret || null,
                notes: values.notes || "",
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30000).toISOString(),
              });
              
              // Refresh the group codes
              await fetchGroupCodes();
              
              // Close the modal
              setIsAddCodeModalOpen(false);
              
              // Show success toast
              toast({
                title: "Success",
                description: "Code added successfully",
              });
            } catch (err) {
              console.error("Error adding code:", err);
              toast({
                title: "Error",
                description: "Failed to add code",
                variant: "destructive",
              });
            }
          }}
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

        <FloatingActionBar className="md:hidden">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => setIsAddCodeModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Code
          </Button>
        </FloatingActionBar>
      </main>
    </div>
  );
};

export default GroupManagement;
