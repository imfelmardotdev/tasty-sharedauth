import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Process auth parameters
  const rawToken = searchParams.get("token_hash") || searchParams.get("token");
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  
  // Process token based on auth type
  const token = rawToken && (type === "recovery" 
    ? rawToken 
    : rawToken.replace(/-/g, "+").replace(/_/g, "/")
  );
  
  // Debug logging
  console.log('Auth callback params:', {
    type,
    hasToken: !!token,
    hasCode: !!code,
    rawToken,
    processedToken: token,
    error,
    errorDescription,
    allParams: Object.fromEntries(searchParams.entries())
  });

  // Handle URL error params in useEffect
  useEffect(() => {
    if (error || errorDescription) {
      console.error("Auth error from URL params:", { error, errorDescription });
      setStatus({
        type: "error",
        message: errorDescription || "Authentication failed"
      });
    }
  }, [error, errorDescription]);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const handleAuth = async () => {
      if (!token && !code) return;

      try {
        setIsLoading(true);
        console.log('Processing auth callback:', { type, token, code });

        switch (type) {
          case "recovery": {
            // For recovery type, verify session then show form
            console.log("Recovery flow detected");
            
            // Verify the recovery session if code exists
            if (code) {
              const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionError) {
                console.error("Session exchange error:", sessionError);
                throw sessionError;
              }
              console.log("Recovery session established");
            }

            setStatus({
              type: "success",
              message: "Please set your new password below",
            });
            break;
          }
          
          case "email": {
            if (!token) throw new Error("No token for email verification");
            
            // For email verification
            console.log("Email verification flow detected");
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "email"
            });

            if (error) throw error;

            setStatus({
              type: "success",
              message: "Email verified successfully! You can now sign in.",
            });
            setTimeout(() => navigate("/signin"), 2000);
            break;
          }

          default:
            console.error("Unsupported auth type:", type);
            throw new Error(`Unsupported auth type: ${type}`);
        }
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus({
          type: "error",
          message: error.message || "Verification failed",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only run if we're not already showing the password form
    if (!status) {
      handleAuth();
    }
  }, [token, code, type, navigate, status]);

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (type !== "recovery") {
      console.error("Invalid auth type for password reset:", { type });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting password update...");
      
      // PKCE flow - we're logged in at this point, just update the password
      const { data, error } = await supabase.auth.updateUser({ 
        password: values.password
      });

      if (error) {
        console.error("Password update failed:", error);
        throw error;
      }

      // Show success message and redirect
      const successMessage = "Password updated successfully. Please sign in with your new password.";
      console.log(successMessage);
      
      toast({
        title: "Success",
        description: successMessage,
      });

      // Wait a moment before redirecting to let user see the success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate("/signin", { replace: true });
      
    } catch (error: any) {
      const errorMessage = error.message || "Failed to update password";
      console.error("Password reset error:", { error, message: errorMessage });
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Processing</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {type === "recovery" ? "Reset Password" : "Email Verification"}
          </CardTitle>
          <CardDescription>
            {type === "recovery" 
              ? "Enter your new password" 
              : "Verifying your email address"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status && (
            <Alert variant={status.type === "success" ? "default" : "destructive"} className="mb-4">
              <AlertDescription>
                {status.message}
              </AlertDescription>
            </Alert>
          )}

          {type === "recovery" && status?.type === "success" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Set New Password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
