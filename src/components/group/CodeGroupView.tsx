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
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
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

  return (
    <main className="flex-1 md:ml-64 ml-0 pt-16 px-0 container mx-auto max-w-7xl">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Card className="bg-card hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 p-4 sm:p-6 pb-2 sm:pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight break-words">{group.title}</CardTitle>
              {group.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {group.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-center">
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 sm:gap-1.5 bg-background/50 backdrop-blur-sm border-primary/20 text-xs sm:text-sm py-1"
              >
                <Users className="w-3 h-3 text-primary/70" />
                <span className="font-medium">{group.memberCount || 0}</span>
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onShare}
                disabled={loading}
                className="opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/10 disabled:opacity-40 h-8 w-8 sm:h-9 sm:w-9"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {(!group.codes || group.codes.length === 0) && (
                <div className="col-span-full text-center py-8 sm:py-12 text-muted-foreground/80 text-sm sm:text-base">
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
                  className={`bg-card/50 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group ${selectedCode?.id === code.id ? "ring-2 ring-primary/20" : ""}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div
                      role="button"
                      tabIndex={loading ? -1 : 0}
                      aria-expanded={selectedCode?.id === code.id}
                      aria-label={`Code from ${new Date(code.created_at).toLocaleString()}, press Enter to ${selectedCode?.id === code.id ? 'collapse' : 'expand'}`}
                      className="flex items-center justify-between group/item rounded-md hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"
                      onClick={() => !loading && toggleCode(code)}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="p-1.5 sm:p-2 rounded-full bg-primary/5 group-hover/item:bg-primary/10 transition-colors shrink-0">
                          {selectedCode?.id === code.id ? (
                            <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                          ) : (
                            <FolderClosed className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/70" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm sm:text-base font-medium tracking-tight truncate">
                            {new Date(code.created_at).toLocaleString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground/90 truncate">
                            <CodeTimer expiresAt={code.expires_at} />
                          </div>
                        </div>
                      </div>
                      <div className="opacity-60 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2">
                        {selectedCode?.id === code.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {selectedCode?.id === code.id && (
                      <div
                        className="mt-4 space-y-4"
                        role="region"
                        aria-label="Code details"
                      >
                        <div className="p-3 sm:p-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-inner">
                          <div
                            role="textbox"
                            aria-readonly="true"
                            aria-label="Generated code"
                            className="text-lg sm:text-2xl lg:text-3xl font-mono tracking-[0.15em] sm:tracking-[0.25em] lg:tracking-[0.35em] text-primary font-bold text-center break-all"
                          >
                            {code.code}
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading || copyingCode === code.code}
                            className="flex items-center gap-1.5 sm:gap-2 hover:bg-primary/10 hover:text-primary active:scale-95 transition-all text-sm sm:text-base py-2 px-3 sm:px-4 h-auto min-h-[2.5rem] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
          className="w-full flex items-center gap-2 bg-primary/90 hover:bg-primary transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 py-2.5 sm:py-3 h-auto touch-manipulation"
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
    </main>
  );
};

export default CodeGroupView;
