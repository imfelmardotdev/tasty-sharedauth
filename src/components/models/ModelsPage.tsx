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
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Share2, X, MoreVertical } from "lucide-react";
import { CircularProgress } from "@/components/ui/circular-progress";
import { getTimeRemaining } from "@/lib/utils/totp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Header from "../dashboard/Header";
import TOTPDisplay from "./TOTPDisplay";
import Sidebar from "../layout/Sidebar";
import FloatingActionBar from "@/components/ui/floating-action-bar";
import { type Role } from "@/lib/utils/roles";
import { Model } from "@/lib/db/types";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { getModels, createModel } from "@/lib/db/queries";
import AddModelModal from "./AddModelModal";
import EditModelModal from "./EditModelModal";
import { formSchema, type FormValues, parseFormData } from "./schema";
import ShareModelModal from "./ShareModelModal";
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
import { useToast } from "@/components/ui/use-toast";

const ModelsPage = () => {
  const currentRole = localStorage.getItem("userRole") as Role;
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharingModel, setSharingModel] = useState<Model | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchModels = async () => {
    try {
      console.log("Fetching models...");
      const data = await getModels();
      console.log("Models fetched:", data);
      if (data) {
        setModels(data);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Get session and fetch initial data
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("No active session");
          return;
        }
        await fetchModels();

        // Set up realtime subscription for both regular and admin updates
        if (supabase) {
          const channel = supabase
            .channel('model-updates')
            .on(
              'postgres_changes',
              {
                event: '*', // Listen for all events
                schema: 'public',
                table: 'models',
              },
              async (payload) => {
                console.log('Model update received:', payload);
                
                if (payload.eventType === 'UPDATE') {
                  // Fetch the complete model data to ensure we have all fields
                  const { data: updatedModel, error } = await supabase
                    .from('models')
                    .select('*')
                    .eq('id', payload.new.id)
                    .single();

                  if (!error && updatedModel) {
                    setModels(prevModels =>
                      prevModels.map(model =>
                        model.id === updatedModel.id ? updatedModel : model
                      )
                    );
                  }
                }
              }
            )
            .subscribe((status) => {
              console.log('Subscription status:', status);
            });

          // Set up periodic refresh to catch any missed updates
          const refreshInterval = setInterval(fetchModels, 30000);

          return () => {
            console.log('Cleaning up subscriptions');
            clearInterval(refreshInterval);
            supabase.removeChannel(channel);
          };
        }
      } catch (error) {
        console.error("Error setting up subscription:", error);
      }
    };

    setupSubscription();
  }, []);

  useEffect(() => {
    // Update the timer every second
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, []);

  const handleAddModel = async (values: FormValues) => {
    try {
      console.log("Adding model with values:", values);
      const modelData = {
        ...parseFormData(values),
        created_at: new Date().toISOString(),
      };
      console.log("Parsed model data:", modelData);
      await createModel(modelData);
      setIsAddModalOpen(false);
      fetchModels(); // Reload models after adding
      toast({
        title: "Model added",
        description: "The model was successfully added.",
      });
    } catch (err) {
      console.error("Error adding model:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      toast({
        variant: "destructive",
        title: "Error adding model",
        description: "Could not add the model. Please try again.",
      });
    }
  };

  const handleEditModel = async (values: FormValues) => {
    if (!editingModel) return;

    try {
      // Try with regular client first
      const { error } = await supabase
        .from("models")
        .update(parseFormData(values))
        .eq("id", editingModel.id);

      if (error) {
        if (error.message.includes('permission denied') && supabaseAdmin) {
          // Try with admin client if permission denied
          const { error: adminError } = await supabaseAdmin
            .from("models")
            .update(parseFormData(values))
            .eq("id", editingModel.id);

          if (adminError) {
            console.error("Admin update failed:", adminError);
            throw adminError;
          }
        } else {
          throw error;
        }
      }
      
      setEditingModel(null);
      fetchModels(); // Reload models after editing
      toast({
        title: "Model updated",
        description: "The model was successfully updated.",
      });
    } catch (err) {
      console.error("Error updating model:", err);
      toast({
        variant: "destructive",
        title: "Error updating model",
        description: "Could not update the model. Please try again.",
      });
    }
  };

  const handleDeleteModel = async () => {
    if (!deleteModelId) return;

    try {
      // Try with regular client first
      const { error } = await supabase
        .from("models")
        .delete()
        .eq("id", deleteModelId);

      if (error) {
        if (error.message.includes('permission denied') && supabaseAdmin) {
          // Try with admin client if permission denied
          const { error: adminError } = await supabaseAdmin
            .from("models")
            .delete()
            .eq("id", deleteModelId);

          if (adminError) {
            console.error("Admin delete failed:", adminError);
            throw adminError;
          }
        } else {
          throw error;
        }
      }

      setDeleteModelId(null);
      fetchModels(); // Reload models after deletion
      toast({
        title: "Model deleted",
        description: "The model was successfully deleted.",
      });
    } catch (err) {
      console.error("Error deleting model:", err);
      toast({
        variant: "destructive",
        title: "Error deleting model",
        description: "Could not delete the model. Please try again.",
      });
    }
  };

  if (currentRole !== "Admin" && currentRole !== "Manager") {
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

      <main className="flex-1 md:ml-64 ml-0 pt-16 px-2 sm:px-4 container mx-auto max-w-7xl bg-background min-h-screen">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-2xl font-semibold">Codes</h2>
                <Button
                  variant="default"
                  onClick={() => setIsAddModalOpen(true)}
                  className="hidden md:flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Code
                </Button>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto sm:mx-0">
              <div className="relative">
                <Input
                  placeholder="Search codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {filteredModels.map((model) => (
              <div key={model.id} className="bg-card rounded-lg p-4 shadow-sm border">
                {model.totp_secret && (
                  <div className="grid grid-cols-[1fr,auto] gap-4">
                    <div 
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const totpDisplay = document.querySelector(`[data-model-id="${model.id}"]`);
                          const code = totpDisplay?.textContent || '';
                          await navigator.clipboard.writeText(code);
                          toast({
                            title: "Code copied!",
                            description: "The 2FA code has been copied to your clipboard.",
                          });
                        } catch (err) {
                          console.error("Error copying to clipboard:", err);
                          toast({
                            title: "Error",
                            description: "Failed to copy code to clipboard",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="cursor-pointer select-none active:bg-accent/50 hover:bg-accent/25 rounded-lg transition-colors p-4 space-y-2"
                    >
                      <h3 className="font-semibold text-xl">{model.name}</h3>
                      <div className="flex items-center">
                        <span className="text-4xl font-mono tracking-wider">
                          <TOTPDisplay 
                            secret={model.totp_secret}
                            modelId={model.id}
                            modelName={model.name}
                          />
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{model.username}</p>
                    </div>

                    <div className="flex flex-col items-center justify-start gap-2 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSharingModel(model)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingModel(model)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteModelId(model.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <CircularProgress 
                          value={(timeRemaining / 30) * 100} 
                          className="h-12 w-12 text-primary absolute"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold">{timeRemaining}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!loading && models.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No codes found
              </div>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden lg:block border rounded-lg bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                 
                  <TableHead>2FA Code</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>{model.name}</TableCell>
                    <TableCell>{model.username}</TableCell>
                   
                    <TableCell>
                      <div className="flex items-center gap-4 w-[300px]">
                        {model.totp_secret ? (
                          <>
                            <div className="flex-1">
                              <TOTPDisplay 
                                secret={model.totp_secret}
                                modelId={model.id}
                                modelName={model.name}
                              />
                            </div>
                            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                              <CircularProgress 
                                value={(timeRemaining / 30) * 100} 
                                className="h-12 w-12 text-primary absolute"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-semibold">{timeRemaining}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">No 2FA configured</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {model.link && (
                        <a
                          href={model.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {model.link}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-slate-100"
                          onClick={() => setSharingModel(model)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-slate-100"
                          onClick={() => setEditingModel(model)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-100 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteModelId(model.id)}
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

        <AddModelModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddModel}
        />

        {editingModel && (
          <EditModelModal
            open={true}
            onClose={() => setEditingModel(null)}
            onSubmit={handleEditModel}
            model={editingModel}
          />
        )}

        <AlertDialog
          open={!!deleteModelId}
          onOpenChange={(open) => !open && setDeleteModelId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                model.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDeleteModel}
              >
                Delete Model
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <FloatingActionBar className="md:hidden">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Code
          </Button>
        </FloatingActionBar>

        <ShareModelModal 
          open={!!sharingModel}
          onOpenChange={(open) => !open && setSharingModel(null)}
          model={sharingModel || undefined}
        />
      </main>
    </div>
  );
};

export default ModelsPage;
