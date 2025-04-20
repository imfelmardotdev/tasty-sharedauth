import React, { useState } from "react";
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
import { Key, UserPlus } from "lucide-react"; // Added UserPlus for sign up icon

// Updated schema for sign up
const formSchema = z.object({
  name: z.string().optional(), // Optional for sign in, required for sign up via refinement
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(), // Optional for sign in, required for sign up via refinement
})
.refine((data) => {
  // If name is present (sign up mode), confirmPassword must match password
  if (data.name) {
    return data.password === data.confirmPassword;
  }
  return true; // Always valid if name is not present (sign in mode)
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Error applies to confirmPassword field
})
.refine((data) => {
  // If confirmPassword is provided (sign up mode), name must also be provided
  if (data.confirmPassword) {
    return !!data.name && data.name.length > 0;
  }
  return true; // Always valid if confirmPassword is not present (sign in mode)
}, {
  message: "Name is required for sign up",
  path: ["name"], // Error applies to name field
});


import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/db/queries";
import { useToast } from "@/components/ui/use-toast"; // Added useToast for feedback

const SignIn = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn"); // State for mode
  const { toast } = useToast(); // Toast hook

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", // Add default for name
      email: "",
      password: "",
      confirmPassword: "", // Add default for confirmPassword
    },
  });

  // Reset form fields when mode changes
  React.useEffect(() => {
    form.reset();
  }, [mode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    form.clearErrors(); // Clear previous errors

    if (mode === "signIn") {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Sign in failed, no user data returned.");


        // Get user profile with role
        const userProfile = await getUser(values.email);

        if (userProfile) {
          // Ensure role is properly capitalized
          const validRoles = ["Admin", "Manager", "User"];
          const normalizedRole = validRoles.find(r => r.toLowerCase() === userProfile.role.toLowerCase()) || "User";
          localStorage.setItem("userRole", normalizedRole);
          localStorage.setItem("userEmail", userProfile.email);
          localStorage.setItem("userId", userProfile.id);
          navigate("/dashboard");
        } else {
          // This case might happen if user exists in auth but not in profiles table
          console.error("User authenticated but profile not found in database.");
          // Attempt to create profile? Or show error? For now, show error.
           toast({
            title: "Sign In Error",
            description: "User profile not found. Please contact support.",
            variant: "destructive",
          });
          // Optionally sign the user out again
          // await supabase.auth.signOut();
        }
      } catch (error: any) {
        console.error("Sign in error:", error);
        toast({
          title: "Sign In Failed",
          description: error.message || "Invalid email or password.",
          variant: "destructive",
        });
        form.setError("root", {
          message: error.message || "Invalid email or password",
        });
      }
    } else { // mode === "signUp"
      // Ensure name and confirmPassword are provided for sign up
      if (!values.name || !values.confirmPassword) {
         form.setError("root", { message: "Name and Confirm Password are required for sign up." });
         return;
      }
       if (values.password !== values.confirmPassword) {
         form.setError("confirmPassword", { message: "Passwords don't match." });
         return;
      }

      try {
        // Sign up the user with Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.name,
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Sign up failed, no user data returned.");

        // Show success message
        toast({
          title: "Account Created Successfully",
          description: "We've sent you a welcome email. You can now sign in with your credentials.",
          duration: 6000, // Show for longer
        });

        // Clear the form and switch to sign in mode
        form.reset();
        setMode("signIn");

      } catch (error: any) {
        console.error("Sign up error:", error);
         toast({
          title: "Sign Up Failed",
          description: error.message || "Could not create account.",
          variant: "destructive",
        });
        form.setError("root", {
          message: error.message || "Could not create account.",
        });
      }
    }
  };

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === "signIn" ? "signUp" : "signIn"));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md"> {/* Adjusted width for responsiveness */}
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {mode === "signIn" ? (
              <Key className="w-12 h-12 text-primary" />
            ) : (
              <UserPlus className="w-12 h-12 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {mode === "signIn" ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {mode === "signIn"
              ? "Sign in to access your Sharedauth codes"
              : "Enter your details to create an account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {mode === "signUp" && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your e-mail"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "signUp" && (
                 <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.formState.errors.root && (
                <p className="text-sm text-red-500 text-center"> {/* Centered error */}
                  {form.formState.errors.root.message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? (mode === 'signIn' ? 'Signing In...' : 'Signing Up...')
                  : (mode === 'signIn' ? 'Sign In' : 'Sign Up')}
              </Button>

              <div className="text-center mt-2 flex justify-center items-center gap-2"> {/* Centered and spaced buttons */}
                {mode === "signIn" && (
                  <Button
                    type="button" // Prevent form submission
                    variant="link"
                    className="text-sm text-muted-foreground p-0 h-auto" // Adjusted padding/height
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot Password?
                  </Button>
                )}
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "signIn" ? (
                  <>
                    Don't have an account?{" "}
                    <Button
                      type="button" // Prevent form submission
                      variant="link"
                      className="p-0 h-auto" // Adjusted padding/height
                      onClick={toggleMode}
                    >
                      Sign Up
                    </Button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                     <Button
                      type="button" // Prevent form submission
                      variant="link"
                      className="p-0 h-auto" // Adjusted padding/height
                      onClick={toggleMode}
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
