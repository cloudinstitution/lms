import { NextRequest, NextResponse } from 'next/server';
import { getStudentAttendanceRecords, getStudentAttendanceWithCourses } from '@/lib/attendance-query-service';
import { fetchStudentById } from '@/lib/student-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    
    // Validate student exists
    const student = await fetchStudentById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const courseId = searchParams.get('courseId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const includeCoursesDetail = searchParams.get('includeCoursesDetail') === 'true';

    console.log('Fetching attendance records for student:', studentId, {
      startDate,
      endDate,
      courseId,
      status,
      page,
      limit,
      includeCoursesDetail
    });

    if (includeCoursesDetail) {
      // Return comprehensive data with course details for UI presentation
      const comprehensiveData = await getStudentAttendanceWithCourses(
        studentId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          courseId,
          status,
          page,
          limit
        }
      );
      
      console.log(`Returning comprehensive data with ${comprehensiveData.coursesDetail?.length || 0} courses`);
      return NextResponse.json(comprehensiveData);
    } else {
      // Return just attendance records
      const attendanceRecords = await getStudentAttendanceRecords(
        studentId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          courseId,
          status,
          page,
          limit
        }
      );
      
      // Log the response data for debugging
      console.log(`Found ${attendanceRecords.totalRecords} records, page ${attendanceRecords.currentPage} of ${attendanceRecords.totalPages}`);
      return NextResponse.json(attendanceRecords);
    }
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student attendance records' },
      { status: 500 }
    );
  }
}
