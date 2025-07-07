import { NextRequest, NextResponse } from 'next/server';
import { getStudentCoursesData, formatCourseForCard } from '@/lib/attendance-query-service';
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

    console.log('Fetching course details for student:', studentId);

    // Get student courses data
    const coursesData = await getStudentCoursesData(studentId);
    
    // Format courses for UI presentation
    const formattedCourses = coursesData.courses.map(course => formatCourseForCard(course));
    
    const response = {
      courses: formattedCourses,
      totalCourses: formattedCourses.length,
      activeCourses: formattedCourses.filter(course => course.isActive),
      completedCourses: formattedCourses.filter(course => !course.isActive),
      hasMultipleCourses: formattedCourses.length > 1,
      studentInfo: {
        id: student.id,
        name: student.name,
        studentId: student.studentId
      }
    };
    
    console.log(`Found ${formattedCourses.length} courses for student ${studentId}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching student courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student courses' },
      { status: 500 }
    );
  }
}
