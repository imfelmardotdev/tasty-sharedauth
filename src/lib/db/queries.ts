import { supabase } from "../supabase";
import { User, Group, UserGroup, Code, Model } from "./types";
import { type Role } from "@/lib/utils/roles";
import { generateCode } from "@/lib/utils/2fa";

// Mock data for models
const mockModels = [
  {
    id: "1",
    username: "admin@google.com",
    name: "Gmail Account",
    code: "123456",
    link: "https://admin.google.com",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    username: "github-admin",
    name: "GitHub",
    code: "789012",
    link: "https://github.com/settings/security",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    username: "aws-root",
    name: "AWS Console",
    code: "345678",
    link: "https://console.aws.amazon.com",
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    username: "slack-admin@company.com",
    name: "Slack",
    code: "901234",
    link: "https://slack.com/admin",
    created_at: new Date().toISOString(),
  },
];

// Mock data for development
const mockGroups = [
  {
    id: "1",
    title: "Gmail Account",
    description: "Google Workspace admin access",
    created_at: new Date().toISOString(),
    created_by: "1",
    codes: [
      {
        id: "1",
        group_id: "1",
        code: "123456",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(),
      },
    ],
    user_groups: [],
  },
];

// Model queries
export const getModels = async () => {
  if (!supabase) return mockModels;
  const { data, error } = await supabase
    .from("models")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Model[];
};

export const createModel = async (model: Partial<Model>) => {
  const { data, error } = await supabase
    .from("models")
    .insert(model)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Model;
};

// User queries
export const getUser = async (email: string) => {
  if (!supabase) {
    // Return mock data
    return {
      id: "1",
      email,
      name: "Mock User",
      role: "Admin",
      created_at: new Date().toISOString(),
    } as User;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) throw error;
  return data as User;
};

export const createUser = async (user: Partial<User>) => {
  const { data, error } = await supabase
    .from("users")
    .insert(user)
    .select()
    .single();

  if (error) throw error;
  return data as User;
};

// Group queries
export const getGroups = async () => {
  if (!supabase) {
    // Return mock data
    return mockGroups as (Group & {
      codes: Code[];
      user_groups: UserGroup[];
    })[];
  }

  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole") as Role;

  // Admins can see all groups
  if (userRole === "Admin") {
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (groupsError) throw groupsError;
    
    if (groups) {
      // Get member counts and codes for each group
      const groupsData = await Promise.all(
        groups.map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from("user_groups")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
            
          // Get codes
          const { data: codes } = await supabase
            .from("codes")
            .select("*")
            .eq("group_id", group.id);

          return {
            ...group,
            member_count: [{ count: count || 0 }],
            codes: codes || []
          };
        })
      );

      return groupsData;
    }
    return [];
  }

  // Managers and Users can only see their assigned groups
  const { data: userGroups, error: userGroupsError } = await supabase
    .from("user_groups")
    .select("group_id")
    .eq("user_id", userId);

  if (userGroupsError) throw userGroupsError;

  if (userGroups && userGroups.length > 0) {
    const groupIds = userGroups.map(ug => ug.group_id);
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    if (groupsError) throw groupsError;

    if (groups) {
      // Get member counts and codes for each group
      const groupsData = await Promise.all(
        groups.map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from("user_groups")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
            
          // Get codes
          const { data: codes } = await supabase
            .from("codes")
            .select("*")
            .eq("group_id", group.id);

          return {
            ...group,
            member_count: [{ count: count || 0 }],
            codes: codes || []
          };
        })
      );

      return groupsData;
    }
  }
  return [];
};

// Helper function to add codes to groups
const addCodesToGroups = async (groups: any[]) => {
  const groupsWithCodes = await Promise.all(
    groups.map(async (group) => {
      const { data: codes, error: codesError } = await supabase
        .from("codes")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false });

      if (codesError) throw codesError;

      return {
        ...group,
        codes: codes || [],
        user_groups: [],
      };
    }),
  );

  return groupsWithCodes as (Group & {
    codes: Code[];
    user_groups: UserGroup[];
  })[];
};

export const createGroup = async (group: Partial<Group>) => {
  const { data, error } = await supabase
    .from("groups")
    .insert(group)
    .select()
    .single();

  if (error) throw error;
  return data as Group;
};

export const deleteGroup = async (id: string) => {
  // Check if group has any codes
  const { data: codes, error: codesError } = await supabase
    .from("codes")
    .select("id")
    .eq("group_id", id);

  if (codesError) throw codesError;

  if (codes && codes.length > 0) {
    throw new Error("Cannot delete group that contains codes. Please delete all codes first.");
  }

  const { error } = await supabase.from("groups").delete().eq("id", id);

  if (error) throw error;
};

// Code queries
export const createCode = async (code: Partial<Code>) => {
  const { data, error } = await supabase
    .from("codes")
    .insert(code)
    .select()
    .single();

  if (error) throw error;
  return data as Code;
};

export const updateCode = async (id: string, code: Partial<Code>) => {
  const { data, error } = await supabase
    .from("codes")
    .update(code)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Code;
};

export const deleteCode = async (id: string) => {
  const { error } = await supabase.from("codes").delete().eq("id", id);
  if (error) throw error;
};

export const cleanExpiredCodes = async () => {
  // Get expired codes before deleting them
  const { data: expiredCodes, error: fetchError } = await supabase
    .from("codes")
    .select('*')
    .lt("expires_at", new Date().toISOString());

  if (fetchError) throw fetchError;

  // For each expired code, create a new one with updated expiration
  for (const code of expiredCodes || []) {
    try {
      // Calculate new expiration time based on original duration
      const originalDuration = new Date(code.expires_at).getTime() - new Date(code.created_at).getTime();
      
      // Create new code with same settings but new expiration
      await createCode({
        group_id: code.group_id,
        name: code.name,
        code: generateCode(),
        notes: code.notes,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + originalDuration).toISOString(),
      });

      // Delete the expired code
      await supabase
        .from("codes")
        .delete()
        .eq("id", code.id);

    } catch (err) {
      console.error(`Error regenerating code ${code.id}:`, err);
    }
  }
};

// User Group queries
export const getGroupMembers = async (groupId: string) => {
  const { data, error } = await supabase
    .from("user_groups")
    .select(
      `
      users:users!inner (
        id,
        name,
        email,
        role,
        created_at
      )
    `,
    )
    .eq("group_id", groupId)
    .returns<{ users: User }[]>();

  if (error) throw error;
  return data.map((d) => d.users);
};

export const addUserToGroup = async (userGroup: Partial<UserGroup>) => {
  const { data, error } = await supabase
    .from("user_groups")
    .insert(userGroup)
    .select()
    .single();

  if (error) throw error;
  return data as UserGroup;
};

export const removeUserFromGroup = async (userId: string, groupId: string) => {
  const { error } = await supabase
    .from("user_groups")
    .delete()
    .eq("user_id", userId)
    .eq("group_id", groupId);

  if (error) throw error;
};
