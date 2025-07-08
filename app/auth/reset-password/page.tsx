// app/auth/reset-password/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (result.success) {
        setEmailSent(true);
        toast.success("Password reset email sent successfully");
      } else {
        setError(result.error || "Failed to send password reset email");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setError("Failed to send password reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              Email Sent!
            </CardTitle>
            <CardDescription>
              Check your email for password reset instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">
                  If an account with <strong>{email}</strong> exists, you'll receive a password reset link shortly.
                </p>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Didn't receive the email? Check your spam folder or try again.</p>
              </div>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                    setError("");
                  }}
                  className="w-full"
                >
                  Try Different Email
                </Button>
                
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail size={20} />
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full"
            >
              {isLoading ? "Sending..." : "Send Reset Email"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Link href="/login">
              <Button variant="ghost" className="text-sm">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
