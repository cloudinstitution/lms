"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import emailjs from "@emailjs/browser"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Mail } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

// EmailJS Config
const SERVICE_ID = "service_0wpennn"
const TEMPLATE_ID = "template_zly25zz"
const PUBLIC_KEY = "f_2D0VC3LQZjhZDMC"

interface Student {
  id: string
  name: string
  username: string // email
  password: string
  phoneNumber: string
  coursesEnrolled: number
  studentId: string
  joinedDate: string
  status?: "Active" | "Inactive"
}

export default function AdminStudents() {
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states for adding/editing a student
  const [newStudent, setNewStudent] = useState({
    name: "",
    username: "", // email
    password: "",
    phoneNumber: "",
    coursesEnrolled: 0,
    studentId: "",
    joinedDate: new Date().toISOString().slice(0, 10),
    status: "Active",
  })

  // Form state for email
  const [emailContent, setEmailContent] = useState({
    subject: "",
    message: "",
  })

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init(PUBLIC_KEY)
  }, [])

  // Fetch students from Firebase
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true)
        const studentsCollection = collection(db, "students")
        const studentsSnapshot = await getDocs(studentsCollection)
        const studentsList = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: "Active", // Default status if not in the data
        })) as Student[]

        setStudents(studentsList)
      } catch (error) {
        console.error("Error fetching students:", error)
        toast({
          title: "Error",
          description: "Failed to load students data.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [])

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phoneNumber?.includes(searchQuery) ||
      student.studentId?.includes(searchQuery),
  )

  // Handle view details
  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student)
    setIsViewDetailsDialogOpen(true)
  }

  // Handle edit
  const handleEdit = (student: Student) => {
    setSelectedStudent(student)
    setNewStudent({
      name: student.name || "",
      username: student.username || "",
      password: student.password || "",
      phoneNumber: student.phoneNumber || "",
      coursesEnrolled: student.coursesEnrolled || 0,
      studentId: student.studentId || "",
      joinedDate: student.joinedDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      status: student.status || "Active",
    })
    setIsEditDialogOpen(true)
  }

  // Handle send email
  const handleSendEmail = (student: Student) => {
    setSelectedStudent(student)
    setEmailContent({
      subject: "",
      message: "",
    })
    setIsEmailDialogOpen(true)
  }

  // Handle delete click
  const handleDeleteClick = (student: Student) => {
    setSelectedStudent(student)
    setIsDeleteDialogOpen(true)
  }

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (selectedStudent) {
      try {
        await deleteDoc(doc(db, "students", selectedStudent.id))
        setStudents(students.filter((student) => student.id !== selectedStudent.id))
        toast({
          title: "Student Deleted",
          description: `${selectedStudent.name} has been removed from the system.`,
        })
      } catch (error) {
        console.error("Error deleting student:", error)
        toast({
          title: "Error",
          description: "Failed to delete student.",
          variant: "destructive",
        })
      }
    }
    setIsDeleteDialogOpen(false)
  }

  // Handle add student form change
  const handleAddStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setNewStudent((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  // Handle number input change
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setNewStudent((prev) => ({
      ...prev,
      [id]: Number(value),
    }))
  }

  // Handle select change
  const handleSelectChange = (value: string, field: string) => {
    setNewStudent((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Handle add student submit - redirects to the dashboard page with the form
  const handleAddStudentRedirect = () => {
    // Redirect to the admin dashboard page for adding a new student
    window.location.href = "/admin/dashboard"
  }

  // Handle edit student submit
  const handleEditStudentSubmit = async () => {
    if (!selectedStudent) return

    // Validate form
    if (!newStudent.name || !newStudent.username || !newStudent.phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const studentRef = doc(db, "students", selectedStudent.id)
      await updateDoc(studentRef, {
        name: newStudent.name,
        username: newStudent.username,
        password: newStudent.password,
        phoneNumber: newStudent.phoneNumber,
        coursesEnrolled: newStudent.coursesEnrolled,
        studentId: newStudent.studentId,
        joinedDate: newStudent.joinedDate,
      })

      // Update local state
      const updatedStudents = students.map((student) => {
        if (student.id === selectedStudent.id) {
          return {
            ...student,
            name: newStudent.name,
            username: newStudent.username,
            password: newStudent.password,
            phoneNumber: newStudent.phoneNumber,
            coursesEnrolled: newStudent.coursesEnrolled,
            studentId: newStudent.studentId,
            joinedDate: newStudent.joinedDate,
            status: newStudent.status as "Active" | "Inactive",
          }
        }
        return student
      })

      setStudents(updatedStudents)
      setIsEditDialogOpen(false)

      toast({
        title: "Student Updated",
        description: `${newStudent.name}'s information has been updated.`,
      })
    } catch (error) {
      console.error("Error updating student:", error)
      toast({
        title: "Error",
        description: "Failed to update student information.",
        variant: "destructive",
      })
    }
  }

  // Handle send email submit
  const handleSendEmailSubmit = async () => {
    if (!selectedStudent) return

    // Validate form
    if (!emailContent.subject || !emailContent.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and message.",
        variant: "destructive",
      })
      return
    }

    try {
      // Send email via EmailJS
      const emailParams = {
        to_email: selectedStudent.username,
        subject: emailContent.subject,
        message: emailContent.message,
        name: selectedStudent.name,
      }

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, emailParams)
      setIsEmailDialogOpen(false)

      toast({
        title: "Email Sent",
        description: `Email has been sent to ${selectedStudent.name}.`,
      })
    } catch (error) {
      console.error("Error sending email:", error)
      toast({
        title: "Error",
        description: "Failed to send email.",
        variant: "destructive",
      })
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch (error) {
      return dateString
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage your student enrollments</p>
        </div>
          <Button className="gap-1" onClick={handleAddStudentRedirect}>
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Students</CardTitle>
                <CardDescription>You have {students.length} students in total</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search students..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <p>Loading students data...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.username}</TableCell>
                        <TableCell>{student.phoneNumber}</TableCell>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell>{student.coursesEnrolled}</TableCell>
                        <TableCell>{formatDate(student.joinedDate)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(student)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(student)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendEmail(student)}>
                                <Mail className="mr-2 h-4 w-4" />
                                <span>Send Email</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(student)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No students found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Student</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedStudent?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>Detailed information about {selectedStudent?.name}</DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Name:</Label>
                  <div className="col-span-2">{selectedStudent.name}</div>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Email:</Label>
                  <div className="col-span-2">{selectedStudent.username}</div>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Phone:</Label>
                  <div className="col-span-2">{selectedStudent.phoneNumber}</div>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Student ID:</Label>
                  <div className="col-span-2">{selectedStudent.studentId}</div>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Enrolled Courses:</Label>
                  <div className="col-span-2">{selectedStudent.coursesEnrolled}</div>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Join Date:</Label>
                  <div className="col-span-2">{formatDate(selectedStudent.joinedDate)}</div>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Status:</Label>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedStudent.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedStudent.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update student information</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={newStudent.name}
                  onChange={handleAddStudentChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Student Email</Label>
                <Input
                  id="username"
                  type="email"
                  placeholder="Enter email address"
                  value={newStudent.username}
                  onChange={handleAddStudentChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={newStudent.password}
                  onChange={handleAddStudentChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  placeholder="Enter phone number"
                  value={newStudent.phoneNumber}
                  onChange={handleAddStudentChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="Enter student ID"
                  value={newStudent.studentId}
                  onChange={handleAddStudentChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coursesEnrolled">Courses Enrolled</Label>
                <Input
                  id="coursesEnrolled"
                  type="number"
                  placeholder="Number of courses"
                  value={newStudent.coursesEnrolled}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="joinedDate">Joined Date</Label>
                <Input id="joinedDate" type="date" value={newStudent.joinedDate} onChange={handleAddStudentChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newStudent.status} onValueChange={(value) => handleSelectChange(value, "status")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleEditStudentSubmit}>
                Update Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Send Email</DialogTitle>
              <DialogDescription>
                Send an email to {selectedStudent?.name} ({selectedStudent?.username})
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="Email subject"
                  value={emailContent.subject}
                  onChange={(e) => setEmailContent((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-message">Message</Label>
                <Input
                  id="email-message"
                  placeholder="Email message"
                  className="min-h-[100px]"
                  value={emailContent.message}
                  onChange={(e) => setEmailContent((prev) => ({ ...prev, message: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSendEmailSubmit}>
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>        </Dialog>
      </div>
  )
}
