import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { authenticator } from 'otplib';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LockKeyhole } from 'lucide-react';

const formSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits'),
});

interface TwoFactorVerificationProps {
  secret: string;
  onVerify: () => void;
  onCancel: () => void;
}

const TwoFactorVerification = ({
  secret,
  onVerify,
  onCancel,
}: TwoFactorVerificationProps) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentCode, setCurrentCode] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          // Generate new code when timer reaches 0
          const newCode = authenticator.generate(secret);
          setCurrentCode(newCode);
          return 30;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secret]);

  useEffect(() => {
    // Generate initial code
    const code = authenticator.generate(secret);
    setCurrentCode(code);
  }, [secret]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const isValid = authenticator.verify({
      token: values.code,
      secret: secret,
    });

    if (isValid) {
      onVerify();
    } else {
      form.setError('code', {
        message: 'Invalid verification code',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LockKeyhole className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>Enter the verification code to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 text-center">
            <p className="text-2xl font-mono tracking-wider">{currentCode}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Code refreshes in {timeLeft} seconds
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 6-digit code"
                        {...field}
                        maxLength={6}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit">Verify</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFactorVerification;