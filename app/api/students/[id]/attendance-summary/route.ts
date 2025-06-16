
import { NextRequest, NextResponse } from 'next/server';
import { getStudentAttendanceSummary } from '@/lib/attendance-query-service';
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

    console.log('Fetching attendance summary for student:', studentId, {
      startDate,
      endDate,
      courseId,
      status
    });

    const attendanceSummary = await getStudentAttendanceSummary(
      studentId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        courseId,
        status
      }
    );

    return NextResponse.json(attendanceSummary);
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student attendance summary' },
      { status: 500 }
    );
  }
}
