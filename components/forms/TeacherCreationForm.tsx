"use client"

import React, { useState, useEffect } from "react"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { X } from "lucide-react"
import { toast } from "sonner"
import UserFormBase, { BaseUserData } from "@/components/forms/UserFormBase"

interface Course {
  id: string;
  title: string;
  courseID: number;
}

interface TeacherFormData extends BaseUserData {
  role: 'teacher' | 'admin';
  roleId: number; // Role ID for teacher
  assignedCourses: string[]; // Course IDs teacher will be assigned to
  joinedDate: string; // ISO string format
  specialization: string;
  createdAt: Date;
}

export default function TeacherCreationForm() {
  // State for courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [error, setError] = useState("");
  const [specialization, setSpecialization] = useState("");
  
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
      } catch (err) {
        console.error("Error fetching courses:", err);
        toast.error("Failed to load courses");
      }
    };

    fetchCourses();
  }, []);
  
  // Handle course selection
  const handleCourseSelection = (courseId: string, isSelected: boolean): void => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    if (isSelected) {
      setSelectedCourses(prev => [...prev, course]);
    } else {
      setSelectedCourses(prev => prev.filter(c => c.id !== courseId));
    }
  };
  
  // Password generation function
  const generatePassword = (name: string, email: string): string => {
    // Extract teacher information parts
    const fullName = name.trim();
    const nameSegments = fullName.split(' ').filter(segment => segment);
    const firstName = nameSegments.length > 0 ? nameSegments[0] : '';
    const lastName = nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] : '';
    
    const emailUsername = email.split('@')[0] || '';
    const emailDomain = email.split('@')[1]?.split('.')[0] || '';
    
    // Use specialization info
    const teacherSpecialization = specialization || "Teacher";
    const specializationInitials = teacherSpecialization
      .split(' ')
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
    
    // Name transformations
    const nameReversed = firstName.split('').reverse().join('').substring(0, 3);
    const firstNameInitial = firstName.charAt(0).toUpperCase();
    const lastNameInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    // Create different password patterns
    const passwordPatterns = [
      // Pattern 1: First name + Last name initial + Year + Special char
      firstName.substring(0, 4).toLowerCase() + 
      lastNameInitial + 
      year + 
      specialChar,
      
      // Pattern 2: Full name initials + Specialization + Date
      nameSegments.map(n => n[0].toUpperCase()).join('') + 
      specializationInitials.substring(0, 2) +
      month + day + 
      specialChar,
      
      // Pattern 3: Email username + Specialization + Special char
      emailUsername.substring(0, 4) + 
      specializationInitials.substring(0, 2) + 
      specialChar + 
      year,
      
      // Pattern 4: First name + Random number + Special char + Year
      firstName.substring(0, 3).toLowerCase() + 
      randomNum + 
      specialChar +
      year
    ];
    
    // Select one pattern randomly
    return passwordPatterns[Math.floor(Math.random() * passwordPatterns.length)];
  };
  
  // Check if username exists
  const checkUsernameExists = async (email: string): Promise<boolean> => {
    try {
      const q = query(collection(db, "admin"), where("username", "==", email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email existence:", error);
      return false;
    }
  };
  
  // Handle form submission
  const handleCreateTeacher = async (userData: BaseUserData): Promise<void> => {
    try {
      setIsCreatingTeacher(true);
      setError("");
      
      // Check if username already exists
      const usernameExists = await checkUsernameExists(userData.username);
      if (usernameExists) {
        setError("A user with this email already exists");
        setIsCreatingTeacher(false);
        return;
      }
      
      // Create teacher data
      const teacherData: TeacherFormData = {
        ...userData,
        role: "teacher",
        roleId: 2,
        assignedCourses: selectedCourses.map(course => course.id),
        joinedDate: new Date().toISOString(),
        specialization,
        createdAt: new Date()
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, "admin"), teacherData);
      
      // Todo: When implementing custom claims, you'd call your API endpoint here:
      // await fetch('/api/admin/set-custom-claims', { 
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     uid: docRef.id,
      //     claims: { role: 'teacher', courses: teacherData.assignedCourses }
      //   })
      // });
      
      toast.success("Teacher created successfully");
      
      // Reset form state
      setSelectedCourses([]);
      setSpecialization("");
      
    } catch (err) {
      console.error("Error creating teacher:", err);
      setError("Failed to create teacher account");
    } finally {
      setIsCreatingTeacher(false);
    }
  };
  
  // Additional fields for teacher form
  const TeacherAdditionalFields = (
    <div className="space-y-6">
      {/* Specialization */}
      <div className="space-y-2">
        <Label htmlFor="specialization">Specialization</Label>
        <Input 
          id="specialization"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          placeholder="E.g. Web Development, Data Science"
        />
      </div>
      
      {/* Course Assignment */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Course Assignment</h3>
        <p className="text-sm text-muted-foreground">Select the courses this teacher will be responsible for.</p>
        
        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
          {courses.length > 0 ? (
            <div className="space-y-3">
              {courses.map(course => (
                <div key={course.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`course-${course.id}`}
                    checked={selectedCourses.some(c => c.id === course.id)}
                    onCheckedChange={(checked) => handleCourseSelection(course.id, checked === true)}
                  />
                  <Label htmlFor={`course-${course.id}`} className="flex-1 cursor-pointer">
                    {course.title} <span className="text-xs text-muted-foreground ml-1">#{course.courseID}</span>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No active courses available</p>
          )}
        </div>
        
        {selectedCourses.length > 0 && (
          <div>
            <p className="text-sm font-medium">Selected courses ({selectedCourses.length}):</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCourses.map(course => (
                <div key={course.id} className="flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-xs">
                  {course.title}
                  <X 
                    size={14} 
                    className="ml-2 cursor-pointer" 
                    onClick={() => handleCourseSelection(course.id, false)} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <UserFormBase
      formTitle="Create Teacher Account"
      formDescription="Add a new teacher to the platform"
      userType="teacher"
      additionalFields={TeacherAdditionalFields}
      isSubmitting={isCreatingTeacher}
      submitError={error}
      onSubmit={handleCreateTeacher}
      generatePassword={generatePassword}
    />
  );
}
