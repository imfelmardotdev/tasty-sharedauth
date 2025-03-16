import React from "react";
import { useNavigate } from "react-router-dom";
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
import { Key, Eye, EyeOff } from "lucide-react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { getUser } from "@/lib/db/queries";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [verifiedEmail, setVerifiedEmail] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
    criteriaMode: "all"
  });

  const onEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    try {
      setIsLoading(true);
      
      // Check if user exists
      const appUser = await getUser(values.email);
      
      if (!appUser?.id) {
        emailForm.setError("email", {
          message: "No account found with this email address",
        });
        toast({
          variant: "destructive",
          title: "Error",
          description: "No account found with this email address",
        });
        return;
      }

      setEmailVerified(true);
      setVerifiedEmail(values.email);
      setPassword("");
      setConfirmPassword("");
      passwordForm.reset({
        password: "",
        confirmPassword: ""
      });
      toast({
        title: "Email Found",
        description: "Please enter your new password",
      });

    } catch (error) {
      console.error("Email verification error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No account found with this email address",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      setIsLoading(true);
      
      if (!verifiedEmail) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Email verification required",
        });
        return;
      }

      // Get user info
      const appUser = await getUser(verifiedEmail);
      if (!appUser?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "User not found",
        });
        return;
      }

      // Update password using admin client
      const { error: updateError } = await supabaseAdmin?.auth.admin.updateUserById(
        appUser.id,
        { password: values.password }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        toast({
          variant: "destructive",
          title: "Error",
          description: updateError.message === 'Password reset rate limited'
            ? "Too many attempts. Please try again later."
            : "Failed to update password. Please try again.",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Password has been updated successfully. Please sign in with your new password.",
      });
      setIsSubmitted(true);
      
      setTimeout(() => {
        navigate("/signin");
      }, 2000);

    } catch (error) {
      console.error("Password update error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Key className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {!emailVerified 
              ? "Enter your email to proceed" 
              : `Enter new password for ${verifiedEmail}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailVerified ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
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
                  {isLoading ? "Checking..." : "Continue"}
                </Button>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => navigate("/signin")}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setPassword(newValue);
                              field.onChange(newValue);
                              passwordForm.setValue("password", newValue, {
                                shouldValidate: true,
                                shouldDirty: true
                              });
                            }}
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
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setConfirmPassword(newValue);
                              field.onChange(newValue);
                              passwordForm.setValue("confirmPassword", newValue, {
                                shouldValidate: true,
                                shouldDirty: true
                              });
                            }}
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
                  disabled={isLoading || isSubmitted}
                >
                  {isLoading ? "Updating..." : "Reset Password"}
                </Button>

                {isSubmitted && (
                  <div className="text-center text-sm text-muted-foreground">
                    Password updated successfully. Redirecting to sign in...
                  </div>
                )}

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => navigate("/signin")}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
