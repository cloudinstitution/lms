# New Attendance System

This document explains how to use the new attendance system that follows the Firebase structure:

```
attendance (collection)
  └── [courseId] (document)
        └── dates (subcollection)
              └── [dateId: e.g., 2025-06-24]
                    └── {
                          presentStudents: [studentId1, studentId2],
                          createdBy: authenticatedUserId, // ID of who marked attendance
                          createdByName: "admin", // Role of who marked attendance (admin/teacher)
                          timestamp: ...
                        }
```

## Key Features

1. **Hierarchical Structure**: Attendance is organized by course, then by date
2. **Atomic Operations**: Uses Firebase batches for data consistency
3. **Complete User Tracking**: Every attendance record includes both ID and role of who marked it
4. **Authentication Integration**: Uses Firebase Auth to track admin/teacher information
5. **Comprehensive API**: Full CRUD operations with proper error handling
6. **React Integration**: Ready-to-use hooks and components
7. **Type Safety**: Full TypeScript support

## Usage Examples

### 1. Basic Attendance Marking

```typescript
import { useNewAttendance } from '@/hooks/use-new-attendance';
import { useAuth } from '@/lib/auth-context';
import { getAdminSession } from '@/lib/session-storage';

const { markAttendance, loading, error } = useNewAttendance();
const { user, userProfile } = useAuth();

const handleMarkAttendance = async () => {
  const result = await markAttendance({
    courseId: 'course-123',
    date: '2025-06-24',
    presentStudents: ['student-1', 'student-2', 'student-3'],
    teacherId: getAdminSession()?.id || userProfile?.firestoreId || user?.uid || 'admin', // Uses admin session Firestore document ID as primary source
    teacherName: getAdminSession()?.role || userProfile?.role || 'admin' // Uses admin session role
  });

  if (result.success) {
    console.log('Attendance marked successfully');
  }
};
```

### 2. Getting Course Attendance

```typescript
import { useNewAttendance } from '@/hooks/use-new-attendance';

const { getCourseAttendance } = useNewAttendance();

// Get attendance for a specific date
const getSpecificDate = async () => {
  const result = await getCourseAttendance({
    courseId: 'course-123',
    date: '2025-06-24'
  });
  
  if (result.success) {
    console.log('Attendance data:', result.data);
  }
};

// Get attendance for a date range
const getDateRange = async () => {
  const result = await getCourseAttendance({
    courseId: 'course-123',
    startDate: '2025-06-01',
    endDate: '2025-06-30'
  });
  
  if (result.success) {
    console.log('Attendance records:', result.data?.records);
  }
};
```

### 3. Student Attendance Summary

```typescript
import { useNewAttendance } from '@/hooks/use-new-attendance';

const { getStudentSummary } = useNewAttendance();

const getStudentStats = async () => {
  const result = await getStudentSummary({
    studentId: 'student-123',
    startDate: '2025-06-01',
    endDate: '2025-06-30'
  });

  if (result.success) {
    console.log('Student attendance:', {
      totalClasses: result.data?.totalClasses,
      attendedClasses: result.data?.attendedClasses,
      attendancePercentage: result.data?.attendancePercentage
    });
  }
};
```

### 4. Using the Pre-built Component

```tsx
import { NewAttendanceManager } from '@/components/attendance/NewAttendanceManager';

function AttendancePage() {
  const students = [
    { id: 'student-1', name: 'John Doe', email: 'john@example.com' },
    { id: 'student-2', name: 'Jane Smith', email: 'jane@example.com' },
    // ... more students
  ];

  return (
    <div>
      <NewAttendanceManager
        courseId="course-123"
        courseName="Web Development"
        teacherId="teacher-123"
        students={students}
      />
    </div>
  );
}
```

### 5. Getting Student Attendance from Student Document

```typescript
import { useNewAttendance } from '@/hooks/use-new-attendance';

const { getStudentFromDocument } = useNewAttendance();

// Get all attendance data for a student
const getAllStudentAttendance = async () => {
  const result = await getStudentFromDocument({
    studentId: 'student-123'
  });

  if (result.success) {
    console.log('Student attendance by course:', result.data.attendanceByCourse);
  }
};

// Get attendance for a specific course
const getCourseSpecificAttendance = async () => {
  const result = await getStudentFromDocument({
    studentId: 'student-123',
    courseId: 'course-123'
  });

  if (result.success) {
    console.log('Course attendance:', {
      datesPresent: result.data.datesPresent,
      summary: result.data.summary
    });
  }
};
```

### 6. Using the Student Attendance View Component

```tsx
import { StudentAttendanceView } from '@/components/attendance/StudentAttendanceView';

function StudentProfilePage() {
  return (
    <div>
      <StudentAttendanceView
        studentId="student-123"
        studentName="John Doe"
      />
    </div>
  );
}
```

## API Endpoints

### POST /api/attendance/new-mark
Mark attendance for a course on a specific date.

**Request Body:**
```json
{
  "courseId": "course-123",
  "date": "2025-06-24",
  "presentStudents": ["student-1", "student-2"],
  "teacherId": "teacher-123"
}
```

### GET /api/attendance/new-mark
Get attendance data for a course.

**Query Parameters:**
- `courseId` (required): Course ID
- `date` (optional): Specific date (YYYY-MM-DD)
- `startDate` (optional): Start date for range query
- `endDate` (optional): End date for range query

### PUT /api/attendance/new-mark
Update existing attendance record.

**Request Body:** Same as POST

### GET /api/attendance/student-summary
Get attendance summary for a student.

**Query Parameters:**
- `studentId` (required): Student ID
- `startDate` (optional): Start date for range query
- `endDate` (optional): End date for range query

### GET /api/attendance/student-document
Get attendance data directly from student document.

**Query Parameters:**
- `studentId` (required): Student ID
- `courseId` (optional): Specific course ID

**Response for all courses:**
```json
{
  "success": true,
  "data": {
    "studentId": "student-123",
    "attendanceByCourse": {
      "course-123": {
        "datesPresent": ["2025-06-21", "2025-06-22"],
        "summary": {
          "totalClasses": 12,
          "attended": 10,
          "percentage": 83.33
        }
      }
    },
    "lastUpdated": "2025-06-24T10:00:00Z"
  }
}
```

**Response for specific course:**
```json
{
  "success": true,
  "data": {
    "studentId": "student-123",
    "courseId": "course-123",
    "datesPresent": ["2025-06-21", "2025-06-22"],
    "summary": {
      "totalClasses": 12,
      "attended": 10,
      "percentage": 83.33
    }
  }
}
```

## Service Methods

The `NewAttendanceService` provides the following methods:

1. `markAttendance(request)` - Mark new attendance
2. `getAttendanceByDate(courseId, date)` - Get attendance for specific date
3. `getCourseAttendance(request)` - Get course attendance with optional date range
4. `getStudentAttendanceSummary(studentId, dateRange?)` - Get student attendance summary
5. `getAttendanceStats(courseId, date)` - Get attendance statistics
6. `updateAttendance(courseId, date, presentStudents, teacherId)` - Update attendance

## Integration with Existing System

To integrate this with your existing admin attendance page:

1. Import the service: `import NewAttendanceService from '@/lib/new-attendance-service'`
2. Replace existing attendance marking logic with the new service methods
3. Update the UI to use the new data structure
4. Test with both new and existing data to ensure compatibility

## Migration Notes

- The new system uses a different data structure than the existing attendance system
- You may need to migrate existing data or maintain both systems during transition
- The new system is designed to be more scalable and efficient for large datasets
- All dates are stored in YYYY-MM-DD format for consistency

## Error Handling

The system includes comprehensive error handling:
- Input validation for all API endpoints
- Proper HTTP status codes
- Detailed error messages
- Graceful degradation when data is missing

## Student Collection Structure

The system also maintains attendance records in the student collection for efficient querying:

```
students (collection)
  └── [studentId] (document)
        └── attendanceByCourse: {
              [courseId]: {
                datesPresent: ["2025-06-21", "2025-06-22"],
                summary: {
                  totalClasses: 12,
                  attended: 10,
                  percentage: 83.33
                }
              }
            }
```

This dual storage approach provides:
- **Fast course-based queries** from the attendance collection
- **Fast student-based queries** from the student collection
- **Automatic synchronization** between both collections
- **Comprehensive reporting** capabilities

## Important Notes

#### Admin Document ID Resolution

The attendance system correctly uses the Firestore admin document ID for the `createdBy` field. The system works as follows:

1. **Admin Session Priority**: Admin session data (from `lib/session-storage.ts`) is used as the primary source:
   ```typescript
   const adminSession = getAdminSession();
   const teacherId = adminSession?.id || userProfile?.firestoreId || user?.uid || 'admin';
   const teacherName = adminSession?.role || userProfile?.role || 'admin';
   ```

2. **Auth Context Fallback**: If admin session is not available, the auth context searches for admin documents by email:
   ```typescript
   // Fallback: query(collection(db, "admin"), where("username", "==", user.email))
   ```

3. **Attendance Marking Priority Order**:
   - Primary: `getAdminSession()?.id` (Firestore admin document ID)
   - Fallback 1: `userProfile?.firestoreId` (from auth context search)
   - Fallback 2: `user?.uid` (Firebase Auth UID)
   - Final: `'admin'` (static fallback)

This ensures that `createdBy` in attendance records always uses the correct Firestore admin document ID, enabling proper relationships and data integrity.
