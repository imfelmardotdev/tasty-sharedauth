import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Users,
  History,
  Share2,
  ChevronRight,
  ChevronDown,
  FolderClosed,
  FolderOpen,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Code } from "@/lib/db/types";
import CodeTimer from "@/components/group/Timer";

interface CodeGroupViewProps {
  group: {
    id: string;
    title: string;
    description?: string;
    memberCount?: number;
    codes?: Code[];
  };
  onShare?: () => void;
  onAddCode?: () => void;
  loading?: boolean;
}

const CodeGroupView = ({ group, onShare, onAddCode, loading = false }: CodeGroupViewProps) => {
  const { toast } = useToast();
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedCode, setSelectedCode] = useState<Code | null>(null);
  const [copyingCode, setCopyingCode] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    setCopyingCode(code);
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code copied!",
        description: "The code has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Error copying code:", err);
      toast({
        title: "Error",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    } finally {
      setCopyingCode(null);
    }
  };

  const toggleCode = (code: Code) => {
    if (selectedCode?.id === code.id) {
      setSelectedCode(null);
    } else {
      setSelectedCode(code);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
    );
    return remaining;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 p-3 sm:p-6 pb-2 sm:pb-4">
          <div className="space-y-1 sm:space-y-1.5">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{group.title}</CardTitle>
            {group.description && (
              <p className="text-xs sm:text-sm text-muted-foreground/80 line-clamp-2 sm:line-clamp-none">
                {group.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-3">
            <Badge 
              variant="outline" 
              className="flex items-center gap-1 sm:gap-1.5 bg-background/50 backdrop-blur-sm border-primary/20 text-xs sm:text-sm"
            >
              <Users className="w-3 h-3 text-primary/70" />
              <span className="font-medium">{group.memberCount || 0}</span>
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onShare}
              disabled={loading}
              className="opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/10 disabled:opacity-40"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-3 sm:space-y-4">
            {(!group.codes || group.codes.length === 0) && (
              <div className="text-center py-8 text-muted-foreground/80 text-sm sm:text-base">
                {loading ? (
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary animate-spin rounded-full" />
                    <span>Loading codes...</span>
                  </div>
                ) : (
                  'No codes available. Add your first code to get started.'
                )}
              </div>
            )}
            {group.codes?.map(code => (
              <Card
                key={code.id}
                className={`relative overflow-hidden group bg-card/30 backdrop-blur-sm border border-border/30 shadow-md hover:shadow-lg transition-all duration-300 ${selectedCode?.id === code.id ? "ring-2 ring-primary/20" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-3 sm:p-4 relative">
                  <div
                    role="button"
                    tabIndex={loading ? -1 : 0}
                    aria-expanded={selectedCode?.id === code.id}
                    aria-label={`Code from ${new Date(code.created_at).toLocaleString()}, press Enter to ${selectedCode?.id === code.id ? 'collapse' : 'expand'}`}
                    className={`flex items-center justify-between cursor-pointer group/item -mx-1 px-1 rounded-md hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => !loading && toggleCode(code)}
                    onKeyDown={(e) => {
                      if (!loading && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        toggleCode(code);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 rounded-full bg-primary/5 group-hover/item:bg-primary/10 transition-colors">
                        {selectedCode?.id === code.id ? (
                          <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        ) : (
                          <FolderClosed className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/70" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-medium tracking-tight">
                          {new Date(code.created_at).toLocaleString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground/90">
                          <CodeTimer expiresAt={code.expires_at} />
                        </div>
                      </div>
                    </div>
                    <div className="opacity-60 group-hover/item:opacity-100 transition-opacity">
                      {selectedCode?.id === code.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {selectedCode?.id === code.id && (
                    <div
                      className="mt-4 sm:mt-6 p-4 sm:p-6 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-inner"
                      role="region"
                      aria-label="Code details"
                    >
                      <div
                        role="textbox"
                        aria-readonly="true"
                        aria-label="Generated code"
                        className="text-2xl sm:text-4xl font-mono tracking-[0.25em] sm:tracking-[0.5em] text-primary font-bold text-center overflow-x-auto scrollbar-none"
                      >
                        <div className="inline-block min-w-min">
                          {code.code}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loading || copyingCode === code.code}
                          className="flex items-center gap-1.5 sm:gap-2 hover:bg-primary/10 hover:text-primary active:scale-95 transition-all text-sm sm:text-base px-3 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!loading && !copyingCode) handleCopy(code.code);
                          }}
                        >
                          {copyingCode === code.code ? (
                            <>
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin rounded-full" />
                              <span>Copying...</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Copy Code</span>
                              <span className="sm:hidden">Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button 
        className="w-full flex items-center gap-2 bg-primary/90 hover:bg-primary transition-colors shadow-lg hover:shadow-xl disabled:opacity-50" 
        onClick={onAddCode}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin rounded-full" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Add New Code</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default CodeGroupView;
