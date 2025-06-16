"use client"

import React, { useState, useEffect } from "react"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import emailjs from "@emailjs/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Check, Info, Loader2, X, Eye, EyeOff } from "lucide-react"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import "../phone-input.css"

// ✅ EmailJS Config
const SERVICE_ID = "service_0wpennn"
const TEMPLATE_ID = "template_zly25zz"
const PUBLIC_KEY = "f_2D0VC3LQZjhZDMC"

export default function StudentCreationForm() {
  const [newStudent, setNewStudent] = useState({
    name: "",
    username: "",
    password: "",
    phoneNumber: "", // Empty by default
    coursesEnrolled: 0,
    studentId: "",
    joinedDate: new Date().toISOString(),
    courseName: [] as string[],
    courseID: [] as number[],
    primaryCourseIndex: 0, // Index of the primary course in the courseID/courseName arrays
    courseMode: "Online", // "Online" or "Offline"
    status: "Active" as "Active" | "Inactive",
    notes: "",
  })
  const [error, setError] = useState("")
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [courses, setCourses] = useState<{id: string, title: string, courseID: number}[]>([])
  const [selectedCourses, setSelectedCourses] = useState<{id: string, title: string, courseID: number}[]>([])
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak")
  const [isFormValid, setIsFormValid] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // ✅ Initialize EmailJS
  useEffect(() => {
    emailjs.init(PUBLIC_KEY)
  }, [])

  // Fetch courses from Firestore
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesCollection = collection(db, "courses")
        const coursesSnapshot = await getDocs(coursesCollection)
        const coursesList = coursesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            title: doc.data().title,
            courseID: doc.data().courseID || 0
          }))
          .sort((a, b) => a.title.localeCompare(b.title))

        setCourses(coursesList)
      } catch (error) {
        console.error("Error fetching courses:", error)
        toast.error("Failed to load courses")
      }
    }

    fetchCourses()
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

  // Advanced password generation based on student information with multiple possible combinations
  const generatePassword = () => {
    // Extract student information parts
    const fullName = newStudent.name.trim();
    const nameSegments = fullName.split(' ').filter(segment => segment);
    const firstName = nameSegments.length > 0 ? nameSegments[0] : '';
    const lastName = nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] : '';
    const middleName = nameSegments.length > 2 ? nameSegments[1] : '';
    
    const email = newStudent.username.trim();
    const emailUsername = email.split('@')[0] || '';
    const emailDomain = email.split('@')[1]?.split('.')[0] || '';
    
    const studentId = newStudent.studentId || '';
    const idShort = studentId.slice(-4);
    const idPrefix = studentId.slice(0, 2);
    
    // Get course info if available
    const courseName = newStudent.courseName.length > 0 ? 
      newStudent.courseName[0] : 
      selectedCourses.length > 0 ? selectedCourses[0].title : 'Course';
    
    const courseInitials = courseName.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
    
    const courseWords = courseName.split(' ');
    const courseAcronym = courseWords.length > 1 ? 
      courseWords.slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() : 
      courseInitials;
    
    // Phone number (last 4 digits if available)
    const phone = newStudent.phoneNumber || '';
    const phoneDigits = phone.replace(/\\D/g, '').slice(-4);
    
    // Date information
    const dateObj = newStudent.joinedDate ? new Date(newStudent.joinedDate) : new Date();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2);
    const shortDate = day + month;
    const reversedDate = month + day;
    
    // Special characters and numbers
    const specialChars = ['!', '@', '#', '$', '%', '&', '*'];
    const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
    const randomNum = Math.floor(Math.random() * 900 + 100); // 3-digit number
    
    // Name transformations
    const nameReversed = firstName.split('').reverse().join('').substring(0, 3);
    const firstNameInitial = firstName.charAt(0).toUpperCase();
    const lastNameInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    // Create different password combination patterns (10 different patterns)
    const passwordPatterns = [
      // Pattern 1: First name + Last name initial + Student ID + Special char
      firstName.substring(0, 4).toLowerCase() + 
      lastNameInitial + 
      idShort + 
      specialChar,
      
      // Pattern 2: Full name initials + Course code + Join date
      nameSegments.map(n => n[0].toUpperCase()).join('') + 
      courseInitials +
      shortDate + 
      specialChar,
      
      // Pattern 3: Email username + Student ID + Special char
      emailUsername.substring(0, 4) + 
      idShort + 
      specialChar + 
      year,
      
      // Pattern 4: First name + Course initials + Random number + Special char
      firstName.substring(0, 3) + 
      courseInitials + 
      randomNum + 
      specialChar,
      
      // Pattern 5: Student ID + Email first part + Special char
      idShort + 
      emailUsername.substring(0, 3).toLowerCase() + 
      specialChar + 
      reversedDate,
      
      // Pattern 6: Course acronym + Last name + Phone digits + Special char
      courseAcronym + 
      (lastName ? lastName.substring(0, 3).toLowerCase() : firstNameInitial.toLowerCase()) + 
      (phoneDigits || randomNum.toString()) + 
      specialChar,
      
      // Pattern 7: Reversed name + Student ID prefix + Course initials + Special char
      nameReversed + 
      idPrefix + 
      courseInitials + 
      specialChar,
      
      // Pattern 8: First name + Year + Course acronym + Special char
      firstName.substring(0, 3).toLowerCase() + 
      year + 
      courseAcronym + 
      specialChar,
      
      // Pattern 9: Last name + First name initial + Phone + Special char
      (lastName ? lastName.substring(0, 3).toLowerCase() : firstName.substring(0, 3).toLowerCase()) + 
      firstNameInitial + 
      (phoneDigits || randomNum.toString()) + 
      specialChar,
      
      // Pattern 10: Course + Student ID + Name + Special char
      courseAcronym + 
      idShort.substring(0, 2) + 
      firstNameInitial.toLowerCase() + 
      (lastName ? lastNameInitial.toLowerCase() : '') + 
      specialChar
    ]
    
    // Select one pattern randomly and evaluate password strength
    const selectedPassword = passwordPatterns[Math.floor(Math.random() * passwordPatterns.length)];
    evaluatePasswordStrength(selectedPassword);
    return selectedPassword;
  }

  // Function to toggle course selection
  const toggleCourseSelection = (courseItem: { id: string; title: string; courseID: number }) => {
    setSelectedCourses((prev) => {
      // Check if the course is already selected
      const courseIndex = prev.findIndex((c) => c.id === courseItem.id)
      
      if (courseIndex >= 0) {
        // Course is already selected, remove it
        const newSelectedCourses = [...prev]
        newSelectedCourses.splice(courseIndex, 1)
        
        // Update student info
        const newCourseNames = newSelectedCourses.map((c) => c.title)
        const newCourseIDs = newSelectedCourses.map((c) => c.courseID)
        
        setNewStudent((prevStudent) => ({
          ...prevStudent,
          courseName: newCourseNames,
          courseID: newCourseIDs,
          coursesEnrolled: newSelectedCourses.length,
          // If the primary course was removed, reset to the first course or 0
          primaryCourseIndex: 
            prevStudent.primaryCourseIndex >= newSelectedCourses.length
              ? newSelectedCourses.length > 0 ? 0 : 0
              : prevStudent.primaryCourseIndex
        }))
        
        return newSelectedCourses
      } else {
        // Course is not selected, add it
        const newSelectedCourses = [...prev, courseItem]
        
        // Update student info
        const newCourseNames = newSelectedCourses.map((c) => c.title)
        const newCourseIDs = newSelectedCourses.map((c) => c.courseID)
        
        setNewStudent((prevStudent) => ({
          ...prevStudent,
          courseName: newCourseNames,
          courseID: newCourseIDs,
          coursesEnrolled: newSelectedCourses.length
        }))
        
        return newSelectedCourses
      }
    })
  }

  // Function to set primary course
  const setPrimaryCourse = (index: number) => {
    if (index >= 0 && index < selectedCourses.length) {
      setNewStudent((prev) => ({ ...prev, primaryCourseIndex: index }))
    }
  }

  // Password strength evaluation
  const evaluatePasswordStrength = (password: string) => {
    // Simple password strength evaluation
    const length = password.length
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    const criteriaCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length
    
    if (length >= 8 && criteriaCount >= 3) {
      setPasswordStrength("strong")
    } else if (length >= 6 && criteriaCount >= 2) {
      setPasswordStrength("medium")
    } else {
      setPasswordStrength("weak")
    }
  }

  // Form validation
  useEffect(() => {
    const isValid = 
      newStudent.name.trim().length > 0 &&
      newStudent.username.includes('@') && // Basic email validation
      newStudent.password.length >= 6 && // Minimum password length
      newStudent.studentId.length > 0 &&
      selectedCourses.length > 0
    
    setIsFormValid(isValid)
  }, [newStudent, selectedCourses])

  // Initialize student ID on component load
  useEffect(() => {
    if (!newStudent.studentId) {
      getNextStudentId()
    }
  }, [newStudent.studentId])

  // Handle input changes
  const handleInputChange = (field: string, value: string | number | string[] | number[]) => {
    setNewStudent((prev) => ({ ...prev, [field]: value }))
    
    // Evaluate password strength if the password field changed
    if (field === 'password' && typeof value === 'string') {
      evaluatePasswordStrength(value)
    }
  }

  // Handle auto-password generation
  const handleGeneratePassword = () => {
    if (newStudent.name && newStudent.username) {
      const generatedPassword = generatePassword()
      handleInputChange("password", generatedPassword)
    } else {
      toast.error("Please enter student name and email first")
    }
  }

  // Check if username (email) already exists
  const checkUsernameExists = async (email: string) => {
    try {
      const q = query(collection(db, "students"), where("username", "==", email))
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch (error) {
      console.error("Error checking email existence:", error)
      return false
    }
  }

  // Create student in database
  const createStudent = async () => {
    try {
      setIsCreatingStudent(true)
      setError("")
      
      // Check if username already exists
      const usernameExists = await checkUsernameExists(newStudent.username)
      if (usernameExists) {
        setError("A student with this email already exists")
        setIsCreatingStudent(false)
        return
      }
      
      // Extract primary course
      const primaryCourseIndex = Math.min(newStudent.primaryCourseIndex, selectedCourses.length - 1)
      const primaryCourse = selectedCourses[primaryCourseIndex]
      
      // Create student document
      const studentDoc = await addDoc(collection(db, "students"), {
        ...newStudent,
        // Format primary course info
        primaryCourseId: primaryCourse.id,
        primaryCourseTitle: primaryCourse.title,
        primaryCourseCode: primaryCourse.courseID,
        // Creation timestamp
        createdAt: new Date().toISOString(),
      })
      
      // Send welcome email if email is provided
      if (newStudent.username) {
        try {
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            to_name: newStudent.name,
            to_email: newStudent.username,
            from_name: "LMS Portal Admin",
            student_id: newStudent.studentId,
            password: newStudent.password,
            courses: newStudent.courseName.join(", "),
            message: `Welcome to the LMS Portal! You have been registered for ${newStudent.coursesEnrolled} course(s).`
          })
          
          toast.success("Welcome email sent successfully")
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError)
          toast.error("Failed to send welcome email. Please inform the student manually.")
        }
      }
      
      toast.success("Student created successfully!")
      
      // Reset form
      setNewStudent({
        name: "",
        username: "",
        password: "",
        phoneNumber: "",
        coursesEnrolled: 0,
        studentId: "",
        joinedDate: new Date().toISOString(),
        courseName: [],
        courseID: [],
        primaryCourseIndex: 0,
        courseMode: "Online",
        status: "Active",
        notes: "",
      })
      setSelectedCourses([])
      setIsConfirmDialogOpen(false)
      
      // Generate new student ID for the next student
      getNextStudentId()
    } catch (error) {
      console.error("Error creating student:", error)
      setError("Failed to create student. Please try again.")
    } finally {
      setIsCreatingStudent(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Student</CardTitle>
          <CardDescription>
            Add a new student to the LMS portal and enroll them in courses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={newStudent.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter student's full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <div className="flex gap-2">
                  <Input
                    id="studentId"
                    value={newStudent.studentId}
                    onChange={(e) => handleInputChange("studentId", e.target.value)}
                    placeholder="CI2023001"
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={getNextStudentId}
                    title="Generate next available ID"
                  >
                    Auto
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Email Address *</Label>
                <Input
                  id="username"
                  type="email"
                  value={newStudent.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder="student@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={newStudent.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="Secure password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGeneratePassword}
                    title="Generate secure password"
                  >
                    Generate
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Strength:</span>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-4 rounded ${
                      passwordStrength === "weak" 
                        ? "bg-red-500" 
                        : passwordStrength === "medium" 
                        ? "bg-yellow-500" 
                        : "bg-green-500"
                    }`} />
                    <div className={`h-1.5 w-4 rounded ${
                      passwordStrength === "weak" 
                        ? "bg-gray-200" 
                        : passwordStrength === "medium" 
                        ? "bg-yellow-500" 
                        : "bg-green-500"
                    }`} />
                    <div className={`h-1.5 w-4 rounded ${
                      passwordStrength === "weak" 
                        ? "bg-gray-200" 
                        : passwordStrength === "medium" 
                        ? "bg-gray-200" 
                        : "bg-green-500"
                    }`} />
                    <span className="text-xs font-medium ml-1">
                      {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <PhoneInput
                  country={'in'}
                  value={newStudent.phoneNumber}
                  onChange={(phone) => handleInputChange("phoneNumber", phone)}
                  inputClass="phone-input-field"
                  containerClass="phone-input-container"
                  buttonClass="phone-input-dropdown"
                  dropdownClass="phone-input-dropdown-list"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="joinedDate">Joined Date</Label>
                <Input
                  id="joinedDate"
                  type="date"
                  value={newStudent.joinedDate.split('T')[0]}
                  onChange={(e) => handleInputChange("joinedDate", e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Course Mode</Label>
                <RadioGroup 
                  value={newStudent.courseMode} 
                  onValueChange={(value) => handleInputChange("courseMode", value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Online" id="online" />
                    <Label htmlFor="online">Online</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Offline" id="offline" />
                    <Label htmlFor="offline">Offline</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <RadioGroup 
                  value={newStudent.status} 
                  onValueChange={(value) => handleInputChange("status", value as "Active" | "Inactive")}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Active" id="active" />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Inactive" id="inactive" />
                    <Label htmlFor="inactive">Inactive</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Courses *</Label>
              <div className="border rounded-md p-4">
                <div className="mb-2 flex justify-between items-center">
                  <span className="text-sm font-semibold">
                    Select courses to enroll this student ({selectedCourses.length} selected)
                  </span>
                </div>
                
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {courses.map((course) => {
                    const isSelected = selectedCourses.some((c) => c.id === course.id)
                    const isPrimary = isSelected && selectedCourses.indexOf(selectedCourses.find((c) => c.id === course.id)!) === newStudent.primaryCourseIndex
                    
                    return (
                      <div
                        key={course.id}
                        className={`
                          flex items-center justify-between rounded-md p-2
                          ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}
                          ${isPrimary ? 'ring-1 ring-primary' : ''}
                        `}
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCourseSelection(course)}
                            id={`course-${course.id}`}
                          />
                          <Label
                            htmlFor={`course-${course.id}`}
                            className="cursor-pointer flex items-center"
                          >
                            <span className="ml-2">
                              {course.title}
                              {course.courseID ? ` (ID: ${course.courseID})` : ''}
                            </span>
                          </Label>
                        </div>
                        
                        {isSelected && (
                          <div className="flex items-center">
                            <Button
                              type="button"
                              variant={isPrimary ? "secondary" : "ghost"}
                              size="sm"
                              className={`px-2 py-0 h-6 text-xs ${
                                isPrimary ? 'bg-primary text-primary-foreground' : ''
                              }`}
                              onClick={() => setPrimaryCourse(selectedCourses.indexOf(selectedCourses.find((c) => c.id === course.id)!))}
                              disabled={isPrimary}
                            >
                              {isPrimary ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Primary
                                </span>
                              ) : (
                                "Set as Primary"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {!courses.length && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No courses available. Add courses first.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <textarea
                id="notes"
                rows={3}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newStudent.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Add any relevant notes about this student..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={!isFormValid || isCreatingStudent} 
                    type="button"
                  >
                    {isCreatingStudent ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      "Create Student"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Student Creation</DialogTitle>
                    <DialogDescription>
                      Please review the student details before proceeding:
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="font-medium">Name:</span>
                      <span>{newStudent.name}</span>
                      
                      <span className="font-medium">Student ID:</span>
                      <span>{newStudent.studentId}</span>
                      
                      <span className="font-medium">Email:</span>
                      <span>{newStudent.username}</span>
                      
                      <span className="font-medium">Phone:</span>
                      <span>{newStudent.phoneNumber || "Not provided"}</span>
                      
                      <span className="font-medium">Joined Date:</span>
                      <span>{new Date(newStudent.joinedDate).toLocaleDateString()}</span>
                      
                      <span className="font-medium">Course Mode:</span>
                      <span>{newStudent.courseMode}</span>
                      
                      <span className="font-medium">Status:</span>
                      <span>{newStudent.status}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <span className="font-medium">Enrolled Courses:</span>
                      <ul className="list-disc ml-5">
                        {selectedCourses.map((course, idx) => (
                          <li key={course.id}>
                            {course.title}
                            {idx === newStudent.primaryCourseIndex && (
                              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                Primary
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md space-y-1">
                      <div className="flex items-center text-sm">
                        <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Important:</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A welcome email will be sent to {newStudent.username} with login credentials.
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={createStudent}
                      disabled={isCreatingStudent}
                    >
                      {isCreatingStudent ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                      ) : (
                        "Confirm & Create"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
