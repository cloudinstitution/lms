// components/auth/PhoneVerification.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/services/auth-service";

interface PhoneVerificationProps {
  uid: string;
  onVerificationComplete?: (phoneNumber: string) => void;
}

const countryCodes = [
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
];

export default function PhoneVerification({ uid, onVerificationComplete }: PhoneVerificationProps) {
  const [step, setStep] = useState<'input' | 'verify' | 'verified'>('input');
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setError("Please enter a phone number");
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    
    try {
      setIsLoading(true);
      setError("");

      // First, call our API for rate limiting
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          phoneNumber: fullPhoneNumber
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Then use Firebase Auth to send SMS
      const confirmationResult = await AuthService.setupPhoneAuth(fullPhoneNumber);
      setConfirmationResult(confirmationResult);
      setStep('verify');
      toast.success("OTP sent successfully to your phone");
      
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    if (!confirmationResult) {
      setError("Please request a new OTP");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // Verify OTP with Firebase
      const result = await AuthService.verifyPhoneOTP(confirmationResult, otp);
      
      // Update verification status in our database
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          uid: uid,
          otp: otp
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to verify phone');
      }

      setStep('verified');
      toast.success("Phone number verified successfully!");
      onVerificationComplete?.(phoneNumber);
      
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      setError(error.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verified') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={20} />
            <span className="font-medium">Phone Verified!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Your phone number has been successfully verified.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone size={20} />
          Phone Verification
        </CardTitle>
        <CardDescription>
          {step === 'input' 
            ? "Enter your phone number to receive a verification code"
            : "Enter the verification code sent to your phone"
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

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  placeholder="123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* ReCAPTCHA container - required for Firebase Phone Auth */}
            <div id="recaptcha-container"></div>

            <Button
              onClick={handleSendOTP}
              disabled={isLoading || !phoneNumber}
              className="w-full"
            >
              {isLoading ? "Sending OTP..." : "Send Verification Code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-wider"
              />
              <p className="text-sm text-muted-foreground">
                Code sent to {countryCode}{phoneNumber}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || !otp}
                className="w-full"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setStep('input');
                  setOtp("");
                  setError("");
                }}
                className="w-full"
              >
                Change Phone Number
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
