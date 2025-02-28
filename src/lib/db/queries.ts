import { supabase, supabaseAdmin } from "../supabase";
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
    totp_secret: null,
  },
  {
    id: "2",
    username: "github-admin",
    name: "GitHub",
    code: "789012",
    link: "https://github.com/settings/security",
    created_at: new Date().toISOString(),
    totp_secret: null,
  },
];

// Model queries
export const getModels = async () => {
  if (!supabase) return mockModels;
  try {
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Model[];
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
};

export const createModel = async (model: Partial<Model>) => {
  try {
    const { data, error } = await supabase
      .from("models")
      .insert(model)
      .select()
      .single();

    if (error) throw error;
    return data as Model;
  } catch (error) {
    console.error("Error creating model:", error);
    throw error;
  }
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
    return [];
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
  try {
    const { data, error } = await supabase
      .from("user_groups")
      .insert(userGroup)
      .select()
      .single();

    if (error) throw error;
    return data as UserGroup;
  } catch (error) {
    console.error("Error adding user to group:", error);
    throw error;
  }
};

export const removeUserFromGroup = async (userId: string, groupId: string) => {
  const { error } = await supabase
    .from("user_groups")
    .delete()
    .eq("user_id", userId)
    .eq("group_id", groupId);

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

export const updateModelCode = async (id: string, code: string) => {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.error("No authenticated user");
      return false;
    }

    // Try update with basic fields first
    const updateData = {
      code,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('models')
      .update(updateData)
      .eq('id', id);

    if (error) {
      if (error.message.includes('permission denied')) {
        // Try with service role client as fallback
        if (supabaseAdmin) {
          const { error: adminError } = await supabaseAdmin
            .from('models')
            .update(updateData)
            .eq('id', id);

          if (adminError) {
            console.error("Admin update failed:", adminError);
            return false;
          }
        } else {
          console.error("No admin client available");
          return false;
        }
      } else {
        console.error("Update error:", error);
        return false;
      }
    }

    console.log(`Code updated for model ${id}`);
    return true;
  } catch (error) {
    console.error("Error updating model:", error);
    return false;
  }
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
