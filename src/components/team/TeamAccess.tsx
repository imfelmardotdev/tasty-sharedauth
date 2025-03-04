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
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { type Role, getPermissions } from "@/lib/utils/roles";
import { Model, User } from "@/lib/db/types";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  getAllUsers,
  createTeamMember,
  deleteTeamMember,
  updateTeamMember,
} from "@/lib/db/team";
import AddTeamMemberModal from "./AddTeamMemberModal";
import EditTeamMemberModal from "./EditTeamMemberModal";
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

const TeamAccess = ({ currentRole = "User" }: { currentRole: Role }) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<User[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async (page = 1) => {
    if (currentRole !== "Admin" && currentRole !== "Manager") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { users, total } = await getAllUsers(page);
      setMembers(users as User[]);
      setTotalMembers(total);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching team members:", err);
      setMembers([]);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    if (currentRole === "Admin" || currentRole === "Manager") {
      fetchMembers(1);
    }

    // Set up realtime subscription only if user has proper permissions
    if (supabase && (currentRole === "Admin" || currentRole === "Manager")) {
      const channel = supabase
        .channel('users-changes')
        .on<User>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users'
          },
          (payload) => {
            if (!isMounted) return;

            if (payload.eventType === 'INSERT') {
              setMembers((prev) => [...prev, payload.new]);
              setTotalMembers((prev) => prev + 1);
            } else if (payload.eventType === 'DELETE') {
              setMembers((prev) =>
                prev.filter((member) => member.id !== payload.old.id)
              );
              setTotalMembers((prev) => prev - 1);
            } else if (payload.eventType === 'UPDATE') {
              setMembers((prev) =>
                prev.map((member) =>
                  member.id === payload.new.id
                    ? { ...member, ...payload.new }
                    : member
                )
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
  }, [currentRole]);

  const handleAddMember = async (values: {
    name: string;
    email: string;
    password: string;
    role: Role;
    groupNames?: string[];
  }) => {
    try {
      const result = await createTeamMember(values);

      if (!result) {
        throw new Error("Failed to create team member");
      }

      toast({
        title: "Success",
        description:
          "Team member added successfully. They can now log in with their email and password.",
      });

      // Refresh the current page
      await fetchMembers(currentPage);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Error adding team member:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add team member",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = async (values: any) => {
    if (!editingMember) return;

    try {
  await updateTeamMember(editingMember.id, {
    name: values.name,
    email: values.email,
    role: values.role,
    groupNames: values.groupNames,
      });

      // Refresh the current page
      await fetchMembers(currentPage);
      setEditingMember(null);
    } catch (err) {
      console.error("Error updating team member:", err);
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;

    try {
      await deleteTeamMember(deletingMember);
      await fetchMembers(currentPage);
      setDeletingMember(null);
    } catch (err) {
      console.error("Error deleting team member:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentRole={currentRole} />
        <Header currentRole={currentRole} />
        <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl bg-background min-h-screen">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!loading && currentRole !== "Admin" && currentRole !== "Manager") {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentRole={currentRole} />
        <Header currentRole={currentRole} />
        <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl bg-background min-h-screen">
          <div className="flex justify-center items-center h-full">
            <div className="text-lg text-red-500">
              Access denied. You need Admin or Manager permissions to view this
              page.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentRole={currentRole} />
      <Header currentRole={currentRole} />

      <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl bg-background min-h-screen">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Team Members</h2>
            {(currentRole === "Admin" ||
              (currentRole === "Manager" &&
                getPermissions(currentRole).canManageUsers)) && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Team Member
              </Button>
            )}
          </div>

          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member: User) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "Admin" ? "default" : "secondary"
                          }
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.groupNames && member.groupNames.length > 0 ? (
                            member.groupNames.map(groupName => (
                              <Badge 
                                key={groupName} 
                                variant="outline"
                                className="bg-slate-100"
                              >
                                {groupName}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">No Groups</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <div className="flex justify-end gap-2">
                            {canManageMember(currentRole, member.role) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-slate-100"
                                onClick={() => setEditingMember(member)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteMember(currentRole, member.role) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-red-100 text-red-500 hover:text-red-600"
                                onClick={() => setDeletingMember(member.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalMembers > 20 && (
            <div className="flex justify-center mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => fetchMembers(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => fetchMembers(currentPage + 1)}
                disabled={currentPage * 20 >= totalMembers || loading}
              >
                Next
              </Button>
              <span className="py-2 px-3 text-sm text-muted-foreground">
                Page {currentPage} of {Math.ceil(totalMembers / 20)}
              </span>
            </div>
          )}
        </div>

        <AddTeamMemberModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddMember}
          currentRole={currentRole}
        />

        {editingMember && (
          <EditTeamMemberModal
            open={true}
            onClose={() => setEditingMember(null)}
            onSubmit={handleEditMember}
            currentRole={currentRole}
            member={editingMember}
          />
        )}

        <AlertDialog
          open={!!deletingMember}
          onOpenChange={(open) => !open && setDeletingMember(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                team member and remove all their access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDeleteMember}
              >
                Delete Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

const canManageMember = (currentRole: Role, memberRole: Role) => {
  if (currentRole === "Admin") return true;
  if (currentRole === "Manager" && memberRole === "User") return true;
  return false;
};

const canDeleteMember = (currentRole: Role, memberRole: Role) => {
  if (currentRole === "Admin") return true;
  if (currentRole === "Manager" && memberRole === "User") return true;
  return false;
};

export default TeamAccess;
