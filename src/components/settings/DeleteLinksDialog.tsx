import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
  groupCount: number;
  modelCount: number;
  isSingleDelete?: boolean;
  itemType?: 'group' | 'model';
}

const DeleteLinksDialog = ({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  groupCount,
  modelCount,
  isSingleDelete,
  itemType,
}: DeleteLinksDialogProps) => {
  const getDescription = () => {
    if (selectedCount === 0) return "";
    
    if (isSingleDelete && itemType) {
      return `This will permanently delete this ${itemType} share link and revoke all access to it.`;
    }

    let description = `This will permanently delete ${selectedCount} shared links and revoke access for all users.`;
    if (groupCount > 0 && modelCount > 0) {
      description += `\nAffected items: ${groupCount} group ${groupCount === 1 ? 'link' : 'links'} and ${modelCount} model ${modelCount === 1 ? 'link' : 'links'}.`;
    }
    return description;
  };

  const getTitle = () => {
    if (selectedCount === 0) return "Delete Links";
    if (isSingleDelete && itemType) {
      return `Delete ${itemType === 'group' ? 'Group' : 'Model'} Share Link`;
    }
    if (selectedCount === 1) return "Delete Link";
    return `Delete ${selectedCount} Links`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600"
            onClick={onConfirm}
            disabled={selectedCount === 0}
          >
            {selectedCount === 1 ? "Delete Link" : "Delete Links"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteLinksDialog;
