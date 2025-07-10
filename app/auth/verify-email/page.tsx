// app/auth/verify-email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);
  
  const uid = searchParams.get('uid');
  const email = searchParams.get('email');

  const checkVerificationStatus = async () => {
    if (!uid) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/auth/verification-status?uid=${uid}`);
      const data = await response.json();
      
      if (data.emailVerified) {
        setIsVerified(true);
        setError("");
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setError("Failed to check verification status");
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      setError("Email not provided");
      return;
    }

    try {
      setIsResending(true);
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          email: email
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success("Verification email resent successfully");
      } else {
        setError(result.error || "Failed to resend verification email");
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      setError("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    // Check status immediately
    checkVerificationStatus();
    
    // Check every 5 seconds until verified
    const interval = setInterval(() => {
      if (!isVerified) {
        checkVerificationStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [uid, isVerified]);

  if (!uid || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              This verification link is invalid or expired.
            </p>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
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
            {isVerified ? (
              <>
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-green-600">Email Verified!</span>
              </>
            ) : (
              <>
                <Mail size={20} className="text-blue-600" />
                <span className="text-blue-600">Email Verification</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isVerified 
              ? "Your email has been successfully verified."
              : "Please check your email for the verification link."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isVerified ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">
                  Your email address <strong>{email}</strong> has been verified successfully.
                </p>
              </div>
              
              <Link href="/login">
                <Button className="w-full">Continue to Login</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-600">
                  We've sent a verification email to <strong>{email}</strong>. 
                  Please check your inbox and click the verification link.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                {isLoading ? "Checking verification status..." : "Waiting for verification..."}
              </div>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={resendVerificationEmail}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? "Resending..." : "Resend Verification Email"}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={checkVerificationStatus}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Checking..." : "Check Status"}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Didn't receive the email? Check your spam folder or try resending.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            <span className="text-blue-600">Loading...</span>
          </CardTitle>
          <CardDescription>
            Please wait while we load the verification page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
            Loading verification page...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
