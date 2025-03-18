import { supabase, supabaseAdmin } from "../supabase";
import { User, Group, UserGroup, Code, Model, SharedModelLink, GroupCode } from "./types";
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

    if (error) {
      if (error.message.includes('permission denied') && supabaseAdmin) {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from("models")
          .select("*")
          .order("created_at", { ascending: false });

        if (adminError) {
          console.error("Admin fetch failed:", adminError);
          throw adminError;
        }
        return adminData as Model[];
      }
      throw error;
    }
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

    if (error) {
      if (error.message.includes('permission denied') && supabaseAdmin) {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from("models")
          .insert(model)
          .select()
          .single();

        if (adminError) {
          console.error("Admin create failed:", adminError);
          throw adminError;
        }
        return adminData as Model;
      }
      throw error;
    }
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

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.message.includes('permission denied') && supabaseAdmin) {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (adminError) {
          console.error("Admin fetch failed:", adminError);
          throw adminError;
        }
        return adminData as User;
      }
      throw error;
    }
    return data as User;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const createUser = async (user: Partial<User>) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .insert(user)
      .select()
      .single();

    if (error) {
      if (error.message.includes('permission denied') && supabaseAdmin) {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from("users")
          .insert(user)
          .select()
          .single();

        if (adminError) {
          console.error("Admin create failed:", adminError);
          throw adminError;
        }
        return adminData as User;
      }
      throw error;
    }
    return data as User;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
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
      // Get creator emails, member counts and codes for each group
      const groupsData = await Promise.all(
        groups.map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from("user_groups")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
            
          // Get group codes
          const { data: groupCodes } = await supabase
            .from("group_codes")
            .select("*")
            .eq("group_id", group.id);

              // Get creator's email
          let creator;
          try {
            // First try with supabase client
            const { data: creatorData, error: creatorError } = await supabase
              .from("users")
              .select("email")
              .eq("id", group.created_by)
              .single();

            if (creatorError) {
              if (creatorError.message.includes('permission denied') && supabaseAdmin) {
                // Try with admin client if permission denied
                const { data: adminCreator, error: adminError } = await supabaseAdmin
                  .from("users")
                  .select("email")
                  .eq("id", group.created_by)
                  .single();

                if (adminError) {
                  console.error("Admin fetch failed:", adminError);
                  throw adminError;
                }
                creator = adminCreator;
              } else {
                throw creatorError;
              }
            } else {
              creator = creatorData;
            }
          } catch (error) {
            console.error("Error fetching creator email:", error);
            creator = { email: null }; // This will trigger the fallback to "2FA Admin"
          }
            
          return {
            ...group,
            creator_email: creator?.email,
            member_count: [{ count: count || 0 }],
            group_codes: groupCodes || []
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
      // Get creator emails, member counts and codes for each group
      const groupsData = await Promise.all(
        groups.map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from("user_groups")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
            
          // Get group codes
          const { data: groupCodes } = await supabase
            .from("group_codes")
            .select("*")
            .eq("group_id", group.id);

          // Get creator's email
          let creator;
          try {
            // First try with supabase client
            const { data: creatorData, error: creatorError } = await supabase
              .from("users")
              .select("email")
              .eq("id", group.created_by)
              .single();

            if (creatorError) {
              if (creatorError.message.includes('permission denied') && supabaseAdmin) {
                // Try with admin client if permission denied
                const { data: adminCreator, error: adminError } = await supabaseAdmin
                  .from("users")
                  .select("email")
                  .eq("id", group.created_by)
                  .single();

                if (adminError) {
                  console.error("Admin fetch failed:", adminError);
                  throw adminError;
                }
                creator = adminCreator;
              } else {
                throw creatorError;
              }
            } else {
              creator = creatorData;
            }
          } catch (error) {
            console.error("Error fetching creator email:", error);
            creator = { email: null }; // This will trigger the fallback to "2FA Admin"
          }

          return {
            ...group,
            creator_email: creator?.email,
            member_count: [{ count: count || 0 }],
            group_codes: groupCodes || []
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

// Group Code queries
export const createGroupCode = async (groupCode: Partial<GroupCode>) => {
  try {
    const { data, error } = await supabase
      .from("group_codes")
      .insert(groupCode)
      .select()
      .single();

    if (error) throw error;
    return data as GroupCode;
  } catch (error) {
    console.error("Error creating group code:", error);
    throw error;
  }
};

export const getGroupCodes = async (groupId: string) => {
  try {
    const { data, error } = await supabase
      .from("group_codes")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as GroupCode[];
  } catch (error) {
    console.error("Error fetching group codes:", error);
    return [];
  }
};

export const updateGroupCode = async (id: string, code: Partial<GroupCode>) => {
  try {
    const { data, error } = await supabase
      .from("group_codes")
      .update(code)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as GroupCode;
  } catch (error) {
    console.error("Error updating group code:", error);
    throw error;
  }
};

export const deleteGroupCode = async (id: string) => {
  try {
    const { error } = await supabase
      .from("group_codes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting group code:", error);
    return false;
  }
};

export const updateGroupCodeValue = async (id: string, code: string) => {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.error("No authenticated user");
      return false;
    }

    // Update with new code and expiration
    const updateData = {
      code,
      expires_at: new Date(Date.now() + 30000).toISOString()
    };

    const { error } = await supabase
      .from('group_codes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      if (error.message.includes('permission denied')) {
        // Try with service role client as fallback
        if (supabaseAdmin) {
          const { error: adminError } = await supabaseAdmin
            .from('group_codes')
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

    console.log(`Code updated for group code entry ${id}`);
    return true;
  } catch (error) {
    console.error("Error updating group code:", error);
    return false;
  }
};

export const updateGroupCodeWithSecret = async (id: string) => {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.error("No authenticated user");
      return false;
    }

    // First, get the code data to access the secret
    const { data: codeData, error: fetchError } = await supabase
      .from('group_codes')
      .select('secret')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("Error fetching group code data:", fetchError);
      return false;
    }

    if (!codeData || !codeData.secret) {
      console.error("No secret found for group code");
      return false;
    }

    // Generate new code using the secret
    const { generateTOTP } = await import('@/lib/utils/totp');
    const newCode = await generateTOTP(codeData.secret);

    // Update with new code and expiration
    const updateData = {
      code: newCode,
      expires_at: new Date(Date.now() + 30000).toISOString()
    };

    const { error } = await supabase
      .from('group_codes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      if (error.message.includes('permission denied')) {
        // Try with service role client as fallback
        if (supabaseAdmin) {
          const { error: adminError } = await supabaseAdmin
            .from('group_codes')
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

    console.log(`Code updated for group code entry ${id} using secret`);
    return true;
  } catch (error) {
    console.error("Error updating group code with secret:", error);
    return false;
  }
};

export const deleteGroup = async (id: string) => {
  // Check if group has any codes
  const { data: codes, error: codesError } = await supabase
    .from("group_codes")
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
  try {
    // First get the user_groups entries
    const { data: userGroups, error: userGroupsError } = await supabase
      .from("user_groups")
      .select("user_id")
      .eq("group_id", groupId);

    if (userGroupsError) {
      if (userGroupsError.message.includes('permission denied') && supabaseAdmin) {
        const { data: adminUserGroups, error: adminError } = await supabaseAdmin
          .from("user_groups")
          .select("user_id")
          .eq("group_id", groupId);

        if (adminError) {
          console.error("Admin fetch failed:", adminError);
          throw adminError;
        }
        
        if (!adminUserGroups?.length) return [];
        
        // Get user details for each user_id
        const userIds = adminUserGroups.map(ug => ug.user_id);
        const { data: users, error: usersError } = await supabaseAdmin
          .from("users")
          .select("id, name, email, role, created_at")
          .in("id", userIds);

        if (usersError) {
          console.error("Admin users fetch failed:", usersError);
          throw usersError;
        }

        return users || [];
      }
      throw userGroupsError;
    }

    if (!userGroups?.length) return [];

    // Get user details for each user_id
    const userIds = userGroups.map(ug => ug.user_id);
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email, role, created_at")
      .in("id", userIds);

    if (usersError) {
      if (usersError.message.includes('permission denied') && supabaseAdmin) {
        const { data: adminUsers, error: adminUsersError } = await supabaseAdmin
          .from("users")
          .select("id, name, email, role, created_at")
          .in("id", userIds);

        if (adminUsersError) {
          console.error("Admin users fetch failed:", adminUsersError);
          throw adminUsersError;
        }

        return adminUsers || [];
      }
      throw usersError;
    }

    return users || [];
  } catch (error) {
    console.error("Error fetching group members:", error);
    throw error;
  }
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


// Shared Model Link queries
export const getSharedModelLinks = async () => {
  try {
    const { data, error } = await supabase
      .from("shared_model_links")
      .select(`
        *,
        model:models(
          id,
          name,
          username
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching shared model links:", error);
    return [];
  }
};

export const createSharedModelLink = async (link: Partial<SharedModelLink>) => {
  try {
    const { data, error } = await supabase
      .from("shared_model_links")
      .insert(link)
      .select()
      .single();

    if (error) throw error;
    return data as SharedModelLink;
  } catch (error) {
    console.error("Error creating shared model link:", error);
    throw error;
  }
};

export const updateSharedModelLink = async (id: string, views: number) => {
  try {
    const { error } = await supabase
      .from("shared_model_links")
      .update({ views_count: views })
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating shared model link:", error);
    return false;
  }
};

export const deleteSharedModelLink = async (id: string) => {
  try {
    const { error } = await supabase
      .from("shared_model_links")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting shared model link:", error);
    return false;
  }
};

export const deleteShare = async (type: 'group' | 'model', id: string) => {
  try {
    const table = type === 'group' ? 'shared_links' : 'shared_model_links';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting ${type} share:`, error);
    return false;
  }
};

export const deleteManyShares = async (shares: { type: 'group' | 'model', ids: string[] }[]) => {
  try {
    let deletedCount = 0;
    const errors: string[] = [];

    for (const share of shares) {
      const table = share.type === 'group' ? 'shared_links' : 'shared_model_links';
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', share.ids);

      if (error) {
        errors.push(`Error deleting ${share.type} shares: ${error.message}`);
      } else {
        deletedCount += share.ids.length;
      }
    }

    return {
      success: errors.length === 0,
      deletedCount,
      errors
    };
  } catch (error) {
    console.error('Error in deleteManyShares:', error);
    return {
      success: false,
      deletedCount: 0,
      errors: [error.message]
    };
  }
};

export const cleanExpiredCodes = async () => {
  // Get expired codes before deleting them
  const { data: expiredCodes, error: fetchError } = await supabase
    .from("group_codes")
    .select('*')
    .lt("expires_at", new Date().toISOString());

  if (fetchError) throw fetchError;

  // For each expired code, create a new one with updated expiration
  for (const code of expiredCodes || []) {
    try {
      // Calculate new expiration time based on original duration
      const originalDuration = new Date(code.expires_at).getTime() - new Date(code.created_at).getTime();
      
      // Create new code with same settings but new expiration
      await createGroupCode({
        group_id: code.group_id,
        name: code.name,
        code: generateCode(),
        notes: code.notes,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + originalDuration).toISOString(),
      });

      // Delete the expired code
      await supabase
        .from("group_codes")
        .delete()
        .eq("id", code.id);

    } catch (err) {
      console.error(`Error regenerating code ${code.id}:`, err);
    }
  }
};
