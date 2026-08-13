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
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
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
  const [coursesLoading, setCoursesLoading] = React.useState(false);
  const [coursesError, setCoursesError] = React.useState<string | null>(null);

  // Password change state
  const [showPasswordFields, setShowPasswordFields] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  // Fetch available courses whenever the dialog opens
  React.useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const coursesCollection = collection(db, "courses");
        const coursesSnapshot = await getDocs(coursesCollection);

        const coursesList = coursesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title ?? data.courseTitle ?? data.name ?? 'Untitled course',
              courseID: data.courseID ?? 0,
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title));

        setAvailableCourses(coursesList);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setCoursesError(
          error instanceof Error ? error.message : "Failed to load courses"
        );
      } finally {
        setCoursesLoading(false);
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
          id: '', // We match by courseID instead of doc id
          title: student.courseName![index] || '',
          courseID: courseId,
        }));
        setSelectedCourses(studentCourses);
      } else {
        setSelectedCourses([]);
      }
    }

    // Reset password fields whenever a different student is loaded or dialog reopens
    setShowPasswordFields(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setPasswordError(null);
  }, [student, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password fields only if the admin opted to change it
    if (showPasswordFields) {
      if (newPassword.length < 6) {
        setPasswordError('Password must be at least 6 characters long');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
    }
    setPasswordError(null);
    setLoading(true);

    // Update course-related fields
    const updatedData: Partial<Student> = {
      ...formData,
      coursesEnrolled: selectedCourses.length,
      courseID: selectedCourses.map((course) => course.courseID),
      courseName: selectedCourses.map((course) => course.title),
    };

    // Only include the password if the admin actually set a new one
    if (showPasswordFields && newPassword) {
      updatedData.password = newPassword;
    }

    onSave(updatedData);
    setLoading(false);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCourseSelection = (course: Course, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCourses((prev) => [...prev, course]);
    } else {
      setSelectedCourses((prev) =>
        prev.filter((c) => String(c.courseID) !== String(course.courseID))
      );
    }
  };

  const removeCourse = (courseId: number) => {
    setSelectedCourses((prev) =>
      prev.filter((c) => String(c.courseID) !== String(courseId))
    );
  };

  const toggleShowPasswordFields = () => {
    setShowPasswordFields((prev) => {
      const next = !prev;
      if (!next) {
        // Collapsing the section clears any partially-entered password
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
      }
      return next;
    });
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
                  value={
                    formData.joinedDate
                      ? new Date(formData.joinedDate).toLocaleDateString()
                      : ''
                  }
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Password Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Password</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleShowPasswordFields}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
              </Button>
            </div>

            {showPasswordFields && (
              <div className="space-y-4 border rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Enter new password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The new password will be saved when you click &quot;Save Changes&quot; below.
                </p>
              </div>
            )}
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
                {coursesLoading ? (
                  <p className="text-center py-4 text-muted-foreground">
                    Loading available courses...
                  </p>
                ) : coursesError ? (
                  <p className="text-center py-4 text-red-500">
                    Couldn&apos;t load courses: {coursesError}
                  </p>
                ) : availableCourses.length > 0 ? (
                  <div className="space-y-2">
                    {availableCourses.map((course) => {
                      const isSelected = selectedCourses.some(
                        (c) => String(c.courseID) === String(course.courseID)
                      );
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
                  <p className="text-center py-4 text-muted-foreground">
                    No courses found in the &quot;courses&quot; collection.
                  </p>
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
