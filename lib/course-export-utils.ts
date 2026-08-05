import { toast } from "sonner"
import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx'

interface Course {
  id: string
  title: string
  category: string
  price: string
  duration: string
  courseID?: number
  status: "Active" | "Draft" | "Archived"
  description?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Convert course data to CSV format
 * @param courses Array of course objects to convert
 * @returns CSV string with headers
 */
export function convertCoursesToCSV(courses: Course[]): string {
  // Define CSV headers
  const headers = [
    'Course ID',
    'Course Title',
    'Category',
    'Price',
    'Duration',
    'Status',
    'Description',
    'Created Date',
    'Last Updated'
  ]

  // Convert each course to CSV row
  const rows = courses.map(course => [
    course.courseID?.toString() || '',
    course.title,
    course.category,
    course.price,
    course.duration,
    course.status,
    course.description || 'No description',
    course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A',
    course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'N/A'
  ])

  // Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
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
    description: `Courses data has been downloaded as CSV`
  })
}

/**
 * Format course data for Excel export
 * @param courses Array of course objects to format
 * @returns Array of formatted course objects for Excel
 */
export function formatCoursesForExcel(courses: Course[]): Record<string, any>[] {
  return courses.map(course => ({
    'Course ID': course.courseID || 'N/A',
    'Course Title': course.title,
    'Category': course.category,
    'Price': course.price,
    'Duration': course.duration,
    'Status': course.status,
    'Description': course.description || 'No description provided',
    'Created Date': course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A',
    'Last Updated': course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'N/A',
    'Total Characters in Description': course.description ? course.description.length : 0
  }))
}

/**
 * Export courses data to Excel file
 * @param courses Array of course objects to export
 * @param filename Name of the file to download
 */
export function exportCoursesToExcel(courses: Course[], filename: string): void {
  // Format data for Excel
  const data = formatCoursesForExcel(courses)
  
  // Create worksheet and workbook
  const ws = xlsxUtils.json_to_sheet(data)
  const wb = xlsxUtils.book_new()
  
  // Add metadata
  wb.Props = {
    Title: "Courses Data Export",
    Subject: "LMS Portal Courses",
    Author: "LMS Portal",
    CreatedDate: new Date()
  }
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 12 },  // Course ID
    { wch: 30 },  // Course Title
    { wch: 20 },  // Category
    { wch: 12 },  // Price
    { wch: 15 },  // Duration
    { wch: 10 },  // Status
    { wch: 50 },  // Description
    { wch: 15 },  // Created Date
    { wch: 15 },  // Last Updated
    { wch: 20 }   // Total Characters in Description
  ]
  ws['!cols'] = columnWidths
  
  // Add worksheet to workbook
  xlsxUtils.book_append_sheet(wb, ws, 'Courses')
  
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
    description: `Courses data has been downloaded as Excel file`
  })
}
