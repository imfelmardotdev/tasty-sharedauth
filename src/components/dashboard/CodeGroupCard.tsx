import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Share2, Clock, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Timer from "@/components/group/Timer";

interface CodeGroupCardProps {
  id?: string;
  currentRole?: "Admin" | "Manager" | "User";
  title?: string;
  description?: string;
  codes?: {
    id: string;
    name: string;
    code: string;
    notes?: string;
    expires_at: string;
  }[];
  timeRemaining?: number;
  memberCount?: number;
  onCopy?: () => void;
  onShare?: () => void;
}

const CodeGroupCard = ({
  id = "default",
  title = "Default Group",
  description,
  codes = [],
  timeRemaining = 30,
  memberCount = 0,
  onCopy = () => console.log("Copy clicked"),
  onShare = () => console.log("Share clicked"),
  currentRole = "User",
}: CodeGroupCardProps) => {
  const navigate = useNavigate();
  const expiryTime = codes[0]?.expires_at;

  return (
    <Card className="w-[380px] h-[240px] bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5 flex-1">
            <CardTitle className="text-xl font-semibold tracking-tight line-clamp-1">
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground/80 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
            >
              <Users className="w-3 h-3 text-primary/70" />
              <span className="font-medium">{memberCount}</span>
            </Badge>
            {expiryTime && (
              <Timer
                expiresAt={expiryTime}
                codeId={codes[0]?.id}
                groupId={id}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center justify-center h-24 space-y-2 relative">
          {codes[0]?.name && (
            <div className="text-sm font-medium text-muted-foreground/90">
              {codes[0].name}
            </div>
          )}
          <div className="text-4xl font-mono tracking-[0.5em] text-primary font-bold bg-primary/5 px-6 py-3 rounded-lg shadow-sm">
            {codes[0]?.code || "------"}
          </div>
          {codes[0]?.notes && (
            <div className="text-xs text-muted-foreground/70 truncate max-w-full italic">
              {codes[0].notes}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="absolute bottom-0 right-0 p-4 flex justify-end gap-1.5 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm w-full">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/group/${id}`)}
                className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-medium">
              <p>Manage group</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCopy}
                className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-medium">
              <p>Copy code</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-medium">
              <p>Share code</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
};

export default CodeGroupCard;
