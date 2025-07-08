"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, GraduationCap, Lock, Mail, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'newPassword'>('email')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Check password strength for new password
    if (name === 'newPassword') {
      checkPasswordStrength(value)
    }
  }

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let strength = 0
    
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    if (strength >= 4 && password.length >= 8) {
      setPasswordStrength("strong")
    } else if (strength >= 2 && password.length >= 6) {
      setPasswordStrength("medium")
    } else {
      setPasswordStrength("weak")
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (resetStep === 'email') {
        // Step 1: Send OTP
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: formData.email,
            step: 'send-otp'
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success("OTP sent to your email! Please check your inbox.")
          setResetStep('otp')
        } else {
          setError(result.error || "Failed to send OTP")
        }

      } else if (resetStep === 'otp') {
        // Step 2: Verify OTP
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: formData.email,
            otp: formData.otp,
            step: 'verify-otp'
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success("OTP verified! Now set your new password.")
          setResetStep('newPassword')
        } else {
          setError(result.error || "Invalid OTP")
        }

      } else if (resetStep === 'newPassword') {
        // Step 3: Reset Password
        if (formData.newPassword !== formData.confirmPassword) {
          setError("Passwords do not match")
          return
        }

        if (formData.newPassword.length < 8) {
          setError("Password must be at least 8 characters long")
          return
        }

        if (passwordStrength === 'weak') {
          setError("Please choose a stronger password with uppercase, lowercase, numbers and special characters")
          return
        }

        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: formData.email,
            otp: formData.otp,
            newPassword: formData.newPassword,
            step: 'reset-password'
          })
        })

        const result = await response.json()

        if (result.success) {
          toast.success("Password reset successfully! You can now login with your new password.")
          router.push('/login')
        } else {
          setError(result.error || "Failed to reset password")
        }
      }
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Failed to process password reset")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      
      {/* Back to Login */}
      <Link 
        href="/login" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors z-10"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      {/* Logo */}
      <Link href="/" className="absolute top-6 right-6 flex items-center gap-2 text-slate-100 hover:text-emerald-400 transition-colors z-10">
        <GraduationCap className="h-8 w-8 text-emerald-400" />
        <span className="font-bold text-2xl text-emerald-400">Cloud Institution</span>
      </Link>

      <Card className="w-full max-w-md border-none shadow-lg relative z-10 overflow-hidden bg-slate-800/50 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center text-slate-100">
            {resetStep === 'email' 
              ? "Reset Password" 
              : resetStep === 'otp' 
                ? "Verify OTP" 
                : "Set New Password"
            }
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            {resetStep === 'email' 
              ? "Enter your email to receive an OTP code"
              : resetStep === 'otp' 
                ? "Enter the 6-digit OTP code sent to your email"
                : "Create a new secure password for your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-950/50 border border-red-800 text-red-400 rounded-md">{error}</div>
            )}

            {resetStep === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-slate-200">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-sm text-slate-400">
                  Enter your email address and we'll send you a 6-digit OTP code.
                </p>
              </div>
            )}

            {resetStep === 'otp' && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-200">
                  OTP Code
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    value={formData.otp}
                    onChange={handleChange}
                    className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 text-center text-lg tracking-widest"
                  />
                </div>
                <p className="text-sm text-slate-400">
                  Check your email <strong>{formData.email}</strong> for the OTP code.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResetStep('email');
                    setFormData(prev => ({ ...prev, otp: '' }));
                  }}
                  className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  Didn't receive OTP? Change email
                </button>
              </div>
            )}

            {resetStep === 'newPassword' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-200">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      required
                      minLength={8}
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.newPassword && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Password strength:</span>
                      {passwordStrength === "weak" && <span className="text-red-500">Weak</span>}
                      {passwordStrength === "medium" && <span className="text-yellow-500">Medium</span>}
                      {passwordStrength === "strong" && <span className="text-green-500">Strong</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-200">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-slate-400">
                    Password should be at least 8 characters with uppercase, lowercase, number and special character.
                  </p>
                  {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                    <p className="text-sm text-red-400">Passwords do not match</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-medium py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading 
                  ? "Processing..." 
                  : resetStep === 'email' 
                    ? "Send OTP" 
                    : resetStep === 'otp' 
                      ? "Verify OTP" 
                      : "Reset Password"
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
