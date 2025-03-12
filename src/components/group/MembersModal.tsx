import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/lib/db/types";
import { getGroupMembers } from "@/lib/db/queries";

interface MembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

const MembersModal = ({ open, onOpenChange, groupId, groupName }: MembersModalProps) => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        const groupMembers = await getGroupMembers(groupId);
        setMembers(groupMembers);
      } catch (error) {
        console.error("Error fetching group members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [groupId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {groupName} Members
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] w-full pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No members found in this group.
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {member.name?.charAt(0) || member.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {member.name && (
                      <p className="text-sm font-medium leading-none truncate">
                        {member.name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MembersModal; 