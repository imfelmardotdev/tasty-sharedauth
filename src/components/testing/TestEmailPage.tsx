import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const TestEmailPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signUpStatus, setSignUpStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [resetStatus, setResetStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSignUpSubmit = async (values: z.infer<typeof signUpSchema>) => {
    try {
      setIsLoading(true);
      setSignUpStatus(null);

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSignUpStatus({
        type: "success",
        message: "Please check your email for the verification link.",
      });
      
      signUpForm.reset();
      
    } catch (error: any) {
      console.error("Sign up error:", error);
      setSignUpStatus({
        type: "error",
        message: error.message || "Failed to sign up",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (values: z.infer<typeof resetSchema>) => {
    try {
      setIsLoading(true);
      setResetStatus(null);

      const { data, error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      );

      if (error) throw error;

      setResetStatus({
        type: "success",
        message: "Password reset email sent. Please check your inbox.",
      });
      
      resetForm.reset();
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      setResetStatus({
        type: "error",
        message: error.message || "Failed to send reset email",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusAlert = ({ status, type }: { 
    status: { type: "success" | "error"; message: string; } | null;
    type: "signup" | "reset"
  }) => {
    if (!status) return null;

    return (
      <Alert variant={status.type === "success" ? "default" : "destructive"} className="mt-4">
        <AlertDescription className="flex items-center gap-2">
          {status.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {status.message}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Test Page</CardTitle>
          <CardDescription>Test email verification and password reset</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="reset">Password Reset</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="test@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
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
                    {isLoading ? "Testing..." : "Test Sign Up"}
                  </Button>
                </form>
              </Form>
              <StatusAlert status={signUpStatus} type="signup" />
            </TabsContent>

            <TabsContent value="reset">
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="test@example.com"
                            {...field}
                          />
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
                    {isLoading ? "Testing..." : "Test Password Reset"}
                  </Button>
                </form>
              </Form>
              <StatusAlert status={resetStatus} type="reset" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestEmailPage;
