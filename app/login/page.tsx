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
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <Link
                  href="/forgot-password"
                  className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  Forgot password?
                </Link>
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
