import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { AttendanceRecord } from './attendance-service';
import { Student } from '@/types/student';

/**
 * Format attendance records for export to Excel/CSV
 */
export function formatAttendanceForExport(records: AttendanceRecord[]) {
  return records.map(record => ({
    Date: formatExportDate(record.date),
    Day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
    Status: capitalizeFirstLetter(record.status),
    Course: record.courseName || 'N/A',
    'Time In': record.timeIn || 'N/A',
    'Time Out': record.timeOut || 'N/A',
    'Hours Spent': record.hoursSpent || 'N/A',
    Notes: record.notes || ''
  }));
}

/**
 * Create an Excel workbook for attendance data
 */
export function createAttendanceWorkbook(exportData: any[], student: Student | null, filters?: any) {
  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  
  // Create title for the report
  let title = "Student Attendance Report";
  if (student) {
    title += ` for ${student.name}`;
  }
  
  // Add date range information if available
  if (filters?.startDate && filters?.endDate) {
    const startDateStr = formatExportDate(filters.startDate.toISOString());
    const endDateStr = formatExportDate(filters.endDate.toISOString());
    title += ` (${startDateStr} to ${endDateStr})`;
  }
  
  // Add status filter information if available
  if (filters?.status) {
    title += ` - ${capitalizeFirstLetter(filters.status)} Only`;
  }
  
  // Add workbook properties
  workbook.Props = {
    Title: title,
    Subject: "Attendance Records",
    Author: "LMS Portal",
    CreatedDate: new Date(),
    Manager: "Administration",
    Company: "LMS Portal"
  };
  
  // Add column widths for better readability
  const columnWidths = [
    { wch: 12 },  // Date
    { wch: 12 },  // Day
    { wch: 10 },  // Status
    { wch: 30 },  // Course
    { wch: 10 },  // Time In
    { wch: 10 },  // Time Out
    { wch: 12 },  // Hours Spent
    { wch: 30 },  // Notes
  ];
  
  worksheet['!cols'] = columnWidths;
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  return workbook;
}

/**
 * Generate appropriate filename for attendance export
 */
export function generateAttendanceFilename(student: Student | null, filters: any = {}, fileFormat: string = 'xlsx') {
  // Get date range string for filename
  const startDateStr = filters.startDate ? 
    filters.startDate.toISOString().split('T')[0] : 
    'all';
  
  const endDateStr = filters.endDate ? 
    filters.endDate.toISOString().split('T')[0] : 
    format(new Date(), 'yyyy-MM-dd');
  
  // Format student name for filename
  const studentName = student ? 
    student.name.replace(/\s+/g, '_') : 
    'student';
  
  // Add status part if status filter is active
  const statusPart = filters.status ? `_${filters.status}` : '';
  
  // Return complete filename with extension
  return `${studentName}_attendance${statusPart}_${startDateStr}_to_${endDateStr}.${fileFormat}`;
}

/**
 * Format date for display in exports
 */
export function formatExportDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
}

/**
 * Capitalize the first letter of a string
 */
export function capitalizeFirstLetter(string: string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}
