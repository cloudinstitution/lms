import { NextRequest, NextResponse } from 'next/server';
import { getStudentAttendanceSummary } from '@/lib/attendance-service';

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

    const attendanceSummary = await getStudentAttendanceSummary(
      studentId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        courseId
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
