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
import { Plus, Pencil, Trash2 } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { type Role } from "@/lib/utils/roles";
import { Model } from "@/lib/db/types";
import { supabase } from "@/lib/supabase";
import { getModels, createModel } from "@/lib/db/queries";
import AddModelModal from "./AddModelModal";
import EditModelModal from "./EditModelModal";
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

const ModelsPage = () => {
  const currentRole = localStorage.getItem("userRole") as Role;
  const [models, setModels] = useState<Model[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await getModels();
        setModels(data);
      } catch (err) {
        console.error("Error fetching models:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();

    // Set up realtime subscription
    if (supabase) {
      const channel = supabase
        .channel("models-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "models",
          },
          () => fetchModels(),
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const handleAddModel = async (values: any) => {
    try {
      await createModel({
        username: values.username,
        name: values.name,
        code: values.code,
        link: values.link,
        created_at: new Date().toISOString(),
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error adding model:", err);
    }
  };

  const handleEditModel = async (values: any) => {
    if (!editingModel) return;

    try {
      const { error } = await supabase
        .from("models")
        .update({
          username: values.username,
          name: values.name,
          code: values.code,
          link: values.link,
        })
        .eq("id", editingModel.id);

      if (error) throw error;
      setEditingModel(null);
    } catch (err) {
      console.error("Error updating model:", err);
    }
  };

  const handleDeleteModel = async () => {
    if (!deleteModelId) return;

    try {
      const { error } = await supabase
        .from("models")
        .delete()
        .eq("id", deleteModelId);

      if (error) throw error;
      setDeleteModelId(null);
    } catch (err) {
      console.error("Error deleting model:", err);
    }
  };

  if (currentRole !== "Admin" && currentRole !== "Manager") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentRole={currentRole} />
      <Header currentRole={currentRole} />

      <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl bg-background min-h-screen">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Models</h2>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Model
            </Button>
          </div>

          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Code</TableHead>
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
      </main>
    </div>
  );
};

export default ModelsPage;
