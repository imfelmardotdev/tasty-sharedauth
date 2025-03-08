import * as z from "zod";
import { type Role } from "@/lib/utils/roles";

const getAvailableRoles = (currentRole: Role | null) => {
  const roleMap = {
    Admin: ["Admin", "Manager", "User"],
    Manager: ["User"],
    User: [],
  };
  // Default to User if role is null/invalid
  return roleMap[currentRole || "User"] || [];
};

export const createTeamMemberSchema = (currentRole: Role | null) => {
  const availableRoles = getAvailableRoles(currentRole);
  return z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: availableRoles.length > 0 
      ? z.enum(availableRoles as [string, ...string[]]) 
      : z.literal("User"),
    groupNames: z.array(z.string()).default([]),
  });
};

export type TeamMemberFormData = z.infer<ReturnType<typeof createTeamMemberSchema>>;
