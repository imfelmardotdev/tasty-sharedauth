export type Role = "Admin" | "Manager" | "User";

export const rolePermissions = {
  Admin: {
    canCreateGroups: true, // Can create groups
    canAssignToManagers: true, // Can assign groups to Managers
    canAssignToUsers: false, // Cannot assign to Users directly
    canAddCodes: true, // Can add codes
    canEdit: true, // Can edit everything
    canDelete: true, // Can delete everything
    canShare: true, // Can share codes
    canManageUsers: true, // Can manage all users
    canAccessSettings: true, // Can access settings
  },
  Manager: {
    canCreateGroups: true, // Can create and manage groups
    canAssignToManagers: false, // Cannot assign to other managers
    canAssignToUsers: true, // Can assign groups to Users
    canAddCodes: true, // Can add/delete codes
    canEdit: true, // Can edit their groups
    canDelete: true, // Can delete codes
    canShare: true, // Can share codes
    canManageUsers: true, // Can manage users (not admins)
    canAccessSettings: false, // Cannot access settings
  },
  User: {
    canCreateGroups: false, // Cannot create groups
    canAssignToManagers: false, // Cannot assign to managers
    canAssignToUsers: false, // Cannot assign to users
    canAddCodes: true, // Can add codes to assigned groups
    canEdit: false, // Cannot edit groups
    canDelete: false, // Cannot delete anything
    canShare: false, // Cannot share codes
    canManageUsers: false, // Cannot manage users
    canAccessSettings: false, // Cannot access settings
  },
};

export const getPermissions = (role: Role) => rolePermissions[role];
