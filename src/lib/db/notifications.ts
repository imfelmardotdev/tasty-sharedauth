import { supabase } from "../supabase";

export interface Notification {
  id: string;
  message: string;
  type: string;
  user_id: string;
  created_at: string;
  read_at: string | null;
}

export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "read_at">,
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert(notification)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
}
