export interface User {
  id: string;
  email: string;
  name: string;
  role: "Admin" | "Manager" | "User";
  created_at: string;
  user_groups?: { 
    group_id: string;
  }[] | null;
  groupNames?: string[];
}

export interface Group {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  created_by: string;
  codes?: Code[];
  member_count?: [{ count: number }];
  user_groups?: [{ count: number }];
}

export interface UserGroup {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
}

export interface Model {
  id: string;
  username: string;
  name: string;
  code: string;
  totp_secret?: string | null;
  link?: string;
  created_at: string;
}

export interface Code {
  id: string;
  group_id: string;
  name: string;
  code: string;
  notes?: string;
  created_at: string;
  expires_at: string;
  secret?: string | null;
}

export interface SharedModelLink {
  id: string;
  model_id: string;
  created_by: string;
  access_token: string;
  expires_at: string | null;
  access_type: 'anyone' | 'restricted';
  allowed_emails: string[] | null;
  one_time_view: boolean;
  views_count: number;
  created_at: string;
}
