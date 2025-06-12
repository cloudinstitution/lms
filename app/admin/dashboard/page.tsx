"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import "./phone-input.css"

// ✅ EmailJS Config
const SERVICE_ID = "service_0wpennn"
const TEMPLATE_ID = "template_zly25zz"
const PUBLIC_KEY = "f_2D0VC3LQZjhZDMC"

export default function AdminDashboard() {  const [newStudent, setNewStudent] = useState({
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
  }  // Advanced password generation based on student information with multiple possible combinations
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
    const phoneDigits = phone.replace(/\D/g, '').slice(-4);
    
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
      day + 
      specialChar,
      
      // Pattern 8: Email domain + First name initial + Last name initial + Year + Special char
      (emailDomain.substring(0, 3) || "lms") + 
      firstNameInitial.toLowerCase() + 
      lastNameInitial.toLowerCase() + 
      year + 
      specialChar + 
      randomNum.toString().charAt(0),
      
      // Pattern 9: Short date + First name + Middle initial + Course initials + Special char
      shortDate + 
      firstName.substring(0, 2).toLowerCase() + 
      (middleName ? middleName.charAt(0).toUpperCase() : lastNameInitial) + 
      courseAcronym.toLowerCase() + 
      specialChar,
      
      // Pattern 10: Student ID parts mixed with name parts
      idPrefix.toLowerCase() + 
      firstNameInitial + 
      idShort.substring(0, 2) + 
      (lastName ? lastName.substring(0, 2).toLowerCase() : firstName.substring(0, 2)) + 
      specialChar + 
      month.charAt(1)
    ];
    
    // Select a random pattern
    const selectedPattern = passwordPatterns[Math.floor(Math.random() * passwordPatterns.length)];
    
    // Ensure password has uppercase, lowercase, number and special char
    let password = selectedPattern;
    
    // If any of the required character classes are missing, add them
    if (!/[A-Z]/.test(password)) password += 'A';
    if (!/[a-z]/.test(password)) password += 'a';
    if (!/[0-9]/.test(password)) password += '1';
    if (!/[!@#$%&*]/.test(password)) password += specialChar;
    
    // Set the password
    setNewStudent((prev) => ({ ...prev, password }))
    checkPasswordStrength(password)
    
    // Show a toast notification with password information
    toast.info("Smart password generated based on student information")
  }
  // Check password strength
  const checkPasswordStrength = (password: string) => {
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*]/.test(password)
    const length = password.length

    // Our generated passwords should always be strong based on the pattern we've created
    // But we'll still do a thorough check to make sure
    if (length >= 8 && hasLower && hasUpper && hasNumber && hasSpecial) {
      setPasswordStrength("strong")
    } else if (length >= 6 && ((hasLower || hasUpper) && (hasNumber || hasSpecial))) {
      setPasswordStrength("medium")
    } else {
      setPasswordStrength("weak")
    }
  }

  // Handle course selection
  const handleCourseToggle = (course: { id: string; title: string; courseID: number }) => {
    setSelectedCourses((prev) => {
      const courseExists = prev.some(c => c.id === course.id)
      
      if (courseExists) {
        // Remove the course
        const filteredCourses = prev.filter(c => c.id !== course.id)
        
        // Update primary course index if needed
        const newPrimaryIndex = newStudent.primaryCourseIndex >= filteredCourses.length 
          ? 0 
          : newStudent.primaryCourseIndex
        
        setNewStudent(student => ({
          ...student,
          coursesEnrolled: filteredCourses.length,
          courseName: filteredCourses.map(c => c.title),
          courseID: filteredCourses.map(c => c.courseID),
          primaryCourseIndex: newPrimaryIndex
        }))
        
        return filteredCourses
      } else {
        // Add the course
        const updatedCourses = [...prev, course]
        
        setNewStudent(student => ({
          ...student,
          coursesEnrolled: updatedCourses.length,
          courseName: updatedCourses.map(c => c.title),
          courseID: updatedCourses.map(c => c.courseID)
        }))
        
        return updatedCourses
      }
    })
  }

  // Set primary course
  const setPrimaryCourse = (index: number) => {
    setNewStudent(prev => ({
      ...prev,
      primaryCourseIndex: index
    }))
  }

  // Validate email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate name (no numbers allowed)
  const isValidName = (name: string) => {
    return !/\d/.test(name)
  }  // Advanced validation for Indian phone numbers
  const isValidIndianPhone = (phone: string) => {
    // If the input is empty, it's handled separately
    if (phone === "") return false;
    
    // Remove any non-numeric characters to get just the digits
    const digitsOnly = phone.replace(/\D/g, '');

    // Handle different phone number formats
    
    // Case 1: Phone with country code - could be +91XXXXXXXXXX or 91XXXXXXXXXX
    if (digitsOnly.startsWith('91')) {
      // Should be exactly 12 digits (91 + 10 digit number)
      if (digitsOnly.length !== 12) return false;
      
      // The actual number part after 91 should start with valid Indian mobile prefix (6,7,8,9)
      const actualNumber = digitsOnly.substring(2);
      return /^[6789]\d{9}$/.test(actualNumber);
    } 
    
    // Case 2: Just the 10-digit phone number without country code
    else if (digitsOnly.length === 10) {
      // Should start with valid Indian mobile prefix (6,7,8,9)
      return /^[6789]\d{9}$/.test(digitsOnly);
    }
    
    // Case 3: Handle other formats like +91-XXX-XXX-XXXX where the country code is stripped
    else if (digitsOnly.length > 10) {
      // Extract the last 10 digits
      const last10Digits = digitsOnly.slice(-10);
      return /^[6789]\d{9}$/.test(last10Digits);
    }
    
    return false;
  }// Validate the entire form
  const validateForm = () => {
    const isValid = 
      newStudent.name.trim() !== "" &&
      isValidName(newStudent.name) &&
      isValidEmail(newStudent.username) &&
      newStudent.password.length >= 6 &&
      newStudent.phoneNumber.trim() !== "" &&
      isValidIndianPhone(newStudent.phoneNumber) &&
      selectedCourses.length > 0
    
    setIsFormValid(isValid)
    return isValid
  }

  // Effect for form validation
  useEffect(() => {
    validateForm()
  }, [newStudent, selectedCourses])

  // ✅ Call it once when the component loads
  useEffect(() => {
    getNextStudentId()
  }, [])
  const handleCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setError("Please fill in all required fields correctly.")
      return
    }

    // Open confirmation dialog instead of submitting right away
    setIsConfirmDialogOpen(true)
  }

  const confirmAndCreateStudent = async () => {
    setIsCreatingStudent(true)
    setIsConfirmDialogOpen(false)

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
        primaryCourseIndex: newStudent.primaryCourseIndex,
        courseMode: newStudent.courseMode,
        status: newStudent.status,
        notes: newStudent.notes,
      })

      // 2. Send Email via EmailJS
      const primaryCourse = newStudent.courseName[newStudent.primaryCourseIndex] || "N/A"
      
      const emailParams = {
        username: newStudent.username,
        password: newStudent.password,
        name: newStudent.name,
        phoneNumber: newStudent.phoneNumber,
        coursesEnrolled: newStudent.coursesEnrolled,
        studentId: newStudent.studentId,
        joinedDate: new Date(newStudent.joinedDate).toLocaleDateString(),
        courseName: primaryCourse,
        courseID: newStudent.courseID[newStudent.primaryCourseIndex] || "N/A",
        courseMode: newStudent.courseMode,        status: newStudent.status,
        to_email: newStudent.username,
      };
      
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, emailParams)

      toast.success("Student created and email sent successfully!")
      
      // ✅ Reset fields and get new incremented ID again
      setNewStudent({
        name: "",
        username: "",
        password: "",
        phoneNumber: "", // Empty by default
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
      setError("")
      await getNextStudentId()
    } catch (err) {
      console.error("Error:", err)
      setError("Failed to create student or send email.")
      toast.error("Failed to create student account")
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
              <Alert variant="destructive">
                <AlertDescription className="flex items-center">
                  <X className="h-4 w-4 mr-2" />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Personal Information Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-md">Personal Information</h3>              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="student-name" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student-name"
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="John Doe"
                    required
                    className={`border-primary/20 focus-visible:ring-primary/30 ${
                      newStudent.name && !isValidName(newStudent.name) ? "border-destructive" : ""
                    }`}
                  />
                  {newStudent.name && !isValidName(newStudent.name) && (
                    <p className="text-xs text-destructive mt-1">Name cannot contain numbers</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-username" className="text-sm font-medium">
                    Student Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student-username"
                    type="email"
                    value={newStudent.username}
                    onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                    placeholder="student@example.com"
                    required
                    className={`border-primary/20 focus-visible:ring-primary/30 ${
                      newStudent.username && !isValidEmail(newStudent.username) ? "border-destructive" : ""
                    }`}
                  />
                  {newStudent.username && !isValidEmail(newStudent.username) && (
                    <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="student-password" className="text-sm font-medium flex justify-between">
                    <span>Password <span className="text-destructive">*</span></span>                    <span 
                      className="text-xs text-primary cursor-pointer hover:underline"
                      onClick={generatePassword}
                      title="Generate a secure password based on student information"
                    >
                      Generate Smart Password
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="student-password"
                      type={showPassword ? "text" : "password"}
                      value={newStudent.password}
                      onChange={(e) => {
                        setNewStudent({ ...newStudent, password: e.target.value });
                        checkPasswordStrength(e.target.value);
                      }}
                      required
                      className="border-primary/20 focus-visible:ring-primary/30"
                    />                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {newStudent.password && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <div 
                          className={`h-1.5 w-3 rounded-full ${
                            passwordStrength === "weak" ? "bg-destructive" : 
                            passwordStrength === "medium" ? "bg-orange-500" : 
                            "bg-green-500"
                          }`}
                        />
                        <div 
                          className={`h-1.5 w-3 rounded-full ${
                            passwordStrength === "weak" ? "bg-gray-300" : 
                            passwordStrength === "medium" ? "bg-orange-500" : 
                            "bg-green-500"
                          }`}
                        />
                        <div 
                          className={`h-1.5 w-3 rounded-full ${
                            passwordStrength !== "strong" ? "bg-gray-300" : "bg-green-500"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                  {newStudent.password && (
                    <p className={`text-xs ${
                      passwordStrength === "weak" ? "text-destructive" : 
                      passwordStrength === "medium" ? "text-orange-500" : 
                      "text-green-500"
                    }`}>
                      Password strength: {passwordStrength}
                    </p>
                  )}
                </div>                  <div className="space-y-2">                    
                  <div className="flex items-center justify-between">
                    <Label htmlFor="student-phone" className="text-sm font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <div className={`phone-input-container ${newStudent.phoneNumber !== "" && !isValidIndianPhone(newStudent.phoneNumber) ? "error" : ""}`}>
                    <PhoneInput
                      country={"in"}
                      value={newStudent.phoneNumber}
                      onChange={(phone) => {
                        setNewStudent({ ...newStudent, phoneNumber: phone });
                        // Clear error state when user starts typing again
                        if (document.activeElement?.id === "phone-input") {
                          setError("");
                        }
                      }}
                      inputProps={{
                        id: "phone-input",
                        name: "phone-input",
                        required: true,
                        "aria-invalid": newStudent.phoneNumber !== "" && !isValidIndianPhone(newStudent.phoneNumber)
                      }}
                      inputClass="phone-input-field"
                      buttonClass="phone-button-field"
                      containerClass="!w-full"
                      enableSearch={false} 
                      disableSearchIcon={true}
                      preferredCountries={['in']}
                      autoFormat={true}
                      countryCodeEditable={false}
                      specialLabel=""
                      placeholder="Enter mobile number"
                    />
                  </div>                  {/* Better validation message with more detailed feedback */}
                  {newStudent.phoneNumber !== "" && !isValidIndianPhone(newStudent.phoneNumber) && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                      <p className="text-xs text-destructive">
                        Please enter a valid Indian mobile number (10 digits starting with 6-9)
                      </p>
                    </div>
                  )}
                  {newStudent.phoneNumber === "" && document.activeElement?.id !== "phone-input" && newStudent.name !== "" && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                      <p className="text-xs text-destructive">
                        Phone number is required
                      </p>
                    </div>
                  )}
                  {newStudent.phoneNumber !== "" && isValidIndianPhone(newStudent.phoneNumber) && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <p className="text-xs text-green-500">
                        Valid phone number
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                <div className="space-y-2">
                  <Label htmlFor="student-joined-date" className="text-sm font-medium">
                    Joined Date <span className="text-destructive">*</span>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-status" className="text-sm font-medium">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={newStudent.status} 
                  onValueChange={(value: "Active" | "Inactive") => setNewStudent({ ...newStudent, status: value })}
                >
                  <SelectTrigger className="border-primary/20 focus-visible:ring-primary/30">
                    <SelectValue placeholder="Select student status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Course Information Section */}
            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-md">Course Information</h3>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Course Mode <span className="text-destructive">*</span>
                </Label>
                <RadioGroup 
                  defaultValue="Online"
                  value={newStudent.courseMode}
                  onValueChange={(value) => setNewStudent({ ...newStudent, courseMode: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Online" id="online" />
                    <Label htmlFor="online" className="cursor-pointer">Online</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Offline" id="offline" />
                    <Label htmlFor="offline" className="cursor-pointer">Offline</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Hybrid" id="hybrid" />
                    <Label htmlFor="hybrid" className="cursor-pointer">Hybrid</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Courses <span className="text-destructive">*</span>
                </Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {courses.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">Loading courses...</div>
                  ) : (
                    courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`course-${course.id}`} 
                            checked={selectedCourses.some(c => c.id === course.id)}
                            onCheckedChange={() => handleCourseToggle(course)}
                          />
                          <Label 
                            htmlFor={`course-${course.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {course.title} <span className="text-xs text-muted-foreground">(ID: {course.courseID})</span>
                          </Label>
                        </div>
                        
                        {selectedCourses.some(c => c.id === course.id) && (
                          <div className="flex items-center space-x-3">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="primaryCourse" 
                                className="radio radio-sm radio-primary"
                                checked={selectedCourses.findIndex(c => c.id === course.id) === newStudent.primaryCourseIndex}
                                onChange={() => setPrimaryCourse(selectedCourses.findIndex(c => c.id === course.id))}
                              />
                              <span className="text-xs">Primary</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {selectedCourses.length === 0 && (
                  <p className="text-xs text-destructive">Please select at least one course</p>
                )}
                <div className="text-sm text-muted-foreground flex items-center">
                  <Info className="h-3 w-3 mr-1" /> 
                  Select the primary course by clicking the radio button
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-notes" className="text-sm font-medium">
                  Notes <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="student-notes"
                  value={newStudent.notes}
                  onChange={(e) => setNewStudent({ ...newStudent, notes: e.target.value })}
                  placeholder="Any additional information about the student"
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreatingStudent || !isFormValid}
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

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Student Creation</DialogTitle>
            <DialogDescription>
              Please review the student details before final submission
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Personal Information</h4>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div className="text-muted-foreground">Name:</div>
                <div>{newStudent.name}</div>
                
                <div className="text-muted-foreground">Email:</div>
                <div>{newStudent.username}</div>
                
                <div className="text-muted-foreground">Phone:</div>
                <div>{newStudent.phoneNumber}</div>
                
                <div className="text-muted-foreground">Student ID:</div>
                <div>{newStudent.studentId}</div>
                
                <div className="text-muted-foreground">Joined Date:</div>
                <div>{new Date(newStudent.joinedDate).toLocaleDateString()}</div>
                
                <div className="text-muted-foreground">Status:</div>
                <div>{newStudent.status}</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Course Information</h4>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div className="text-muted-foreground">Course Mode:</div>
                <div>{newStudent.courseMode}</div>
                
                <div className="text-muted-foreground">Total Courses:</div>
                <div>{selectedCourses.length}</div>
                
                <div className="text-muted-foreground">Primary Course:</div>
                <div>{selectedCourses[newStudent.primaryCourseIndex]?.title || "N/A"}</div>
              </div>
              
              <div className="mt-2">
                <h5 className="text-xs font-medium">Enrolled Courses:</h5>
                <ul className="text-xs ml-5 list-disc">
                  {selectedCourses.map((course, index) => (
                    <li key={course.id} className={index === newStudent.primaryCourseIndex ? "font-medium" : ""}>
                      {course.title} {index === newStudent.primaryCourseIndex && "(Primary)"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Email Preview</h4>
              <div className="text-xs border rounded-md p-3 bg-muted/30">
                <p><strong>To:</strong> {newStudent.username}</p>
                <p><strong>Subject:</strong> Your LMS Portal Account Details</p>
                <p className="mt-2">
                  Dear {newStudent.name},<br /><br />
                  Welcome to our Learning Management System! Your account has been created successfully.<br /><br />
                  <strong>Login Details:</strong><br />
                  Username: {newStudent.username}<br />
                  Password: {newStudent.password}<br />
                  Student ID: {newStudent.studentId}<br /><br />
                  Primary Course: {selectedCourses[newStudent.primaryCourseIndex]?.title || "N/A"}<br />
                  Course Mode: {newStudent.courseMode}<br /><br />
                  Please login at your earliest convenience to start your learning journey.<br /><br />
                  Best Regards,<br />
                  The Admin Team
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmAndCreateStudent}
              disabled={isCreatingStudent}
              className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all shadow-md"
            >
              {isCreatingStudent ? (
                <div className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-background border-t-transparent rounded-full"></span>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Check className="mr-2 h-4 w-4" /> Confirm & Create
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
