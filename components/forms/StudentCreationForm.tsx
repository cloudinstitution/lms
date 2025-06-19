"use client"

import React, { useState, useEffect } from "react"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import emailjs from "@emailjs/browser"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { X } from "lucide-react"
import { toast } from "sonner"
import UserFormBase, { BaseUserData } from "@/components/forms/UserFormBase"

// EmailJS Config
const SERVICE_ID = "service_0wpennn"
const TEMPLATE_ID = "template_zly25zz"
const PUBLIC_KEY = "f_2D0VC3LQZjhZDMC"

interface Course {
  id: string;
  title: string;
  courseID: number;
}

interface StudentFormData extends BaseUserData {
  studentId: string;
  coursesEnrolled: number;
  courseName: string[];
  courseID: number[];
  primaryCourseIndex: number;
  courseMode: "Online" | "Offline";
}

export default function StudentCreationForm() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [primaryCourseIndex, setPrimaryCourseIndex] = useState(0);
  const [courseMode, setCourseMode] = useState<"Online" | "Offline">("Online");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  
  // Initialize EmailJS
  useEffect(() => {
    emailjs.init(PUBLIC_KEY);
  }, []);
  
  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesCollection = collection(db, "courses");
        const coursesSnapshot = await getDocs(coursesCollection);
        const coursesList = coursesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            title: doc.data().title,
            courseID: doc.data().courseID || 0
          }))
          .sort((a, b) => a.title.localeCompare(b.title));

        setCourses(coursesList);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Failed to load courses");
      }
    };

    fetchCourses();
  }, []);
  
  // Get next student ID
  useEffect(() => {
    const getNextStudentId = async () => {
      try {
        const snapshot = await getDocs(collection(db, "students"));
        let maxNumber = 0;
        const currentYear = new Date().getFullYear();
        const prefix = `CI${currentYear}`;

        snapshot.forEach((doc) => {
          const sid = doc.data().studentId;
          if (typeof sid === "string" && sid.startsWith(prefix)) {
            const numberPart = sid.replace(prefix, "");
            const number = Number.parseInt(numberPart, 10);
            if (!isNaN(number) && number > maxNumber) {
              maxNumber = number;
            }
          }
        });

        const nextNumber = (maxNumber + 1).toString().padStart(3, "0"); // e.g., 3 → '004'
        const nextId = `${prefix}${nextNumber}`;
        setStudentId(nextId);
      } catch (err) {
        console.error("Failed to get next student ID:", err);
      }
    };

    getNextStudentId();
  }, []);
  
  // Function to toggle course selection
  const handleCourseSelection = (courseItem: Course, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCourses(prev => [...prev, courseItem]);
    } else {
      setSelectedCourses(prev => {
        const newCourses = prev.filter(c => c.id !== courseItem.id);
        
        // If removing primary course, reset primary index
        if (primaryCourseIndex >= newCourses.length) {
          setPrimaryCourseIndex(newCourses.length > 0 ? 0 : 0);
        }
        
        return newCourses;
      });
    }
  };
  
  // Password generation function
  const generatePassword = (name: string, email: string): string => {
    // Extract student information parts
    const fullName = name.trim();
    const nameSegments = fullName.split(' ').filter(segment => segment);
    const firstName = nameSegments.length > 0 ? nameSegments[0] : '';
    const lastName = nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] : '';
    
    const emailUsername = email.split('@')[0] || '';
    
    // Get course info if available
    const courseName = selectedCourses.length > 0 ? selectedCourses[0].title : 'Course';
    
    const courseInitials = courseName.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
    
    // Date information
    const dateObj = new Date();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(-2);
    
    // Special characters and numbers
    const specialChars = ['!', '@', '#', '$', '%', '&', '*'];
    const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
    const randomNum = Math.floor(Math.random() * 900 + 100); // 3-digit number
    
    // Create different password patterns
    const passwordPatterns = [
      // Pattern 1: First name + Last name initial + Student ID digits + Special char
      firstName.substring(0, 4).toLowerCase() + 
      (lastName ? lastName[0].toUpperCase() : '') + 
      studentId.slice(-3) + 
      specialChar,
      
      // Pattern 2: Name initials + Course code + Date + Special char
      nameSegments.map(n => n[0].toUpperCase()).join('') + 
      courseInitials.substring(0, 2) +
      day + month + 
      specialChar,
      
      // Pattern 3: Email + Course + Special char
      emailUsername.substring(0, 4) + 
      courseInitials.substring(0, 2) + 
      specialChar + 
      year
    ];
    
    // Select one pattern randomly
    const selectedPassword = passwordPatterns[Math.floor(Math.random() * passwordPatterns.length)];
    return selectedPassword;
  };
  
  // Check if username exists
  const checkUsernameExists = async (email: string): Promise<boolean> => {
    try {
      const q = query(collection(db, "students"), where("username", "==", email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email existence:", error);
      return false;
    }
  };
  
  // Handle form submission
  const handleCreateStudent = async (userData: BaseUserData): Promise<void> => {
    try {
      setIsCreatingStudent(true);
      setError("");
      
      // Check if username already exists
      const usernameExists = await checkUsernameExists(userData.username);
      if (usernameExists) {
        setError("A student with this email already exists");
        setIsCreatingStudent(false);
        return;
      }
        // Extract primary course
      const calculatedPrimaryIndex = Math.min(primaryCourseIndex, selectedCourses.length - 1);
      const primaryCourse = selectedCourses[calculatedPrimaryIndex >= 0 ? calculatedPrimaryIndex : 0];
      
      // Create student document
      const studentData = {
        ...userData,
        studentId,
        coursesEnrolled: selectedCourses.length,
        courseName: selectedCourses.map(c => c.title),
        courseID: selectedCourses.map(c => c.courseID),
        primaryCourseIndex: calculatedPrimaryIndex,
        courseMode,
        // If there are selected courses, add primary course info
        ...(selectedCourses.length > 0 ? {
          primaryCourseId: primaryCourse.id,
          primaryCourseTitle: primaryCourse.title,
          primaryCourseCode: primaryCourse.courseID,
        } : {}),
        joinedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      
      await addDoc(collection(db, "students"), studentData);
      
      // Send welcome email if email is provided
      if (userData.username) {
        try {
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            to_name: userData.name,
            to_email: userData.username,
            from_name: "LMS Portal Admin",
            student_id: studentId,
            password: userData.password,
            courses: selectedCourses.map(c => c.title).join(", "),
            message: `Welcome to the LMS Portal! You have been registered for ${selectedCourses.length} course(s).`
          });
          
          toast.success("Welcome email sent successfully");
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          toast.error("Failed to send welcome email");
        }
      }
      
      toast.success("Student created successfully");
      
      // Reset form state
      setSelectedCourses([]);
      setPrimaryCourseIndex(0);
      setCourseMode("Online");
      // Get next student ID
      const snapshot = await getDocs(collection(db, "students"));
      let maxNumber = 0;
      const currentYear = new Date().getFullYear();
      const prefix = `CI${currentYear}`;
      
      snapshot.forEach((doc) => {
        const sid = doc.data().studentId;
        if (typeof sid === "string" && sid.startsWith(prefix)) {
          const numberPart = sid.replace(prefix, "");
          const number = Number.parseInt(numberPart, 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      });
      
      const nextNumber = (maxNumber + 1).toString().padStart(3, "0");
      setStudentId(`${prefix}${nextNumber}`);
      
    } catch (error) {
      console.error("Error creating student:", error);
      setError("Failed to create student account");
      toast.error("Error creating student");
    } finally {
      setIsCreatingStudent(false);
    }
  };
  
  // Course selection component
  const CourseSelectionFields = (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Course Enrollment</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Student ID</Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            {studentId || "Generating..."}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="courseMode">Course Mode</Label>
          <Select
            value={courseMode}
            onValueChange={(value) => setCourseMode(value as "Online" | "Offline")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Course Selection</Label>
        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
          {courses.length > 0 ? (
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`course-${course.id}`}
                    checked={selectedCourses.some(c => c.id === course.id)}
                    onCheckedChange={(checked) => 
                      handleCourseSelection(course, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`course-${course.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {course.title}
                    <span className="text-xs text-muted-foreground ml-1">
                      #{course.courseID}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">Loading available courses...</p>
          )}
        </div>
      </div>
      
      {selectedCourses.length > 0 && (
        <>
          <div>
            <Label>Selected Courses ({selectedCourses.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-xs"
                >
                  {course.title}
                  <X
                    size={14}
                    className="ml-2 cursor-pointer"
                    onClick={() => handleCourseSelection(course, false)}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="primaryCourse">Primary Course</Label>
            <Select
              value={primaryCourseIndex.toString()}
              onValueChange={(value) => setPrimaryCourseIndex(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select primary course" />
              </SelectTrigger>
              <SelectContent>
                {selectedCourses.map((course, index) => (
                  <SelectItem key={course.id} value={index.toString()}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The primary course will be the student's main course of study.
            </p>
          </div>
        </>
      )}
    </div>
  );
  
  return (
    <UserFormBase
      formTitle="Create Student Account"
      formDescription="Add a new student to the platform"
      userType="student"
      additionalFields={CourseSelectionFields}
      isSubmitting={isCreatingStudent}
      submitError={error}
      onSubmit={handleCreateStudent}
      generatePassword={generatePassword}
    />
  );
}
