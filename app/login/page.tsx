"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, ArrowLeft, Mail, Lock } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { storeStudentSession, setAdminSession } from "@/lib/session-storage"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
        const userDoc = adminSnapshot.docs[0].data()
        if (userDoc.password === userDoc.password && userDoc.roleId === 1) {
          setAdminSession(true)
          router.push("/admin/dashboard")
          return
        } else {
          setError("Invalid password or insufficient permissions.")
          return
        }
      }

      setError("User not found. Please check your email.")
    } catch (err) {
      setError("An error occurred. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-emerald-50 to-teal-50 p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <Link href="/" className="flex items-center gap-2 mb-8">
        <GraduationCap className="h-12 w-12 text-emerald-600" />
        <span className="font-bold text-2xl text-emerald-800">Cloud Institution</span>
      </Link>

      <Card className="w-full max-w-md border-none shadow-lg relative z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">Welcome Back</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col border-t border-gray-100 bg-gray-50 rounded-b-lg py-4">
          <div className="text-center text-sm text-gray-600">Secure login for students and administrators</div>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Cloud Institution. All rights reserved.</p>
      </div>
    </div>
  )
}
