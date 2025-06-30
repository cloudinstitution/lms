"use client"

import UserFormBase, { BaseUserData } from "@/components/forms/UserFormBase"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db } from "@/lib/firebase"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Course {
  id: string;
  title: string;
  courseID: number;
}

interface AdminFormData extends BaseUserData {
  role: 'admin';
  roleId: number; // Role ID for admin
  assignedCourses: string[]; // Course IDs admin will oversee
  joinedDate: string; // ISO string format
  department: string;
  accessLevel: 'full' | 'limited';
  createdAt: Date;
}

export default function AdminCreationForm() {
  // State for courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState("");
  const [accessLevel, setAccessLevel] = useState<'full' | 'limited'>('full');
  
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
        toast.error("Failed to load courses", {
          description: "Please try refreshing the page"
        });
      }
    };

    fetchCourses();
  }, []);

  // Handle course selection
  const handleCourseSelection = (courseId: string, isSelected: boolean) => {
    setSelectedCourses(prev => {
      if (isSelected) {
        const courseToAdd = courses.find(c => c.id === courseId);
        return courseToAdd && !prev.some(c => c.id === courseId) 
          ? [...prev, courseToAdd] 
          : prev;
      } else {
        return prev.filter(c => c.id !== courseId);
      }
    });
  };

  // Generate password
  const generatePassword = (name: string, email: string): string => {
    // Basic input validation
    if (!name || !email) {
      return 'Admin123!';
    }

    // Name processing
    const nameSegments = name.trim().split(' ').filter(segment => segment.length > 0);
    const firstName = nameSegments[0] || '';
    const lastName = nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] : '';
    
    const emailUsername = email.split('@')[0] || '';
    const emailDomain = email.split('@')[1]?.split('.')[0] || '';
    
    // Use department info
    const adminDepartment = department || "Admin";
    const departmentInitials = adminDepartment
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
    const firstNameInitial = firstName.charAt(0).toUpperCase();
    const lastNameInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    // Create different password patterns
    const passwordPatterns = [
      // Pattern 1: First name + Last name initial + Year + Special char
      firstName.substring(0, 4).toLowerCase() + 
      lastNameInitial + 
      year + 
      specialChar,
      
      // Pattern 2: Full name initials + Department + Date
      nameSegments.map(n => n[0].toUpperCase()).join('') + 
      departmentInitials.substring(0, 2) +
      month + day + 
      specialChar,
      
      // Pattern 3: Email username + Department + Special char
      emailUsername.substring(0, 4) + 
      departmentInitials.substring(0, 2) + 
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

  // Create admin function
  const handleCreateAdmin = async (baseData: BaseUserData) => {
    setIsCreatingAdmin(true);
    setError("");

    try {
      // Validate required fields
      if (!department.trim()) {
        throw new Error("Department is required");
      }

      // Check if admin with this email already exists
      const existingAdminQuery = query(
        collection(db, "admin"), 
        where("username", "==", baseData.username)
      );
      const existingAdminSnapshot = await getDocs(existingAdminQuery);
      
      if (!existingAdminSnapshot.empty) {
        throw new Error("An admin with this email already exists");
      }

      // Prepare admin data
      const adminData: AdminFormData = {
        ...baseData,
        role: 'admin',
        roleId: 1, // Admin role ID is always 1
        assignedCourses: selectedCourses.map(c => c.id),
        joinedDate: new Date().toISOString(),
        department: department.trim(),
        accessLevel,
        createdAt: new Date()
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "admin"), adminData);
      
      toast.success("Admin created successfully!", {
        description: `Admin ${baseData.name} has been added to the system`,
        duration: 5000
      });

      // Reset form
      setSelectedCourses([]);
      setDepartment("");
      setAccessLevel('full');

    } catch (error: any) {
      console.error("Error creating admin:", error);
      setError(error.message || "Failed to create admin account");
      toast.error("Failed to create admin", {
        description: error.message || "Please try again",
        duration: 5000
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };
  
  // Additional fields for admin form
  const AdminAdditionalFields = (
    <div className="space-y-6">
      {/* Department */}
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input 
          id="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="E.g. Academic Affairs, IT Department"
          required
        />
      </div>

      {/* Access Level */}
      <div className="space-y-2">
        <Label htmlFor="accessLevel">Access Level</Label>
        <Select value={accessLevel} onValueChange={(value: 'full' | 'limited') => setAccessLevel(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full Access</SelectItem>
            <SelectItem value="limited">Limited Access</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Full access allows complete system control, limited access restricts certain administrative functions
        </p>
      </div>

      {/* Course Oversight */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Course Oversight</h3>
        <p className="text-sm text-muted-foreground">Select the courses this admin will oversee (optional).</p>
        
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
      formTitle="Create Admin Account"
      formDescription="Add a new administrator to the platform"
      userType="admin"
      additionalFields={AdminAdditionalFields}
      isSubmitting={isCreatingAdmin}
      submitError={error}
      onSubmit={handleCreateAdmin}
      generatePassword={generatePassword}
    />
  );
}
