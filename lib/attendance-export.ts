import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface AttendanceRecord {
  id?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'holiday';
  course?: string;
  courseId?: string;
  timeIn?: string;
  timeOut?: string;
  hoursSpent?: number;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

/**
 * Export attendance records to CSV file
 */
export const exportAttendanceToCSV = (records: AttendanceRecord[], student: Student) => {
  const csvData = [
    ['Date', 'Course', 'Status', 'Time In', 'Time Out', 'Hours Spent'],
    ...records.map(record => [
      formatDate(record.date),
      record.course || 'N/A',
      capitalizeFirstLetter(record.status),
      record.timeIn || 'N/A',
      record.timeOut || 'N/A',
      record.hoursSpent?.toString() || 'N/A'
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
  const excelData = records.map(record => ({
    Date: formatDate(record.date),
    Course: record.course || 'N/A',
    Status: capitalizeFirstLetter(record.status),
    'Time In': record.timeIn || 'N/A',
    'Time Out': record.timeOut || 'N/A',
    'Hours Spent': record.hoursSpent || 'N/A'
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  const filename = `${student.name.replace(/\s+/g, '_')}_attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

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