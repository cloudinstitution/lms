import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { AttendanceRecord } from './attendance-service';
import { Student } from '@/types/student';

/**
 * Export attendance records to CSV file
 */
export const exportAttendanceToCSV = (records: AttendanceRecord[], student: Student) => {  const csvData = [
    ['Date', 'Day', 'Course', 'Status', 'Time In', 'Time Out', 'Hours Spent', 'Notes'],
    ...records.map(record => [
      formatDate(record.date),
      new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
      record.courseName || 'N/A',
      capitalizeFirstLetter(record.status),
      record.timeIn || 'N/A',
      record.timeOut || 'N/A',
      record.hoursSpent?.toString() || 'N/A',
      record.notes || ''
    ])
  ];
  
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const filename = `${student.name.replace(/\s+/g, '_')}_attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  saveAs(blob, filename);
};

/**
 * Export attendance records to Excel file
 */
export const exportAttendanceToExcel = (records: AttendanceRecord[], student: Student) => {
  // Format data for export
  const excelData = records.map(record => ({
    Date: formatDate(record.date),
    Day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
    Course: record.courseName || 'N/A',
    Status: capitalizeFirstLetter(record.status),
    'Time In': record.timeIn || 'N/A',
    'Time Out': record.timeOut || 'N/A',
    'Hours Spent': record.hoursSpent || 'N/A',
    Notes: record.notes || ''
  }));
  
  // Create workbook and add metadata
  const workbook = createExcelWorkbook(excelData, student, { 
    startDate: records.length > 0 ? new Date(records[0].date) : new Date(), 
    endDate: records.length > 0 ? new Date(records[records.length - 1].date) : new Date()
  });
  
  // Generate filename
  const filename = `${student.name.replace(/\s+/g, '_')}_attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Create a properly formatted Excel workbook for attendance data
 */
export function createExcelWorkbook(data: any[], student: Student | null, dateRange?: { startDate?: Date, endDate?: Date }) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Create title for the report
  let title = "Student Attendance Report";
  let subject = "Attendance Records";
  
  if (student) {
    title += ` for ${student.name}`;
    subject += ` for ${student.name} (ID: ${student.studentId || student.id})`;
  }
  
  // Add date range information
  if (dateRange?.startDate && dateRange?.endDate) {
    const startDateStr = format(dateRange.startDate, 'dd/MM/yyyy');
    const endDateStr = format(dateRange.endDate, 'dd/MM/yyyy');
    subject += ` from ${startDateStr} to ${endDateStr}`;
  }
  
  // Add workbook properties
  workbook.Props = {
    Title: title,
    Subject: subject,
    Author: "LMS Portal",
    CreatedDate: new Date(),
    Manager: "Administration",
    Company: "LMS Portal"
  };
  
  // Add column widths for better readability
  const columnWidths = [
    { wch: 12 },  // Date
    { wch: 12 },  // Day
    { wch: 30 },  // Course
    { wch: 10 },  // Status
    { wch: 10 },  // Time In
    { wch: 10 },  // Time Out
    { wch: 10 },  // Hours Spent
    { wch: 30 },  // Notes
  ];
  
  worksheet['!cols'] = columnWidths;
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  return workbook;
}

/**
 * Export attendance summary to PDF
 * This is a placeholder - you'd need to implement PDF generation
 */
export const exportAttendanceToPDF = (records: AttendanceRecord[], student: Student, summary: any) => {
  // This would typically use a PDF library like pdfmake, jspdf, etc.
  console.log('PDF export not yet implemented');
};

// Helper function to format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
};

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};