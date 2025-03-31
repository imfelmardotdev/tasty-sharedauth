import React, { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import QrScanner from "qr-scanner";
import { generateTOTP } from "@/lib/utils/totp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Key } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(6, "Code must be at least 6 characters"),
  expiration: z.string().min(1, "Expiration time is required"),
  notes: z.string().optional(),
  secret: z.string().optional(),
});

interface AddCodeModalProps {
  open?: boolean;
  onClose?: () => void;
  onSubmit?: (values: z.infer<typeof formSchema>) => void;
}

const AddCodeModal = ({
  open = false,
  onClose = () => {},
  onSubmit = () => {},
}: AddCodeModalProps) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [hasScannedCode, setHasScannedCode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const { toast } = useToast();

  // Disable zooming when modal is open
  useEffect(() => {
    if (open) {
      const viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewportMeta);

      return () => {
        document.head.removeChild(viewportMeta);
      };
    }
  }, [open]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      notes: "",
      secret: "",
      expiration: "30s",
    },
  });

  const handleSuccessfulScan = (secret: string, issuer: string | null, account: string | null) => {
    if (hasScannedCode) return; // Prevent multiple scans
    
    setHasScannedCode(true);
    form.setValue("secret", secret);
    handleSecretInput(secret);
    const name = issuer && account ? `${issuer} (${account})` : issuer || account || "TOTP Code";
    form.setValue("name", name);
    stopScanner();
    
    toast({
      title: "QR Code Scanned Successfully",
      description: "The authentication code has been added.",
      variant: "default",
    });
    
    // Scroll to form fields after successful scan
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    setHasScannedCode(false); // Reset scan state

    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const url = result.data;
          const params = new URLSearchParams(new URL(url).search);
          const secret = params.get("secret");
          const issuer = params.get("issuer");
          const account = params.get("account");
          if (secret) {
            handleSuccessfulScan(secret, issuer, account);
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

  const handleSecretInput = async (secret: string) => {
    if (!secret.trim()) return;

    try {
      const code = await generateTOTP(secret);
      form.setValue("code", code);
      form.setValue("secret", secret);
      if (!form.getValues("name")) {
        form.setValue("name", "TOTP Code");
      }
    } catch (error) {
      console.error("TOTP generation error:", error);
      toast({
        title: "Invalid Secret",
        description: "The secret key format is not valid or supported. Please check your input.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-4">
          <DialogTitle>Add New 2FA Code</DialogTitle>
          <DialogDescription>
            Enter the details for the new 2FA code or scan a QR code.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-y-auto space-y-4 px-4">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sticky top-0 bg-background z-10">
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
                  name="secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret Key</FormLabel>
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

              <TabsContent value="qr" className="space-y-4 relative">
                <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-muted rounded-lg overflow-hidden touch-none">
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

            <div ref={formRef} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name for this code" {...field} />
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
                        placeholder="Code will appear here"
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
                name="expiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expiration time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30s">30 seconds</SelectItem>
                        <SelectItem value="1m">1 minute</SelectItem>
                        <SelectItem value="5m">5 minutes</SelectItem>
                        <SelectItem value="15m">15 minutes</SelectItem>
                        <SelectItem value="30m">30 minutes</SelectItem>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="1d">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="sticky bottom-0 bg-background py-4 mt-8">
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

export default AddCodeModal;
