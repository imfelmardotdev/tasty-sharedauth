import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import FloatingActionBar from "@/components/ui/floating-action-bar";
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

const TeamAccess = ({ currentRole = "User" }: { currentRole?: Role | null }) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<User[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState("");
  
  // Ensure we have a valid role, defaulting to User if null/undefined
  const role = currentRole || "User";

  const availableGroups = useMemo(() => 
    Array.from(new Set(members.flatMap(m => m.groupNames || []))).sort()
  , [members]);

  const filteredMembers = useMemo(() => {
    let filtered = members;
    
    // Apply name search filter
    if (nameSearchQuery) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(nameSearchQuery.toLowerCase())
      );
    }
    
    // Apply group filter
    if (selectedGroups.length > 0) {
      filtered = filtered.filter(member => 
        member.groupNames?.some(group => selectedGroups.includes(group))
      );
    }
    
    return filtered;
  }, [members, selectedGroups, nameSearchQuery]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const fetchMembers = async (page = 1) => {
    if (role !== "Admin" && role !== "Manager") {
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
    if (role === "Admin" || role === "Manager") {
      fetchMembers(1);
    }

    // Set up realtime subscription only if user has proper permissions
    if (supabase && (role === "Admin" || role === "Manager")) {
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
  }, [role]);

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
        <Sidebar 
          currentRole={role} 
          isMobileSidebarOpen={isMobileSidebarOpen}
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <Header 
          currentRole={role} 
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <main className="flex-1 md:ml-64 ml-0 pt-16 px-2 sm:px-4 container mx-auto max-w-7xl bg-background min-h-screen">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!loading && role !== "Admin" && role !== "Manager") {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar 
          currentRole={role} 
          isMobileSidebarOpen={isMobileSidebarOpen}
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <Header 
          currentRole={role} 
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <main className="flex-1 md:ml-64 ml-0 pt-16 px-2 sm:px-4 container mx-auto max-w-7xl bg-background min-h-screen">
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
      <Sidebar 
        currentRole={role}
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <Header 
        currentRole={role}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      <main className="flex-1 md:ml-64 ml-0 pt-16 px-2 sm:px-4 container mx-auto max-w-7xl bg-background min-h-screen">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-xl sm:text-2xl font-semibold">Team Members</h2>
              <Button
                variant="default"
                onClick={() => setIsAddModalOpen(true)}
                className="hidden md:flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </Button>
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <div className="flex-1 sm:w-[200px]">
                <div className="relative">
                  <Input
                    placeholder="Search by name..."
                    value={nameSearchQuery}
                    onChange={(e) => setNameSearchQuery(e.target.value)}
                  />
                  {nameSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                      onClick={() => setNameSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-[200px]">
                <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "justify-between",
                      selectedGroups.length > 0 && "text-primary"
                    )}
                  >
                    {selectedGroups.length > 0
                      ? `${selectedGroups.length} group${selectedGroups.length === 1 ? '' : 's'} selected`
                      : "Filter by groups"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search groups..." />
                    <CommandEmpty>No groups found.</CommandEmpty>
                    <CommandGroup>
                      {availableGroups.map((group) => (
                        <CommandItem
                          key={group}
                          onSelect={() => {
                            setSelectedGroups(current =>
                              current.includes(group)
                                ? current.filter(g => g !== group)
                                : [...current, group]
                            )
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedGroups.includes(group)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {group}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              </div>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {members.length === 0 || filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            ) : (
              filteredMembers.map((member: User) => (
                <div key={member.id} className="border rounded-lg p-4 space-y-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {canManageMember(role, member.role) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-slate-100"
                          onClick={() => setEditingMember(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteMember(role, member.role) && (
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

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block">Role</span>
                      <Badge
                        variant={member.role === "Admin" ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Groups</span>
                      <div className="flex flex-wrap gap-1 mt-1">
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden lg:block border rounded-lg bg-card overflow-x-auto -mx-3 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Role</TableHead>
                  <TableHead className="min-w-[150px]">Groups</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 || filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member: User) => (
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
                          {canManageMember(role, member.role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-slate-100"
                              onClick={() => setEditingMember(member)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteMember(role, member.role) && (
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalMembers > 20 && (
            <div className="flex flex-col sm:flex-row justify-center items-center mt-4 gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMembers(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMembers(currentPage + 1)}
                  disabled={currentPage * 20 >= totalMembers || loading}
                >
                  Next
                </Button>
              </div>
              <span className="text-sm text-muted-foreground mt-2 sm:mt-0">
                Page {currentPage} of {Math.ceil(totalMembers / 20)}
              </span>
            </div>
          )}
        </div>

        {(role === "Admin" ||
          (role === "Manager" && getPermissions(role).canManageUsers)) && (
          <FloatingActionBar className="md:hidden">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Member
            </Button>
          </FloatingActionBar>
        )}

        <AddTeamMemberModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddMember}
          currentRole={role}
        />

        {editingMember && (
          <EditTeamMemberModal
            open={true}
            onClose={() => setEditingMember(null)}
            onSubmit={handleEditMember}
            currentRole={role}
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

const canManageMember = (currentRole: Role | null, memberRole: Role) => {
  const role = currentRole || "User";
  if (role === "Admin") return true;
  if (role === "Manager" && memberRole === "User") return true;
  return false;
};

const canDeleteMember = (currentRole: Role | null, memberRole: Role) => {
  const role = currentRole || "User";
  if (role === "Admin") return true;
  if (role === "Manager" && memberRole === "User") return true;
  return false;
};

export default TeamAccess;
