import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { X } from 'lucide-react';
import React from 'react';
import { Student } from '../../../../types/student';

interface Course {
  id: string;
  title: string;
  courseID: number;
}

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onSave: (student: Partial<Student>) => void;
}

export function EditStudentDialog({
  student,
  open,
  onClose,
  onSave,
}: EditStudentDialogProps) {
  const [formData, setFormData] = React.useState<Partial<Student>>({});
  const [availableCourses, setAvailableCourses] = React.useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch available courses on component mount
  React.useEffect(() => {
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

        setAvailableCourses(coursesList);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    if (open) {
      fetchCourses();
    }
  }, [open]);

  React.useEffect(() => {
    if (student) {
      setFormData(student);
      
      // Set selected courses based on student's courseID and courseName arrays
      if (student.courseID && student.courseName) {
        const studentCourses = student.courseID.map((courseId, index) => ({
          id: '', // We'll match by courseID instead
          title: student.courseName![index] || '',
          courseID: courseId
        }));
        setSelectedCourses(studentCourses);
      }
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Update course-related fields
    const updatedData = {
      ...formData,
      coursesEnrolled: selectedCourses.length,
      courseID: selectedCourses.map(course => course.courseID),
      courseName: selectedCourses.map(course => course.title),
    };

    onSave(updatedData);
    setLoading(false);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCourseSelection = (course: Course, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCourses(prev => [...prev, course]);
    } else {
      setSelectedCourses(prev => prev.filter(c => c.courseID !== course.courseID));
    }
  };

  const removeCourse = (courseId: number) => {
    setSelectedCourses(prev => prev.filter(c => c.courseID !== courseId));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information. Student ID and Join Date cannot be modified.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Email *</Label>
                <Input
                  id="username"
                  type="email"
                  value={formData.username || ''}
                  onChange={(e) => handleChange('username', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'Active'}
                  onValueChange={(value) => handleChange('status', value)}
                >
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

            {/* Read-only fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <Input
                  value={formData.studentId || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Join Date</Label>
                <Input
                  value={formData.joinedDate ? new Date(formData.joinedDate).toLocaleDateString() : ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Course Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Course Enrollment</h3>
            
            {/* Selected Courses */}
            {selectedCourses.length > 0 && (
              <div className="space-y-2">
                <Label>Currently Enrolled Courses ({selectedCourses.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCourses.map((course) => (
                    <div
                      key={course.courseID}
                      className="flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-sm"
                    >
                      {course.title}
                      <button
                        type="button"
                        onClick={() => removeCourse(course.courseID)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Courses */}
            <div className="space-y-2">
              <Label>Available Courses</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                {availableCourses.length > 0 ? (
                  <div className="space-y-2">
                    {availableCourses.map((course) => {
                      const isSelected = selectedCourses.some(c => c.courseID === course.courseID);
                      return (
                        <div key={course.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={isSelected}
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
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">Loading available courses...</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
