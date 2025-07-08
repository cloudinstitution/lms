"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/firebase"
import { setAdminSession, storeStudentSession, storeAdminSession } from "@/lib/session-storage"
import { collection, getDocs, query, where } from "firebase/firestore"
import { ArrowLeft, GraduationCap, Lock, Mail, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false)
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false)
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'newPassword'>('email')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
    setIsPasswordResetLoading(true)
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
          setIsPasswordResetMode(false)
          setResetStep('email')
          setFormData({
            email: "",
            password: "",
            otp: "",
            newPassword: "",
            confirmPassword: ""
          })
        } else {
          setError(result.error || "Failed to reset password")
        }
      }
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Failed to process password reset")
    } finally {
      setIsPasswordResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Check students collection
      const studentQuery = query(collection(db, "students"), where("username", "==", formData.email))
      const studentSnapshot = await getDocs(studentQuery)

      if (!studentSnapshot.empty) {
        const userDoc = studentSnapshot.docs[0].data()
        if (userDoc.password === formData.password) {
          // Fetch full student data
          const studentData = {
            id: studentSnapshot.docs[0].id,
            name: userDoc.name,
            username: userDoc.username,
            coursesEnrolled: userDoc.coursesEnrolled,
            studentId: userDoc.studentId,
            joinedDate: userDoc.joinedDate,
            courseName: userDoc.courseName || "N/A",
            phoneNumber: userDoc.phoneNumber,
          }
          // Store student data in localStorage
          storeStudentSession(studentData)
          // Navigate to student dashboard
          router.push("/student/dashboard")
          return
        } else {
          setError("Invalid password.")
          return
        }
      }      // Check admin collection
      const adminQuery = query(collection(db, "admin"), where("username", "==", formData.email))
      const adminSnapshot = await getDocs(adminQuery)      
      if (!adminSnapshot.empty) {
        const userDoc = adminSnapshot.docs[0].data()        // Check password and valid roleId (1 for admin, 2 for teacher)
        if (userDoc.password === formData.password && (userDoc.roleId === 1 || userDoc.roleId === 2)) {          // Determine role based on roleId
          const role: 'admin' | 'teacher' = userDoc.roleId === 1 ? 'admin' : 'teacher';
          
          // Store admin data
          const adminData = {
            id: adminSnapshot.docs[0].id,
            username: userDoc.username,
            roleId: userDoc.roleId,
            role: role,
            name: userDoc.name || undefined,
            assignedCourses: userDoc.assignedCourses || []
          }
          
          // Use the proper session storage method
          storeAdminSession(adminData)
          console.log('Login successful as:', role, 'Admin data:', adminData)
          router.push("/admin/dashboard")
          return
        } else {
          setError("Invalid password or insufficient permissions.")
          return
        }
      }

      setError("User not found. Please check your email.")    
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "An error occurred. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  return (    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-slate-950 to-slate-900 p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>      <Link href="/" className="flex items-center gap-2 mb-8">
        <GraduationCap className="h-12 w-12 text-emerald-400" />
        <span className="font-bold text-2xl text-emerald-400">Cloud Institution</span>
      </Link><Card className="w-full max-w-md border-none shadow-lg relative z-10 overflow-hidden bg-slate-800/50 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center text-slate-100">
            {isPasswordResetMode 
              ? (resetStep === 'email' 
                  ? "Reset Password" 
                  : resetStep === 'otp' 
                    ? "Verify OTP" 
                    : "Set New Password"
                )
              : "Welcome Back"
            }
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            {isPasswordResetMode 
              ? (resetStep === 'email' 
                  ? "Enter your email to receive an OTP code"
                  : resetStep === 'otp' 
                    ? "Enter the 6-digit OTP code sent to your email"
                    : "Create a new secure password for your account"
                )
              : "Enter your credentials to access your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPasswordResetMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm bg-red-950/50 border border-red-800 text-red-400 rounded-md">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-200">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsPasswordResetMode(true)}
                    className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-medium py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Sign In"}
              </Button>
            </form>
          ) : (
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
                  disabled={isPasswordResetLoading}
                >
                  {isPasswordResetLoading 
                    ? "Processing..." 
                    : resetStep === 'email' 
                      ? "Send OTP" 
                      : resetStep === 'otp' 
                        ? "Verify OTP" 
                        : "Reset Password"
                  }
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsPasswordResetMode(false);
                    setResetStep('email');
                    setError("");
                    setFormData({
                      email: "",
                      password: "",
                      otp: "",
                      newPassword: "",
                      confirmPassword: ""
                    });
                  }}
                  className="w-full text-slate-400 hover:text-slate-200"
                >
                  Back to Login
                </Button>
              </div>
            </form>
          )}
        </CardContent>        <CardFooter className="flex flex-col border-t border-slate-700 bg-slate-900/50 rounded-b-lg py-4">
          <div className="text-center text-sm text-slate-400">Secure login for students and administrators</div>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Cloud Institution. All rights reserved.</p>
      </div>
    </div>
  )
}
