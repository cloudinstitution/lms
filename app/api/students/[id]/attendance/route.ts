import { NextRequest, NextResponse } from 'next/server';
import { getStudentAttendanceRecords } from '@/lib/attendance-service';

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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student attendance records' },
      { status: 500 }
    );
  }
}
