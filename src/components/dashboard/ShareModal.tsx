import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface ShareModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  groupId?: string;
  groupName?: string;
}

const ShareModal = ({
  open = false,
  onOpenChange = () => {},
  groupId = "",
  groupName = "Default Group",
}: ShareModalProps) => {
  const { toast } = useToast();
  const [expiryDays, setExpiryDays] = React.useState("30");
  const [accessType, setAccessType] = React.useState("anyone");
  const [oneTimeView, setOneTimeView] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [restrictedEmails, setRestrictedEmails] = React.useState<string>("");

  const generateShareUrl = async () => {
    if (!groupId || !supabase) {
      console.error("Missing groupId or supabase client");
      return;
    }

    setLoading(true);
    try {
      if (accessType === "restricted" && !restrictedEmails.trim()) {
        toast({
          title: "Error",
          description: "Please enter at least one email address",
          variant: "destructive",
        });
        return;
      }

      const emails = accessType === "restricted" 
        ? restrictedEmails.split(",")
            .map(email => email.trim())
            .filter(email => email)
            .map(email => email.toLowerCase())  // Normalize email to lowercase
        : null;

      if (accessType === "restricted") {
        console.log('Creating restricted link with emails:', emails);
      }

      if (accessType === "restricted" && emails?.length === 0) {
        toast({
          title: "Error",
          description: "Please enter valid email addresses",
          variant: "destructive",
        });
        return;
      }

      const newShareLink = {
        group_id: groupId,
        created_by: localStorage.getItem("userId"),
        access_token: crypto.randomUUID(),
        expires_at:
          expiryDays === "never"
            ? null
            : expiryDays.startsWith("m_")
              ? new Date(
                  Date.now() + parseInt(expiryDays.slice(2)) * 60 * 1000
                ).toISOString()
              : new Date(
                  Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000
                ).toISOString(),
        access_type: accessType,
        allowed_emails: emails, // Send as regular array, Supabase will handle conversion
        one_time_view: oneTimeView,
        views_count: 0,
      };

      console.log('Creating share link:', {
        accessType,
        allowedEmails: emails,
        timestamp: new Date().toISOString()
      });

      // Add debug logging for authentication state
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current auth session:', session);
      if (!session) {
        throw new Error('No active session found. Please log in again.');
      }

      const { data: shareLink, error } = await supabase
        .from("shared_links")
        .insert([newShareLink])
        .select()
        .single();

        if (error) {
          console.error("Supabase error:", error);
          if (error.message.includes("allowed_emails")) {
            throw new Error("Invalid email format. Please check the email addresses.");
          }
          throw new Error(error.message);
        }

      if (!shareLink) {
        throw new Error("No share link data returned");
      }

      const url = `${window.location.origin}/share/group/${groupId}?token=${shareLink.access_token}`;
      console.log("Generated URL:", url);
      setShareUrl(url);

      toast({
        title: "Share link created",
        description: "The link has been generated and is ready to share.",
      });

      return url;
    } catch (err) {
      console.error("Error generating share URL:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate share link",
        variant: "destructive",
      });
      return "";
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "The share link has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // Reset share URL when modal closes
  React.useEffect(() => {
    if (!open) {
      setShareUrl("");
    }
  }, [open]);

  // Add touch event handlers to prevent zooming
  React.useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (open && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    if (open) {
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Share {groupName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="text-[15px] text-[#667085]">Link expires after</div>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger className="w-[180px] bg-white border border-[#E4E7EC] text-[#344054]">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="m_60">1 hour</SelectItem>
                <SelectItem value="m_30">30 minutes</SelectItem>
                <SelectItem value="m_10">10 minutes</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="text-[15px] text-[#667085]">Available to</div>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger className="w-[180px] bg-white border border-[#E4E7EC] text-[#344054]">
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anyone">Anyone with the link</SelectItem>
                  <SelectItem value="restricted">Only some people...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accessType === "restricted" && (
              <div className="space-y-2">
                <label htmlFor="emails" className="text-[13px] text-[#667085] block font-medium">
                  Enter email addresses (comma-separated)
                </label>
                <Input
                  id="emails"
                  className="w-full bg-white border border-[#E4E7EC]"
                  placeholder="user@example.com, another@example.com"
                  value={restrictedEmails}
                  onChange={(e) => setRestrictedEmails(e.target.value)}
                />
                <div className="text-[12px] space-y-1">
                  <p className="text-muted-foreground">
                    Only these email addresses will be able to access the link
                  </p>
                  <p className="text-yellow-600">
                    Note: Users must be logged in with these email addresses to access the link
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="oneTime"
              checked={oneTimeView}
              onCheckedChange={(checked) => setOneTimeView(checked as boolean)}
              className="border-[#E4E7EC]"
            />
            <label
              htmlFor="oneTime"
              className="text-[15px] text-[#667085] cursor-pointer"
            >
              Single-use link (expires after first view)
            </label>
          </div>

          <div className="space-y-4">
            {shareUrl ? (
              <div className="space-y-2">
                <div className="text-[15px] text-[#667085]">Share link</div>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-white border border-[#E4E7EC] text-[#344054]"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0 border border-[#E4E7EC]"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={generateShareUrl}
                className="w-full"
                disabled={loading}
              >
                Generate Share Link
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
