import * as z from "zod";
import { type Role } from "@/lib/utils/roles";

const getAvailableRoles = (currentRole: Role) => {
  const roleMap = {
    Admin: ["Admin", "Manager", "User"],
    Manager: ["User"],
    User: [],
  };
  return roleMap[currentRole];
};

export const createTeamMemberSchema = (currentRole: Role) => {
  const availableRoles = getAvailableRoles(currentRole);
  return z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.enum(availableRoles as [string, ...string[]]),
    groupNames: z.array(z.string()).default([]),
  });
};

export type TeamMemberFormData = z.infer<ReturnType<typeof createTeamMemberSchema>>;
