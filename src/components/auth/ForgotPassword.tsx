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
import { Key, Eye, EyeOff } from "lucide-react"; // Keep Eye icons if needed for password fields later
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
// Removed getUser import as it's not used in this flow directly

// Schema for the initial email request
const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Schema for the code verification and new password step
const resetSchema = z.object({
  email: z.string().email(), // Keep email to pass to verifyOtp
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], // Apply error to confirmPassword field
});


type Step = "request" | "verify";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState<Step>("request");
  const [emailForVerification, setEmailForVerification] = React.useState(""); // Store email for the verify step

  // Form for the initial email request
  const requestForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Form for the verification and password reset step
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "", // Will be set when moving to verify step
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handler for requesting the reset code
  const handleRequestCode = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    try {
      console.log("Requesting password reset OTP for:", values.email);
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          // Important: This tells Supabase this OTP is for password recovery
          // It prevents the user from being logged in automatically after verification
          shouldCreateUser: false,
        }
      });

      if (error) {
        console.error("Request OTP error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send reset code. Please check the email and try again.",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a 6-digit code.",
        });
        setEmailForVerification(values.email); // Store email
        resetForm.setValue("email", values.email); // Set email in the second form
        setStep("verify"); // Move to the next step
      }
    } catch (error: any) {
      console.error("Request OTP error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for verifying the code and setting the new password
  const handleVerifyAndReset = async (values: z.infer<typeof resetSchema>) => {
     setIsLoading(true);
     try {
        console.log("Verifying code and resetting password for:", values.email);

        // 1. Verify the OTP code
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            email: values.email,
            token: values.code,
            type: 'recovery', // Use 'recovery' type for password reset flow
        });

        if (verifyError || !verifyData?.session) { // Check for error or missing session
            console.error("Verify OTP error:", verifyError);
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: verifyError?.message || "Invalid or expired code. Please request a new one.",
            });
            // Optionally reset to 'request' step or allow retry
            // setStep("request");
            // requestForm.reset();
            // resetForm.reset();
            return; // Stop execution if verification fails
        }

        console.log("OTP verified successfully. Session:", verifyData.session);

        // 2. Update the password
        // Note: verifyOtp with type 'recovery' grants temporary ability to update password
        const { error: updateError } = await supabase.auth.updateUser({
            password: values.password,
        });

        if (updateError) {
            console.error("Update password error:", updateError);
            toast({
                variant: "destructive",
                title: "Error",
                description: updateError.message || "Failed to update password. Please try again.",
            });
        } else {
            toast({
                title: "Password Reset Successful",
                description: "Your password has been updated. You can now sign in.",
            });
            navigate("/signin"); // Redirect to sign-in page
        }
     } catch (error: any) {
        console.error("Reset password error:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "An unexpected error occurred during password reset.",
        });
     } finally {
        setIsLoading(false);
     }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Key className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {step === "request"
              ? "Enter your email to receive a 6-digit reset code."
              : "Enter the code from your email and set a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "request" && (
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(handleRequestCode)} className="space-y-4">
                <FormField
                  control={requestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          disabled={isLoading}
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
                  {isLoading ? "Sending Code..." : "Send Reset Code"}
                </Button>
              </form>
            </Form>
          )}

          {step === "verify" && (
             <Form {...resetForm}>
               <form onSubmit={resetForm.handleSubmit(handleVerifyAndReset)} className="space-y-4">
                 {/* Email is hidden but included in the form data */}
                 <input type="hidden" {...resetForm.register("email")} />

                 <FormField
                   control={resetForm.control}
                   name="code"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Verification Code</FormLabel>
                       <FormControl>
                         <Input
                           placeholder="Enter 6-digit code"
                           {...field}
                           disabled={isLoading}
                           maxLength={6}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={resetForm.control}
                   name="password"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>New Password</FormLabel>
                       <FormControl>
                         <Input
                           type="password"
                           placeholder="Enter new password"
                           {...field}
                           disabled={isLoading}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={resetForm.control}
                   name="confirmPassword"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Confirm New Password</FormLabel>
                       <FormControl>
                         <Input
                           type="password"
                           placeholder="Confirm new password"
                           {...field}
                           disabled={isLoading}
                         />
                       </FormControl>
                       <FormMessage /> {/* Shows "Passwords do not match" error here */}
                     </FormItem>
                   )}
                 />

                 <Button
                   type="submit"
                   className="w-full"
                   disabled={isLoading}
                 >
                   {isLoading ? "Resetting..." : "Reset Password"}
                 </Button>
               </form>
             </Form>
          )}

          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-sm text-muted-foreground"
              onClick={() => {
                // Reset state if going back
                setStep("request");
                requestForm.reset();
                resetForm.reset();
                navigate("/signin");
              }}
              disabled={isLoading}
            >
              Back to Sign In
            </Button>
            {step === "verify" && (
               <Button
                 variant="link"
                 className="text-sm text-muted-foreground pl-4"
                 onClick={() => {
                   setStep("request");
                   resetForm.reset(); // Clear verify form but keep email in request form
                   requestForm.setValue("email", emailForVerification);
                 }}
                 disabled={isLoading}
               >
                 Request new code?
               </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
