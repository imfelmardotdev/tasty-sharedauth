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
import { Plus, Pencil, Trash2, Share2 } from "lucide-react";
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
  
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

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
          <h2 className="text-2xl font-semibold mb-6">Models</h2>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {models.map((model) => (
              <div key={model.id} className="border rounded-lg p-4 space-y-4 bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-lg">{model.name}</h3>
                    <p className="text-sm text-muted-foreground">{model.username}</p>
                  </div>
                  <div className="flex gap-2">
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
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Code</span>
                    <span className="font-medium">{model.code}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">2FA Code</span>
                    <div className="font-medium">
                      {model.totp_secret ? (
                        <TOTPDisplay 
                          secret={model.totp_secret}
                          modelId={model.id}
                        />
                      ) : (
                        <span className="text-gray-400">No 2FA configured</span>
                      )}
                    </div>
                  </div>
                  {model.link && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block">Link</span>
                      <a
                        href={model.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline break-all"
                      >
                        {model.link}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!loading && models.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No models found
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
                  <TableHead>Code</TableHead>
                  <TableHead>2FA Code</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>{model.name}</TableCell>
                    <TableCell>{model.username}</TableCell>
                    <TableCell>{model.code}</TableCell>
                    <TableCell>
                      {model.totp_secret ? (
                        <TOTPDisplay 
                          secret={model.totp_secret}
                          modelId={model.id}
                        />
                      ) : (
                        <span className="text-gray-400">No 2FA configured</span>
                      )}
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

        <FloatingActionBar>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Model
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
