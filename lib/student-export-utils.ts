import { Student } from "@/types/student"
import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx'
import { toast } from "sonner"

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
  
  // Show success toast
  toast.success("Download started", {
    id: "csv-download",
    description: `Students data has been downloaded as CSV`
  })
}

/**
 * Format student data for Excel export
 * @param students Array of student objects to format
 * @returns Array of formatted student objects for Excel
 */
export function formatStudentsForExcel(students: Student[]): Record<string, any>[] {
  return students.map(student => ({
    'Student ID': student.studentId,
    'Name': student.name,
    'Email': student.username,
    'Phone Number': student.phoneNumber || 'N/A',
    'Courses Enrolled': student.coursesEnrolled,
    'Course Names': (student.courseName || []).join('; '),
    'Course IDs': (student.courseID || []).join('; '),    
    'Primary Course': student.courseName && student.courseName.length > 0 
      ? student.courseName[0] 
      : 'N/A',
    'Joined Date': student.joinedDate,
    'Status': student.status || 'Active'
  }))
}

/**
 * Export students data to Excel file
 * @param students Array of student objects to export
 * @param filename Name of the file to download
 */
export function exportStudentsToExcel(students: Student[], filename: string): void {
  // Format data for Excel
  const data = formatStudentsForExcel(students)
  
  // Create worksheet and workbook
  const ws = xlsxUtils.json_to_sheet(data)
  const wb = xlsxUtils.book_new()
  
  // Add metadata
  wb.Props = {
    Title: "Students Data Export",
    Subject: "LMS Portal Students",
    Author: "LMS Portal",
    CreatedDate: new Date()
  }
    // Set column widths for better readability
  const columnWidths = [
    { wch: 15 },  // Student ID
    { wch: 25 },  // Name
    { wch: 30 },  // Email
    { wch: 15 },  // Phone Number
    { wch: 15 },  // Courses Enrolled
    { wch: 40 },  // Course Names
    { wch: 15 },  // Course IDs
    { wch: 25 },  // Primary Course
    { wch: 15 },  // Joined Date
    { wch: 10 }   // Status
  ]
  ws['!cols'] = columnWidths
  
  // Add worksheet to workbook
  xlsxUtils.book_append_sheet(wb, ws, 'Students')
  
  // Generate buffer and create blob
  const buffer = xlsxWrite(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  // Create download link
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
  
  // Show success toast
  toast.success("Download started", {
    id: "xlsx-download",
    description: `Students data has been downloaded as Excel file`
  })
}
