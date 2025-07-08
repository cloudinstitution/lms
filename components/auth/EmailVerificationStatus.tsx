// components/auth/EmailVerificationStatus.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

interface EmailVerificationStatusProps {
  uid: string;
  email: string;
  onVerificationComplete?: () => void;
}

export default function EmailVerificationStatus({ 
  uid, 
  email, 
  onVerificationComplete 
}: EmailVerificationStatusProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const checkVerificationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/auth/verification-status?uid=${uid}`);
      const data = await response.json();
      
      if (data.emailVerified) {
        setIsVerified(true);
        onVerificationComplete?.();
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
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
        toast.error(result.error || "Failed to resend verification email");
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      toast.error("Failed to resend verification email");
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

  if (isVerified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={20} />
            <span className="font-medium">Email Verified!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            The student's email has been successfully verified.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Mail size={20} />
          Email Verification Pending
        </CardTitle>
        <CardDescription className="text-amber-700">
          A verification email has been sent to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-amber-600" />
          <span className="text-sm text-amber-700">
            {isLoading ? "Checking..." : "Waiting for email verification"}
          </span>
        </div>
        
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resendVerificationEmail}
            disabled={isResending}
            className="w-full"
          >
            {isResending ? "Resending..." : "Resend Verification Email"}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={checkVerificationStatus}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Checking..." : "Check Status"}
          </Button>
        </div>
        
        <p className="text-xs text-amber-600 mt-3">
          The student should check their email inbox and spam folder for the verification email.
        </p>
      </CardContent>
    </Card>
  );
}
