import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Shield } from "lucide-react";
import GroupTOTPDisplay from "../group/GroupTOTPDisplay";
import { Timer } from "@/components/group/Timer";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { generateTOTP, getTimeRemaining } from "@/lib/utils/totp";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface SharedGroupTOTPDisplayProps {
  secret: string;
  codeId: string;
}

const SharedGroupTOTPDisplay = ({ secret, codeId }: SharedGroupTOTPDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    let mounted = true;
    let timerInterval: NodeJS.Timeout;

    const updateCode = async () => {
      if (!mounted) return;
      try {
        const newCode = await generateTOTP(secret);
        if (mounted) {
          setCode(newCode);
        }
      } catch (err) {
        console.error('Error generating TOTP:', err);
      }
    };

    const updateTimer = () => {
      if (!mounted) return;
      const remaining = getTimeRemaining();
      setTimeLeft(remaining);

      // Update code when timer reaches 30 or 0
      if (remaining === 30 || remaining === 0) {
        console.log(`Timer reached ${remaining}, updating code`);
        updateCode();
      }
    };

    // Initial updates
    updateTimer();
    updateCode();

    // Set up interval for timer updates
    timerInterval = setInterval(updateTimer, 1000);

    return () => {
      mounted = false;
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [secret]);

  const { toast } = useToast();
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Code copied",
        description: "The 2FA code has been copied to your clipboard",
        duration: 2000
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Failed to copy",
        description: "Please try copying manually",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="font-mono text-xl sm:text-4xl tracking-[0.25em] sm:tracking-[0.5em] text-primary font-bold break-all sm:break-normal mb-4">
        {code}
      </div>
      <Timer
        expiresAt={new Date(Date.now() + timeLeft * 1000).toISOString()}
        codeId={codeId}
        showRefreshText={false}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="mt-2"
      >
        <Copy className="h-4 w-4 mr-2" />
        {copied ? 'Copied!' : 'Copy Code'}
      </Button>
    </div>
  );
};

interface Code {
  id: string;
  group_id: string;
  code: string;
  name: string;
  created_at: string;
  expires_at: string;
  secret?: string;
}

interface SharedGroup {
  id: string;
  title: string;
  description?: string;
  codes?: Code[];
  totp_secret?: string;
}

interface ShareLink {
  id: string;
  group_id: string;
  access_token: string;
  expires_at: string | null;
  one_time_view: boolean;
  views_count: number;
  access_type: 'anyone' | 'restricted';
  allowed_emails: string[] | null;
}

const SharedGroupView = () => {
  // All state hooks at the top
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<SharedGroup | null>(null);
  const [latestCode, setLatestCode] = useState<Code | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [linkTimeRemaining, setLinkTimeRemaining] = useState<number | null>(null);
  const [isNearingExpiry, setIsNearingExpiry] = useState(false);
  const [wasDeleted, setWasDeleted] = useState(false);

  // Router hooks
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // Time formatting helpers
  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Add validation check function
  const validateLinkExists = useCallback(async () => {
    if (!supabase || !groupId || !shareLink?.id) return;

    console.log('Checking if link still exists:', shareLink.id);
    
    const { data, error } = await supabase
      .from("shared_links")
      .select("id")
      .eq("id", shareLink.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking link:", error);
      return;
    }

    if (!data) {
      console.log("Link no longer exists, updating UI");
      setWasDeleted(true);
      setError("This shared link has been deleted by the administrator.");
      setGroup(null);
    }
  }, [groupId, shareLink?.id]);

  // Set up realtime monitoring
  useEffect(() => {
    if (!supabase || !groupId || !shareLink?.id) return;

    console.log('Setting up realtime monitoring for:', {
      groupId,
      shareLinkId: shareLink.id
    });

    // Channel for link deletions
    const linkChannel = supabase
      .channel(`shared-links-${shareLink.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'shared_links',
          filter: `id=eq.${shareLink.id}`
        },
        (payload) => {
          console.log('🔴 Link deleted:', payload);
          validateLinkExists();
        }
      )
      .subscribe();

    // Channel for code updates
    const codeChannel = supabase
      .channel(`group-codes-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_codes',
          filter: `group_id=eq.${groupId}`
        },
        async () => {
          console.log('🔄 New code added, fetching...');
          const { data: codes } = await supabase
            .from("group_codes")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (codes?.[0]) {
            console.log('Updated to new code:', codes[0].code);
            setLatestCode(codes[0]);
          }
        }
      )
      .subscribe();

    // Periodic link validation
    const interval = setInterval(() => {
      validateLinkExists();
    }, 10000);

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(linkChannel);
      supabase.removeChannel(codeChannel);
      clearInterval(interval);
    };
  }, [groupId, shareLink?.id, validateLinkExists]);

  // Update remaining time effect
  useEffect(() => {
    if (!shareLink?.expires_at) {
      console.log('No expiration time set');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiryDate = new Date(shareLink.expires_at!);
      const remainingMs = expiryDate.getTime() - now.getTime();

      console.log('Updating timer:', {
        now: now.toISOString(),
        expiry: expiryDate.toISOString(),
        remainingMs,
        formattedTime: formatTimeRemaining(Math.max(0, remainingMs))
      });

      if (remainingMs <= 0) {
        setLinkTimeRemaining(0);
        setError("This share link has expired");
        return;
      }

      setLinkTimeRemaining(remainingMs);
      
      // Update warning state
      const minutes = Math.floor(remainingMs / (1000 * 60));
      setIsNearingExpiry(minutes < 5);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [shareLink]);

  // Format the status message
  const getStatusMessage = () => {
    if (!shareLink) return "";
    
    if (!shareLink.expires_at) {
      return shareLink.one_time_view 
        ? "Single-use link (expires after viewing)" 
        : "No expiration";
    }

    if (!linkTimeRemaining || linkTimeRemaining <= 0) {
      return "Link expired";
    }

    const timeText = formatTimeRemaining(linkTimeRemaining);
    return shareLink.one_time_view
      ? `Single-use link (expires in ${timeText})`
      : `Link expires in ${timeText}`;
  };

  // Verify share link is valid and accessible
  const verifyShareLink = useCallback(async () => {
    if (!supabase || !groupId || !token) {
      setError('Invalid link parameters');
      return false;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    // Get share link details
    const { data: shareLink, error: shareLinkError } = await supabase
      .from("shared_links")
      .select("*")
      .eq("group_id", groupId)
      .eq("access_token", token)
      .maybeSingle();

    if (shareLinkError || !shareLink) {
      console.error('Share link not found:', shareLinkError);
      setError("This share link is invalid or has been deleted");
      return false;
    }


    // Check access restrictions
    if (shareLink.access_type === 'restricted') {
      if (!session?.user?.email) {
        setError("You must be logged in to access this link");
        return false;
      }

      const userEmail = session.user.email.toLowerCase();
      const allowedEmails = shareLink.allowed_emails || [];
      const hasAccess = allowedEmails.includes(userEmail);

      if (!hasAccess) {
        setError(`Access denied. Your email (${userEmail}) is not authorized to view this link.`);
        return false;
      }
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      setError("This share link has expired");
      return false;
    }

    return true;
  }, [groupId, token]);

  // Initial data fetch
  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout;

    const loadSharedGroup = async () => {
      if (!supabase || !groupId || !token) {
        console.error('Missing required parameters');
        setError('Invalid link parameters');
        setLoading(false);
        return;
      }

      try {
        const isValid = await verifyShareLink();
        if (!isValid || !mounted) return;

        // Use a stored procedure that wraps everything in a transaction
        const { data, error: rpcError } = await supabase.rpc('handle_share_link_view', {
          p_group_id: groupId,
          p_token: token
        });

        if (rpcError) {
          console.error('Share link error:', rpcError);
          throw new Error(rpcError.message);
        }

        if (!data || !data.link) {
          throw new Error("Share link not found or already used");
        }

        // Set link data if mount is still active
        if (mounted) {
          setShareLink(data.link);
        }

        // Fetch group data
        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select(`
            id,
            title,
            description
          `)
          .eq("id", groupId)
          .single();

        if (groupError) throw groupError;

        // Fetch group codes separately
        const { data: groupCodes, error: groupCodesError } = await supabase
          .from("group_codes")
          .select(`
            id,
            group_id,
            code,
            name,
            created_at,
            expires_at,
            secret
          `)
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (groupCodesError) {
          console.error("Error fetching group codes:", groupCodesError);
        }

        console.log('Debug - Fetched Data:', {
          groupData,
          groupCodes,
          hasSecret: !!groupCodes?.[0]?.secret,
          hasLatestCode: !!groupCodes?.[0]
        });

        if (mounted) {
          setGroup({
            ...groupData,
            codes: groupCodes || []
          });
          setLatestCode(groupCodes?.[0] || null);
        }
      } catch (err) {
        console.error("Error:", err);
        if (mounted) {
          setError(err.message || "Failed to load shared group");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSharedGroup();
    return () => { 
      mounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [groupId, token]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className={`w-12 h-12 ${wasDeleted ? 'text-yellow-500' : 'text-destructive'}`} />
            </div>
            <CardTitle className={`text-2xl ${wasDeleted ? 'text-yellow-700' : 'text-destructive'}`}>
              {wasDeleted ? 'Link Deleted' : 'Access Denied'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">{error}</p>
              {wasDeleted && (
                <p className="text-sm text-yellow-600">
                  Please contact the administrator for a new link.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Toaster />
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{group.title}</CardTitle>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {shareLink?.one_time_view && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-4 text-sm text-yellow-800">
                Warning: This is a single-use link. Once you close this page, you won't be able to access it again.
              </div>
            )}
            {latestCode?.secret && latestCode?.id && (
              <>
                <p className="text-sm text-muted-foreground text-center">{latestCode.name || ' '}</p>
                <SharedGroupTOTPDisplay
                  secret={latestCode.secret} 
                  codeId={latestCode.id}
                />
              </>
            )}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                !linkTimeRemaining || linkTimeRemaining <= 0 
                  ? 'bg-red-500' 
                  : isNearingExpiry 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
              }`} />
              <span className={`text-sm ${isNearingExpiry ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}`}>
                {getStatusMessage()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedGroupView;
