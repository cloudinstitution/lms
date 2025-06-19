"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getAdminSession } from "@/lib/session-storage"
import { Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"
import { setUserCustomClaims } from "@/lib/firebase-admin-client"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"

export default function TeacherManagement() {
  const [loading, setLoading] = useState(false)
  const [teachers, setTeachers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [adminUser, setAdminUser] = useState<any>(null)
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
    roleId: 2,
    assignedCourses: []
  })
  
  // Fetch admin user data to confirm they're an admin
  useEffect(() => {
    const adminData = getAdminSession()
    if (!adminData || adminData.role !== 'admin') {
      // Only admins can access this component
      return
    }
    
    setAdminUser(adminData)
    fetchTeachersAndCourses()
  }, [])
  
  const fetchTeachersAndCourses = async () => {
    setLoading(true)
    try {
      // Get all users with roleId = 2 (teachers)
      const teachersQuery = query(collection(db, "admin"), where("roleId", "==", 2))
      const teacherDocs = await getDocs(teachersQuery)
      const teachersData = teacherDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Get all active courses
      const coursesQuery = query(collection(db, "courses"), where("status", "==", "Active"))
      const courseDocs = await getDocs(coursesQuery)
      const coursesData = courseDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setTeachers(teachersData)
      setCourses(coursesData)
    } catch (error) {
      console.error("Error fetching teachers or courses:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewTeacher(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCourseAssignment = (teacherId: string, courseId: string, isAssigned: boolean) => {
    setTeachers(prevTeachers => {
      return prevTeachers.map(teacher => {
        if (teacher.id === teacherId) {
          const assignedCourses = [...(teacher.assignedCourses || [])]
          
          if (isAssigned) {
            // Add course if not already assigned
            if (!assignedCourses.includes(courseId)) {
              assignedCourses.push(courseId)
            }
          } else {
            // Remove course
            const index = assignedCourses.indexOf(courseId)
            if (index !== -1) {
              assignedCourses.splice(index, 1)
            }
          }
          
          return { ...teacher, assignedCourses }
        }
        return teacher
      })
    })
  }
    const saveTeacherCourses = async (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId)
    if (!teacher) return
    
    setLoading(true)
    try {
      // Update in Firestore database
      await updateDoc(doc(db, "admin", teacherId), {
        assignedCourses: teacher.assignedCourses || []
      })
      
      // Update custom claims - this updates security rules immediately
      await setUserCustomClaims(teacherId, {
        role: 'teacher',
        assignedCourses: teacher.assignedCourses || []
      })
      
      toast.success("Teacher course assignments updated with security permissions")
    } catch (error) {
      console.error("Error updating teacher courses:", error)
      toast.error("Failed to update course assignments")
    } finally {
      setLoading(false)
    }
  }
    const createNewTeacher = async () => {
    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setLoading(true)
    try {
      // Check if email already exists in admin collection
      const existingUsersQuery = query(collection(db, "admin"), where("username", "==", newTeacher.email))
      const existingUsers = await getDocs(existingUsersQuery)
      
      if (!existingUsers.empty) {
        toast.error("A user with this email already exists")
        setLoading(false)
        return
      }
      
      // Create a new Firebase Auth user
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newTeacher.email, 
        newTeacher.password
      );
      
      const user = userCredential.user;
      const teacherId = user.uid;
      
      // Create new teacher document in Firestore
      await setDoc(doc(db, "admin", teacherId), {
        ...newTeacher,
        id: teacherId,
        username: newTeacher.email,
        createdAt: new Date()
      });
      
      // Set custom claims for the new teacher
      await setUserCustomClaims(teacherId, {
        role: 'teacher',
        assignedCourses: []
      });
      
      // Show success message
      toast.success("Teacher account created successfully with role-based access");
      
      // Reset form and refresh data
      setNewTeacher({
        name: "",
        email: "",
        password: "",
        role: "teacher",
        roleId: 2,
        assignedCourses: []
      });
      
      fetchTeachersAndCourses();
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast.error(`Failed to create teacher account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }
  
  // Check if user is authorized to view this component
  if (adminUser?.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teacher Management</CardTitle>
          <CardDescription>You don't have permission to access this page</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Teacher Account</CardTitle>
          <CardDescription>Add a new teacher to the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacherName">Name</Label>
              <Input 
                id="teacherName" 
                name="name"
                value={newTeacher.name}
                onChange={handleInputChange}
                placeholder="Teacher's full name" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherEmail">Email</Label>
              <Input 
                id="teacherEmail" 
                name="email"
                type="email"
                value={newTeacher.email}
                onChange={handleInputChange}
                placeholder="teacher@example.com" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacherPassword">Password</Label>
            <Input 
              id="teacherPassword" 
              name="password"
              type="password"
              value={newTeacher.password}
              onChange={handleInputChange}
              placeholder="Set a temporary password" 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={createNewTeacher} 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create Teacher Account
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Teachers</CardTitle>
          <CardDescription>Assign courses to teachers</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No teachers found. Create a teacher account to get started.
            </div>
          ) : (
            <div className="space-y-6">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="space-y-4 border-b pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{teacher.name}</h3>
                      <p className="text-sm text-muted-foreground">{teacher.username}</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => saveTeacherCourses(teacher.id)}
                    >
                      Save Assignments
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Assigned Courses</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {courses.length > 0 ? (
                        courses.map(course => {
                          const isAssigned = teacher.assignedCourses?.includes(course.id);
                          return (
                            <div 
                              key={course.id}
                              className={`flex items-center justify-between p-2 border rounded-md ${
                                isAssigned ? 'bg-primary/10 border-primary/20' : ''
                              }`}
                            >
                              <span>{course.title || course.name}</span>
                              <Button
                                size="sm"
                                variant={isAssigned ? "default" : "outline"}
                                onClick={() => handleCourseAssignment(teacher.id, course.id, !isAssigned)}
                              >
                                {isAssigned ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Assigned
                                  </>
                                ) : "Assign"}
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground">No courses available</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
