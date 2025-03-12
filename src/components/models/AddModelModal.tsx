import React, { useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import QrScanner from "qr-scanner";
import { generateTOTP } from "@/lib/utils/totp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { QrCode, Key } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formSchema, type FormValues } from "./schema";

interface AddModelModalProps {
  open?: boolean;
  onClose?: () => void;
  onSubmit?: (values: FormValues) => void;
}

const AddModelModal = ({
  open = false,
  onClose = () => {},
  onSubmit = () => {},
}: AddModelModalProps) => {
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      code: "",
      link: "",
      totp_secret: "",
    },
  });

  const handleSecretInput = async (secret: string) => {
    if (!secret.trim()) return;

    try {
      const code = await generateTOTP(secret);
      form.setValue("code", code);
      form.setValue("totp_secret", secret);
    } catch (error) {
      console.error("TOTP generation error:", error);
      toast({
        title: "Invalid Secret",
        description: "The secret key format is not valid or supported. Please check your input.",
        variant: "destructive",
      });
    }
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const url = result.data;
          const params = new URLSearchParams(new URL(url).search);
          const secret = params.get("secret");
          if (secret) {
            handleSecretInput(secret);
            stopScanner();
          }
        },
        { returnDetailedScanResult: true },
      );

      setQrScanner(scanner);
      await scanner.start();
      setScannerActive(true);
    } catch (error) {
      console.error("Failed to start QR scanner:", error);
      toast({
        title: "Error",
        description: "Failed to start QR scanner. Please ensure camera permissions are granted.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    if (qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      setQrScanner(null);
      setScannerActive(false);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (err) {
      console.error("Error adding model:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Add New Code</DialogTitle>
          <DialogDescription>
            Add a new code with its authentication details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="qr" className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  Scan QR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <FormField
                  control={form.control}
                  name="totp_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TOTP Secret</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter TOTP secret key"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleSecretInput(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="qr" className="space-y-4">
                <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-muted rounded-lg overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  {!scannerActive ? (
                    <Button
                      type="button"
                      onClick={startScanner}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    >
                      Start Scanner
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopScanner}
                      variant="secondary"
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                    >
                      Stop Scanner
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter code name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username or email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Generated Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Code will be generated from TOTP secret"
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter related URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Code</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddModelModal;
