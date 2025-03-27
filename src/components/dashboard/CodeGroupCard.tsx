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
import { Copy, Share2, Clock, Users, Settings, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import Timer from "../group/Timer";

interface CodeGroupCardProps {
  id?: string;
  currentRole?: "Admin" | "Manager" | "User";
  title?: string;
  description?: string;
  group_codes?: {
    id: string;
    name: string;
    code: string;
    secret?: string | null;
    created_at: string;
    expires_at?: string;
  }[];
  memberCount?: number;
  onCopy?: () => void;
  onShare?: () => void;
  onBackup?: () => void;
}

const CodeGroupCard = ({
  id = "default",
  title = "Default Group",
  description,
  group_codes = [],
  memberCount = 0,
  onCopy = () => console.log("Copy clicked"),
  onShare = () => console.log("Share clicked"),
  currentRole = "User",
}: CodeGroupCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = React.useState(30);

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
            {group_codes.some(code => code.secret && code.expires_at) && (
              <div>
                {group_codes.filter(code => code.secret && code.expires_at)[0] && (
                  <Timer 
                    expiresAt={group_codes.filter(code => code.secret && code.expires_at)[0].expires_at || new Date().toISOString()} 
                    codeId={group_codes.filter(code => code.secret && code.expires_at)[0].id}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center justify-center h-24 space-y-2 relative">
          {group_codes.length > 0 ? (
            <>
              <div className="text-sm font-medium text-muted-foreground/90">
                {group_codes[0].name}
              </div>
              <div className="text-4xl font-mono tracking-[0.5em] text-primary font-bold bg-primary/5 px-6 py-3 rounded-lg shadow-sm">
                {group_codes[0].code || "------"}
              </div>
              {group_codes[0].secret && (
                <div className="text-xs text-muted-foreground/70 truncate max-w-full">
                  Time-based One-Time Password (TOTP)
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-center">
              No codes available
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="absolute bottom-0 right-0 p-4 flex justify-end gap-3 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm w-full">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/group/${id}`)}
                className="h-9 w-9 sm:h-8 sm:w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
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
                className="h-9 w-9 sm:h-8 sm:w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
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
                className="h-9 w-9 sm:h-8 sm:w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-medium">
              <p>Share code</p>
            </TooltipContent>
          </Tooltip>

          {group_codes[0]?.secret && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      const otpauthUrl = `otpauth://totp/${encodeURIComponent(title)}:${encodeURIComponent(group_codes[0].name)}?secret=${group_codes[0].secret}&issuer=${encodeURIComponent(title)}&algorithm=SHA1&digits=6&period=30`;
                      
                      // Generate QR code as data URL
                      const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
                      
                      // Create temporary link element
                      const link = document.createElement('a');
                      link.href = qrDataUrl;
                      link.download = `${title}-${group_codes[0].name}-totp-backup.png`;
                      
                      // Trigger download
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      toast({
                        title: "QR Code downloaded",
                        description: "Your TOTP backup QR code has been downloaded successfully.",
                      });
                    } catch (error) {
                      console.error('Error generating QR code:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate QR code backup.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="h-9 w-9 sm:h-8 sm:w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-primary/10"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-medium">
                <p>Backup TOTP</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
};

export default CodeGroupCard;
