import { NextRequest, NextResponse } from 'next/server';
import { getStudentAttendanceRecords } from '@/lib/attendance-query-service';
import { fetchStudentById } from '@/lib/student-service';
import * as XLSX from 'xlsx';
import { 
  formatAttendanceForExport, 
  createAttendanceWorkbook, 
  generateAttendanceFilename 
} from '@/lib/attendance-excel-export';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const searchParams = request.nextUrl.searchParams;    
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const courseId = searchParams.get('courseId') || undefined;
    const status = searchParams.get('status') || undefined;
    const exportFormat = searchParams.get('format') || 'xlsx'; // xlsx or csv
    
    console.log('Export request received with params:', {
      studentId,
      startDate,
      endDate,
      courseId,
      status,
      exportFormat
    });
    
    // Get student info for better naming
    const student = await fetchStudentById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }
    
    // Prepare filter object for queries and filename generation
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      courseId,
      status,
      limit: 1000 // High limit to get all records
    };
    
    // Get all records without pagination
    const attendanceRecords = await getStudentAttendanceRecords(
      studentId,
      filters
    );
    
    if (attendanceRecords.records.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records found for the specified criteria' },
        { status: 404 }
      );
    }
    
    console.log(`Found ${attendanceRecords.records.length} records to export`);
    
    // Format data for export
    const exportData = formatAttendanceForExport(attendanceRecords.records);
    
    // Create workbook with appropriate metadata
    const workbook = createAttendanceWorkbook(exportData, student, filters);
    
    // Generate file content based on format
    let data, contentType;
    const filename = generateAttendanceFilename(student, filters, exportFormat);
    
    if (exportFormat === 'csv') {
      // Convert to CSV
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_csv(worksheet);
      contentType = 'text/csv';
    } else {
      // Default to xlsx
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      data = buffer;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    console.log(`Exporting ${exportFormat} file: ${filename}`);

    // Set response headers for file download
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(data, {
      headers,
    });
  } catch (error) {
    console.error('Error exporting student attendance:', error);
    return NextResponse.json(
      { error: 'Failed to export attendance records' },
      { status: 500 }
    );
  }
}
