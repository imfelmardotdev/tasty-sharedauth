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
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { type Role } from "@/lib/utils/roles";

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
}

const CodeGroupView = ({ group, onShare, onAddCode }: CodeGroupViewProps) => {
  const { toast } = useToast();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<Code | null>(null);
  const currentRole = localStorage.getItem("userRole") as Role;

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(prev => !prev);

  const handleCopy = async (code: string) => {
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
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        currentRole={currentRole}
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <Header 
        currentRole={currentRole}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      <main className="flex-1 pt-16 w-full">
        <div className="space-y-4 sm:space-y-6 p-2 md:pl-[16.5rem] md:pr-6 md:pt-6">
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1 flex-1 min-w-0 mr-4">
                <CardTitle className="text-2xl font-bold tracking-tight truncate">{group.title}</CardTitle>
                {group.description && (
                  <p className="text-sm text-muted-foreground/80 line-clamp-2">
                    {group.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <Badge 
                  variant="outline" 
                  className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm border-primary/20"
                >
                  <Users className="w-3 h-3 text-primary/70" />
                  <span className="font-medium">{group.memberCount || 0}</span>
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onShare}
                  className="h-9 w-9 sm:h-8 sm:w-8 opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/10"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="space-y-4">
                {group.codes?.map((code) => (
                  <Card
                    key={code.id}
                    className={`relative overflow-hidden group bg-card/30 backdrop-blur-sm border border-border/30 shadow-md hover:shadow-lg transition-all duration-300 ${selectedCode?.id === code.id ? "ring-2 ring-primary/20" : ""}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="p-2 sm:p-4 relative">
                      <div
                        className="flex items-center justify-between cursor-pointer group/item"
                        onClick={() => toggleCode(code)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/5 group-hover/item:bg-primary/10 transition-colors">
                            {selectedCode?.id === code.id ? (
                              <FolderOpen className="h-4 w-4 text-primary" />
                            ) : (
                              <FolderClosed className="h-4 w-4 text-primary/70" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium tracking-tight">
                              {new Date(code.created_at).toLocaleString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground/90">
                              <CodeTimer expiresAt={code.expires_at} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedCode?.id === code.id && (
                        <div className="mt-3 sm:mt-6 p-2 sm:p-6 bg-background/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-border/50 shadow-inner">
                          <div className="grid grid-rows-[1fr_auto] gap-4 sm:gap-6 min-h-[140px] sm:min-h-[180px]">
                            <div className="text-2xl sm:text-4xl font-mono tracking-[0.25em] sm:tracking-[0.5em] text-primary font-bold text-center flex items-center justify-center break-all sm:break-normal px-2">
                              {code.code}
                            </div>
                            <div className="flex justify-center border-t border-border/10 pt-4 sm:pt-6">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => handleCopy(code.code)}
                              >
                                <Copy className="h-4 w-4" />
                                <span>Copy Code</span>
                              </Button>
                            </div>
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
            className="w-full flex items-center gap-2 bg-primary/90 hover:bg-primary transition-colors shadow-lg hover:shadow-xl" 
            onClick={onAddCode}
          >
            <Plus className="w-4 h-4" />
            Add New Code
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CodeGroupView;
