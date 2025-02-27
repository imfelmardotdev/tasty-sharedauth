import { supabase } from "@/lib/supabase";
import { User } from "@/lib/db/types";

export const getAllUsers = async (page: number) => {
  const itemsPerPage = 20;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage - 1;

  try {
    // First get users
    let { data: users, error, count } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        name,
        role,
        created_at
      `,
        { count: "exact" },
      )
      .range(startIndex, endIndex)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!users) {
      console.warn("No users found");
      return { users: [], total: 0 };
    }

    // Get groups for each user
    const usersWithGroups = await Promise.all(
      users.map(async (user) => {
        const { data: userGroups } = await supabase
          .from("user_groups")
          .select("group_id")
          .eq("user_id", user.id);

        if (userGroups && userGroups.length > 0) {
          const groupIds = userGroups.map(ug => ug.group_id);
          const { data: groups } = await supabase
            .from("groups")
            .select("title")
            .in("id", groupIds);

          return {
            ...user,
            groupNames: groups?.map(g => g.title) || []
          };
        }

        return {
          ...user,
          groupNames: []
        };
      })
    );

    return { users: usersWithGroups, total: count || 0 };
  } catch (err: any) {
    console.error("Unexpected error during getAllUsers:", err);
    return { users: [], total: 0 };
  }
};

export const createTeamMember = async (values: {
  name: string;
  email: string;
  password: string;
  role: "Admin" | "Manager" | "User";
  groupNames?: string[];
}) => {
  const { name, email, password, role, groupNames } = values;

  try {
    // 1. Create the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("User not found after signup");
    }

    // 2. If we have group names, we need to get their IDs and create user_group entries
    if (groupNames && groupNames.length > 0) {
      // Get group IDs from names
      const { data: groups } = await supabase
        .from('groups')
        .select('id, title')
        .in('title', groupNames);

      if (groups) {
        // Create user_groups entries
        await Promise.all(
          groups.map(group => 
            supabase
              .from('user_groups')
              .insert({
                user_id: authData.user.id,
                group_id: group.id
              })
          )
        );
      }
    }

    return authData.user;
  } catch (err: any) {
    console.error("Error creating team member:", err);
    throw err;
  }
};

export const updateTeamMember = async (
  id: string,
  values: { name: string; email: string; role: "Admin" | "Manager" | "User"; groupNames?: string[] }
) => {
  const { name, email, role, groupNames } = values;

  try {
    // 1. Update the user's basic info
    const { data, error } = await supabase
      .from("users")
      .update({ name, email, role })
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    // 2. If groupNames is provided, update user's groups
    if (groupNames !== undefined) {
      // First delete all existing user_groups
      await supabase
        .from('user_groups')
        .delete()
        .eq('user_id', id);

      if (groupNames.length > 0) {
        // Get group IDs from names
        const { data: groups } = await supabase
          .from('groups')
          .select('id, title')
          .in('title', groupNames);

        if (groups) {
          // Create new user_groups entries
          await Promise.all(
            groups.map(group =>
              supabase
                .from('user_groups')
                .insert({
                  user_id: id,
                  group_id: group.id
                })
            )
          );
        }
      }
    }

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error("Error updating team member:", err);
  }
};

export const deleteTeamMember = async (id: string) => {
  try {
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  } catch (err: any) {
    console.error("Error deleting team member:", err);
  }
};
