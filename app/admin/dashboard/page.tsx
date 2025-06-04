"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { addDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import emailjs from "@emailjs/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ✅ EmailJS Config
const SERVICE_ID = "service_0wpennn"
const TEMPLATE_ID = "template_zly25zz"
const PUBLIC_KEY = "f_2D0VC3LQZjhZDMC"

export default function AdminDashboard() {
  const [newStudent, setNewStudent] = useState({
    name: "",
    username: "",
    password: "",
    phoneNumber: "",
    coursesEnrolled: 0,
    studentId: "",
    joinedDate: new Date().toISOString(),
    courseName: "",
    courseID: "",
  })
  const [error, setError] = useState("")
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)

  // ✅ Initialize EmailJS
  useEffect(() => {
    emailjs.init(PUBLIC_KEY)
  }, [])

  // ✅ Helper to get next student ID (CI + year + padded number)
  const getNextStudentId = async () => {
    try {
      const snapshot = await getDocs(collection(db, "students"))
      let maxNumber = 0
      const currentYear = new Date().getFullYear()
      const prefix = `CI${currentYear}`

      snapshot.forEach((doc) => {
        const sid = doc.data().studentId
        if (typeof sid === "string" && sid.startsWith(prefix)) {
          const numberPart = sid.replace(prefix, "")
          const number = Number.parseInt(numberPart, 10)
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number
          }
        }
      })

      const nextNumber = (maxNumber + 1).toString().padStart(3, "0") // e.g., 3 → '004'
      const nextId = `${prefix}${nextNumber}`
      setNewStudent((prev) => ({ ...prev, studentId: nextId }))
    } catch (err) {
      console.error("Failed to get next student ID:", err)
    }
  }

  // ✅ Call it once when the component loads
  useEffect(() => {
    getNextStudentId()
  }, [])

  const handleCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreatingStudent(true)

    if (!newStudent.username.trim() || !newStudent.password.trim() || !newStudent.name.trim()) {
      setError("Please fill in all fields.")
      setIsCreatingStudent(false)
      return
    }

    try {
      // 1. Add to Firestore
      await addDoc(collection(db, "students"), {
        name: newStudent.name,
        username: newStudent.username,
        password: newStudent.password,
        phoneNumber: newStudent.phoneNumber,
        coursesEnrolled: newStudent.coursesEnrolled,
        studentId: newStudent.studentId,
        joinedDate: newStudent.joinedDate,
        courseName: newStudent.courseName,
        courseID: newStudent.courseID,
      })

      // 2. Send Email via EmailJS
      const emailParams = {
        username: newStudent.username,
        password: newStudent.password,
        name: newStudent.name,
        phoneNumber: newStudent.phoneNumber,
        coursesEnrolled: newStudent.coursesEnrolled,
        studentId: newStudent.studentId,
        joinedDate: newStudent.joinedDate,
        courseName: newStudent.courseName,
        courseID: newStudent.courseID,
        to_email: newStudent.username,
      }

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, emailParams)

      alert("Student created and email sent successfully!")

      // ✅ Reset fields and get new incremented ID again
      setNewStudent({
        name: "",
        username: "",
        password: "",
        phoneNumber: "",
        coursesEnrolled: 0,
        studentId: "",
        joinedDate: new Date().toISOString(),
        courseName: "",
        courseID: "",
      })
      setError("")
      await getNextStudentId()
    } catch (err) {
      console.error("Error:", err)
      setError("Failed to create student or send email.")
    } finally {
      setIsCreatingStudent(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Add new students and send them login credentials</p>
      </div>

      <Card className="border-primary/20 shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-primary/10">
          <CardTitle className="text-primary">Create New Student</CardTitle>
          <CardDescription>Student will receive login credentials via email</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreateStudent} className="space-y-5">
            {error && (
              <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-md animate-in fade-in-50 slide-in-from-bottom-5">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="student-name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="student-name"
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-username" className="text-sm font-medium">
                  Student Email
                </Label>
                <Input
                  id="student-username"
                  type="email"
                  value={newStudent.username}
                  onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                  placeholder="student@example.com"
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="student-password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="student-password"
                  type="password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="student-phone"
                  type="text"
                  value={newStudent.phoneNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, phoneNumber: e.target.value })}
                  placeholder="123-456-7890"
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="student-courses-enrolled" className="text-sm font-medium">
                  Courses Enrolled
                </Label>
                <Input
                  id="student-courses-enrolled"
                  type="number"
                  value={newStudent.coursesEnrolled}
                  onChange={(e) => setNewStudent({ ...newStudent, coursesEnrolled: Number(e.target.value) })}
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-id" className="text-sm font-medium">
                  Student ID
                </Label>
                <Input
                  id="student-id"
                  type="text"
                  value={newStudent.studentId}
                  readOnly
                  placeholder="CI2025001"
                  required
                  className="border-primary/20 focus-visible:ring-primary/30 bg-muted/20"
                />
                <p className="text-xs text-muted-foreground">Auto-generated ID</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="student-joined-date" className="text-sm font-medium">
                  Joined Date
                </Label>
                <Input
                  id="student-joined-date"
                  type="date"
                  value={newStudent.joinedDate.slice(0, 10)}
                  onChange={(e) => setNewStudent({ ...newStudent, joinedDate: e.target.value })}
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-course-name" className="text-sm font-medium">
                  Course Name
                </Label>
                <Input
                  id="student-course-name"
                  type="text"
                  value={newStudent.courseName}
                  onChange={(e) => setNewStudent({ ...newStudent, courseName: e.target.value })}
                  placeholder="Course Name"
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-course-id" className="text-sm font-medium">
                Course ID
              </Label>
              <Input
                id="student-course-id"
                type="number"
                value={newStudent.courseID}
                onChange={(e) => setNewStudent({ ...newStudent, courseID: e.target.value })}
                placeholder="Enter course ID"
                required
                className="border-primary/20 focus-visible:ring-primary/30"
                min="0"
              />
            </div>

            <Button
              type="submit"
              disabled={isCreatingStudent}
              className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all shadow-md"
            >
              {isCreatingStudent ? (
                <div className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-background border-t-transparent rounded-full"></span>
                  Creating...
                </div>
              ) : (
                "Create Student & Send Email"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
