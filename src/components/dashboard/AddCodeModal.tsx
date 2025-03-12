import React, { useState, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      notes: "",
      secret: "",
      expiration: "30s", // Adding default expiration
    },
  });

  const startScanner = async () => {
    if (!videoRef.current) return;

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
            form.setValue("secret", secret);
            handleSecretInput(secret);
            // Set a descriptive name based on issuer and account if available
            const name = issuer && account ? `${issuer} (${account})` : issuer || account || "TOTP Code";
            form.setValue("name", name);
            toast({
              title: "QR Code Scanned Successfully",
              description: "The authentication code has been added.",
              variant: "default",
            });
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
        description:
          "Failed to start QR scanner. Please ensure camera permissions are granted.",
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
      // Only set default name if no name is set and it's not from QR scan
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
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Add New 2FA Code</DialogTitle>
          <DialogDescription>
            Enter the details for the new 2FA code or scan a QR code.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
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

              <TabsContent value="qr" className="space-y-4">
                <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
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

export default AddCodeModal;
