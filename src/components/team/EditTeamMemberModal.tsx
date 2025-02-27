import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { type Role } from "@/lib/utils/roles";
import { createTeamMemberSchema, type TeamMemberFormData } from "@/lib/schemas/team";
import { useDatabase } from "@/contexts/DatabaseContext";

interface EditTeamMemberModalProps {
  open?: boolean;
  onClose?: () => void;
  onSubmit?: (values: TeamMemberFormData) => void;
  currentRole: Role;
  member: {
    id: string;
    name: string;
    email: string;
    role: Role;
    groupNames?: string[];
  };
}

const EditTeamMemberModal = ({
  open = false,
  onClose = () => {},
  onSubmit = () => {},
  currentRole,
  member,
}: EditTeamMemberModalProps) => {
  const formSchema = createTeamMemberSchema(currentRole);
  
  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member.name,
      email: member.email,
      role: member.role,
      groupNames: member.groupNames || [],
    },
  });

  const handleSubmit = (values: TeamMemberFormData) => {
    onSubmit(values);
    onClose();
  };

  const availableRoles = {
    Admin: ["Admin", "Manager", "User"],
    Manager: ["User"],
    User: [],
  }[currentRole];

  const { groups } = useDatabase();
  const userId = localStorage.getItem("userId");

  // Filter groups to only show those created by the current user
  const availableGroups = groups
    .filter(group => group.created_by === userId)
    .map(group => group.title);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update the team member's information and role.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(currentRole === "Admin" || currentRole === "Manager") && (
              <FormField
                control={form.control}
                name="groupNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Groups</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const currentGroups = field.value || [];
                        if (!currentGroups.includes(value)) {
                          field.onChange([...currentGroups, value]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select groups" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(field.value || []).map((group) => (
                        <Badge
                          key={group}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            field.onChange(
                              field.value?.filter((g) => g !== group),
                            );
                          }}
                        >
                          {group}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamMemberModal;
