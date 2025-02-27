export interface StoredCode {
  username: string;
  code: string;
  groupName: string;
  notes?: string;
}

export interface Group {
  id: string;
  title: string;
  description?: string;
  code: string;
  timeRemaining: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "User";
  groups: string[];
}

export const mockGroups: Group[] = [
  {
    id: "google",
    title: "Gmail Account",
    description: "Google Workspace admin access",
    code: "123456",
    timeRemaining: 30,
  },
  {
    id: "github",
    title: "GitHub",
    description: "GitHub organization admin access",
    code: "789012",
    timeRemaining: 25,
  },
  {
    id: "aws",
    title: "AWS Console",
    description: "AWS root account access",
    code: "345678",
    timeRemaining: 15,
  },
  {
    id: "slack",
    title: "Slack",
    description: "Slack workspace admin",
    code: "901234",
    timeRemaining: 20,
  },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    groups: ["Gmail Account", "GitHub", "AWS Console"],
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Manager",
    groups: ["Slack", "AWS Console"],
  },
  {
    id: "3",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "User",
    groups: ["GitHub", "Slack"],
  },
  {
    id: "4",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "User",
    groups: ["Gmail Account"],
  },
];

export const storedCodes: StoredCode[] = [
  {
    username: "john.doe@gmail.com",
    code: "123456",
    groupName: "Gmail Account",
    notes: "Personal Gmail account",
  },
  {
    username: "admin@company.com",
    code: "789012",
    groupName: "GitHub",
    notes: "Company admin portal",
  },
  {
    username: "deploy@github.com",
    code: "345678",
    groupName: "AWS Console",
    notes: "GitHub deployment account",
  },
  {
    username: "slack.admin@company.com",
    code: "901234",
    groupName: "Slack",
    notes: "Slack workspace admin",
  },
];

export const findExistingCode = (username: string): StoredCode | undefined => {
  return storedCodes.find(
    (code) => code.username.toLowerCase() === username.toLowerCase(),
  );
};

export const getMemberCountForGroup = (groupTitle: string): number => {
  return mockTeamMembers.filter((member) => member.groups.includes(groupTitle))
    .length;
};

export const getMembersInGroup = (groupTitle: string): TeamMember[] => {
  return mockTeamMembers.filter((member) => member.groups.includes(groupTitle));
};
