import { Student, SortField, SortOrder, FilterOptions } from "@/types/student"
import { format } from "date-fns"

export function formatDate(dateString: string) {
  if (!dateString) return "N/A"

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch (error) {
    return dateString
  }
}

export function formatCalendarDate(date: Date | null) {
  if (!date) return null
  return format(date, "PP")
}

export function sortStudents(students: Student[], field: SortField | null, direction: SortOrder) {
  if (!field) return students
  
  return [...students].sort((a, b) => {
    if (field === "coursesEnrolled") {
      return direction === 'asc' 
        ? (a.coursesEnrolled || 0) - (b.coursesEnrolled || 0)
        : (b.coursesEnrolled || 0) - (a.coursesEnrolled || 0)
    }
    
    if (field === "joinedDate") {
      const aDate = new Date(a.joinedDate || "").getTime()
      const bDate = new Date(b.joinedDate || "").getTime()
      return direction === 'asc' ? aDate - bDate : bDate - aDate
    }
    
    const aStr = String(a[field] || "")
    const bStr = String(b[field] || "")
    return direction === 'asc' 
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr)
  })
}

export function filterStudents(students: Student[], searchQuery: string, filterOptions: FilterOptions) {
  return students.filter((student) => {
    const searchLower = searchQuery.toLowerCase()
    
    // Search query filter
    const matchesSearch =
      (student.name || "").toLowerCase().includes(searchLower) ||
      (student.username || "").toLowerCase().includes(searchLower) ||
      (student.phoneNumber || "").includes(searchLower) ||
      (student.studentId || "").includes(searchLower)

    // Status filter
    const matchesStatus =
      filterOptions.status.length === 0 ||
      (student.status && filterOptions.status.includes(student.status))    // Date range filter
    const joinDate = new Date(student.joinedDate)
    const matchesDateRange =
      (!filterOptions.dateRange.from || joinDate >= filterOptions.dateRange.from) &&
      (!filterOptions.dateRange.to || joinDate <= filterOptions.dateRange.to)
      
    // Courses enrolled filter
    const matchesCoursesCount = filterOptions.coursesEnrolled === undefined ||
      student.coursesEnrolled === filterOptions.coursesEnrolled

    // Course name filter
    const matchesCourseName = !filterOptions.courseName ||
      student.courseName.some(name => name.toLowerCase().includes(filterOptions.courseName!.toLowerCase()))

    // Course ID filter
    const matchesCourseID = filterOptions.courseID === undefined ||
      student.courseID.includes(filterOptions.courseID)    
      return matchesSearch && matchesStatus && matchesDateRange && 
           matchesCoursesCount && matchesCourseName && matchesCourseID
  })
}
