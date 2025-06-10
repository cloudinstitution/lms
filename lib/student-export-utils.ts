import { Student } from "@/types/student"

/**
 * Convert student data to CSV format
 * @param students Array of student objects to convert
 * @returns CSV string with headers
 */
export function convertStudentsToCSV(students: Student[]): string {
  // Define CSV headers
  const headers = [
    'Student ID',
    'Name',
    'Email',
    'Phone Number',
    'Courses Enrolled',
    'Course Names',
    'Course IDs',
    'Joined Date',
    'Status'
  ]

  // Convert each student to CSV row
  const rows = students.map(student => [
    student.studentId,
    student.name,
    student.username,
    student.phoneNumber,
    student.coursesEnrolled.toString(),
    (student.courseName || []).join('; '),
    (student.courseID || []).join('; '),
    student.joinedDate,
    student.status || 'Active'
  ])

  // Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * Download data as a CSV file
 * @param data CSV string data
 * @param filename Name of the file to download
 */
export function downloadCSV(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
