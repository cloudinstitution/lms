"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { convertCoursesToCSV, downloadCSV, exportCoursesToExcel } from "@/lib/course-export-utils"
import { db } from "@/lib/firebase"
import { getAdminSession } from "@/lib/session-storage"
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore"
import { Download, Edit, Eye, MoreVertical, Plus, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Course {
  id: string
  title: string
  category: string
  price: string
  duration: string
  courseID?: number // Make courseID optional to handle existing data
  status: "Active" | "Draft" | "Archived"
  description?: string
}

export default function AdminCourses() {
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [courseForm, setCourseForm] = useState({
    title: "",
    category: "",
    price: "",
    duration: "",
    courseID: "",
    status: "active",
    description: "",
  })

  // Function to generate unique 3-digit course ID
  const generateUniqueCourseID = (): number => {
    const existingIDs = courses.map(course => course.courseID).filter(id => id !== undefined) as number[]
    let newID: number
    
    do {
      newID = Math.floor(Math.random() * 900) + 100 // Generate random 3-digit number (100-999)
    } while (existingIDs.includes(newID))
    
    return newID
  }

  const [courses, setCourses] = useState<Course[]>([])
  
  // Get user authentication data and claims
  const { userClaims } = useAuth()
  const adminData = getAdminSession()
  
  // Determine if user is teacher and get their assigned courses
  const isTeacher = userClaims?.role === 'teacher' || adminData?.role === 'teacher'
  const assignedCourses = userClaims?.assignedCourses || adminData?.assignedCourses || []

  useEffect(() => {
    fetchCourses()
  }, [])
  const fetchCourses = async () => {
    try {
      setLoading(true)
      const coursesCollection = collection(db, "courses")
      const coursesSnapshot = await getDocs(coursesCollection)
      let coursesList = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[]

      // Filter courses for teachers - only show assigned courses
      if (isTeacher && assignedCourses.length > 0) {
        coursesList = coursesList.filter(course => assignedCourses.includes(course.id))
      }

      setCourses(coursesList)
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast.error("Failed to load courses. Please try again.")
    } finally {
      setLoading(false)
    }
  }

 const filteredCourses = courses.filter(
    (course) =>
      (course.title?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()) ||
      (course.category?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
  )

  const handleViewCourse = (course: Course) => {
    setSelectedCourse(course)
    setIsViewDialogOpen(true)
  }

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course)
    // Extract numeric value from duration if it contains "weeks"
    const durationValue = course.duration.replace(' weeks', '').replace(/\D/g, '')
    setCourseForm({
      title: course.title,
      category: getCategoryValue(course.category),
      price: course.price.replace("₹", ""),
      duration: durationValue ? `${durationValue} weeks` : course.duration,
      courseID: course.courseID?.toString() || "", // Handle potentially undefined courseID
      status: course.status.toLowerCase(),
      description: course.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const getCategoryValue = (category: string) => {
    switch (category) {
      case "Web Development":
        return "web"
      case "Data Science":
        return "data"
      case "Cloud Computing":
        return "cloud"
      case "Mobile Development":
        return "mobile"
      default:
        return ""
    }
  }

  const getCategoryLabel = (value: string) => {
    switch (value) {
      case "web":
        return "Web Development"
      case "data":
        return "Data Science"
      case "cloud":
        return "Cloud Computing"
      case "mobile":
        return "Mobile Development"
      default:
        return ""
    }
  }

  const handleDeleteClick = (course: Course) => {
    setSelectedCourse(course)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (selectedCourse) {
      try {
        await deleteDoc(doc(db, "courses", selectedCourse.id))
        setCourses(courses.filter((course) => course.id !== selectedCourse.id))
        toast.success(`${selectedCourse.title} has been removed from the system.`)
      } catch (error) {
        console.error("Error deleting course:", error)
        toast.error("Failed to delete course. Please try again.")
      }
    }
    setIsDeleteDialogOpen(false)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    
    if (id === "duration") {
      // Only allow numeric input and automatically append "weeks"
      const numericValue = value.replace(/\D/g, "") // Remove all non-digit characters
      const formattedValue = numericValue ? `${numericValue} weeks` : ""
      setCourseForm((prev) => ({
        ...prev,
        [id]: formattedValue,
      }))
    } else {
      setCourseForm((prev) => ({
        ...prev,
        [id]: value,
      }))
    }
  }

  const handleSelectChange = (value: string, field: string) => {
    setCourseForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetForm = () => {
    const newCourseID = generateUniqueCourseID().toString()
    setCourseForm({
      title: "",
      category: "",
      price: "",
      duration: "",
      courseID: newCourseID,
      status: "active",
      description: "",
    })
  }

  const validateCourseID = (id: string): boolean => {
    const courseIDNum = Number(id)
    return !isNaN(courseIDNum) && courseIDNum >= 0
  }

  const handleExportCSV = () => {
    if (courses.length === 0) {
      toast.error("No courses data to export")
      return
    }
    
    const csvData = convertCoursesToCSV(courses)
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `courses_export_${timestamp}.csv`
    downloadCSV(csvData, filename)
  }

  const handleExportExcel = () => {
    if (courses.length === 0) {
      toast.error("No courses data to export")
      return
    }
    
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `courses_export_${timestamp}.xlsx`
    exportCoursesToExcel(courses, filename)
  }

  const handleAddCourseSubmit = async () => {
    // Check if all required fields are filled
    if (!courseForm.title || !courseForm.category || !courseForm.price || !courseForm.duration || !courseForm.status) {
      toast.error("Please fill in all required fields.")
      return
    }

    if (!courseForm.courseID || !validateCourseID(courseForm.courseID)) {
      toast.error("Please enter a valid Course ID (non-negative number).")
      return
    }

    try {
      setSubmitting(true)

      const newCourse = {
        title: courseForm.title,
        category: getCategoryLabel(courseForm.category),
        price: `₹${courseForm.price}`,
        duration: courseForm.duration,
        courseID: Number(courseForm.courseID),
        status: (courseForm.status.charAt(0).toUpperCase() + courseForm.status.slice(1)) as
          | "Active"
          | "Draft"
          | "Archived",
        description: courseForm.description,
        createdAt: new Date().toISOString(),
      }

      const coursesRef = collection(db, "courses")
      const docRef = await addDoc(coursesRef, newCourse)

      const completeNewCourse = {
        id: docRef.id,
        ...newCourse,
      }

      setCourses((prevCourses) => [...prevCourses, completeNewCourse])
      resetForm()
      setIsAddCourseOpen(false)
      toast.success(`${courseForm.title} has been added successfully.`)
      fetchCourses()
    } catch (error) {
      console.error("Error adding course:", error)
      toast.error("Failed to add course. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditCourseSubmit = async () => {
    if (!selectedCourse) return

    // Check if all required fields are filled
    if (!courseForm.title || !courseForm.category || !courseForm.price || !courseForm.duration || !courseForm.status) {
      toast.error("Please fill in all required fields.")
      return
    }

    if (!courseForm.courseID || !validateCourseID(courseForm.courseID)) {
      toast.error("Please enter a valid Course ID (non-negative number).")
      return
    }

    try {
      setSubmitting(true)
      const updatedCourse = {
        title: courseForm.title,
        category: getCategoryLabel(courseForm.category),
        price: `₹${courseForm.price}`,
        duration: courseForm.duration,
        courseID: Number(courseForm.courseID),
        status: (courseForm.status.charAt(0).toUpperCase() + courseForm.status.slice(1)) as
          | "Active"
          | "Draft"
          | "Archived",
        description: courseForm.description,
        updatedAt: new Date().toISOString(),
      }

      const courseRef = doc(db, "courses", selectedCourse.id)
      await updateDoc(courseRef, updatedCourse)

      const updatedCourses = courses.map((course) => {
        if (course.id === selectedCourse.id) {
          return {
            ...course,
            ...updatedCourse,
          }
        }
        return course
      })

      setCourses(updatedCourses)
      setIsEditDialogOpen(false)
      toast.success(`${courseForm.title} has been updated successfully.`)
      fetchCourses()
    } catch (error) {
      console.error("Error updating course:", error)
      toast.error("Failed to update course. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isTeacher ? "My Courses" : "Courses"}
          </h1>
          <p className="text-muted-foreground">
            {isTeacher ? "Manage your assigned courses" : "Manage your course offerings"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {courses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 bg-purple-600 hover:bg-purple-700 text-white hover:text-white shadow-sm transition-all duration-200 ease-in-out hover:shadow-md"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!isTeacher && (
            <Dialog
              open={isAddCourseOpen}
              onOpenChange={(open) => {
                setIsAddCourseOpen(open)
                if (open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" /> Add Course
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>Create a new course to offer to your students. All fields are required except description.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="Enter course title"
                  value={courseForm.title}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                  <Select value={courseForm.category} onValueChange={(value) => handleSelectChange(value, "category")} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Development</SelectItem>
                      <SelectItem value="data">Data Science</SelectItem>
                      <SelectItem value="cloud">Cloud Computing</SelectItem>
                      <SelectItem value="mobile">Mobile Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price (₹) <span className="text-red-500">*</span></Label>
                  <Input id="price" placeholder="Enter price" value={courseForm.price} onChange={handleFormChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration <span className="text-red-500">*</span></Label>
                  <Input
                    id="duration"
                    placeholder="Enter number (weeks will be added automatically)"
                    value={courseForm.duration}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="courseID">Course ID <span className="text-red-500">*</span></Label>
                  <Input
                    id="courseID"
                    placeholder="Auto-generated course ID"
                    value={courseForm.courseID}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    type="text"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
                <Select value={courseForm.status} onValueChange={(value) => handleSelectChange(value, "status")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter course description"
                  rows={4}
                  value={courseForm.description}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCourseOpen(false)} disabled={submitting}>
                Cancel
              </Button>              <Button type="submit" onClick={handleAddCourseSubmit} disabled={submitting} className="relative">
                {submitting ? (
                  <>
                    <span className="opacity-0">Create Course</span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                    </span>
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">            <div>
              <CardTitle>{isTeacher ? "My Assigned Courses" : "All Courses"}</CardTitle>
              <CardDescription>
                {isTeacher 
                  ? `You have access to ${courses.length} assigned course${courses.length !== 1 ? 's' : ''}`
                  : `You have ${courses.length} courses in total`
                }
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Course ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/courses/${encodeURIComponent(course.title)}`} className="hover:underline">
                          {course.title}
                        </Link>
                      </TableCell>
                      <TableCell>{course.category}</TableCell>
                      <TableCell>{course.price}</TableCell>
                      <TableCell>{course.duration}</TableCell>
                      <TableCell>{course.courseID || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            course.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : course.status === "Draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {course.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCourse(course)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            {!isTeacher && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditCourse(course)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClick(course)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No courses found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Course Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
            <DialogDescription>Detailed information about this course</DialogDescription>
          </DialogHeader>
          {selectedCourse && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Title:</Label>
                <div className="col-span-2">{selectedCourse.title}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Category:</Label>
                <div className="col-span-2">{selectedCourse.category}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Price:</Label>
                <div className="col-span-2">{selectedCourse.price}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Duration:</Label>
                <div className="col-span-2">{selectedCourse.duration}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Course ID:</Label>
                <div className="col-span-2">{selectedCourse.courseID || "-"}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Status:</Label>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedCourse.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : selectedCourse.status === "Draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedCourse.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Label className="text-right font-medium">Description:</Label>
                <div className="col-span-2">{selectedCourse.description || "No description available."}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update course information. All fields are required except description.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
              <Input id="title" placeholder="Enter course title" value={courseForm.title} onChange={handleFormChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select value={courseForm.category} onValueChange={(value) => handleSelectChange(value, "category")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web Development</SelectItem>
                    <SelectItem value="data">Data Science</SelectItem>
                    <SelectItem value="cloud">Cloud Computing</SelectItem>
                    <SelectItem value="mobile">Mobile Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₹) <span className="text-red-500">*</span></Label>
                <Input id="price" placeholder="Enter price" value={courseForm.price} onChange={handleFormChange} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration <span className="text-red-500">*</span></Label>
                <Input
                  id="duration"
                  placeholder="Enter number (weeks will be added automatically)"
                  value={courseForm.duration}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="courseID">Course ID <span className="text-red-500">*</span></Label>
                <Input
                  id="courseID"
                  placeholder="Enter unique course ID"
                  value={courseForm.courseID}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
              <Select value={courseForm.status} onValueChange={(value) => handleSelectChange(value, "status")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter course description"
                rows={4}
                value={courseForm.description}
                onChange={handleFormChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleEditCourseSubmit} disabled={submitting} className="relative">
              {submitting ? (
                <>
                  <span className="opacity-0">Update Course</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                  </span>
                </>
              ) : (
                "Update Course"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCourse?.title}? This action cannot be undone.
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
    </div>
  )
}