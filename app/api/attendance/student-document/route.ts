import NewAttendanceService from "@/lib/new-attendance-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "studentId is required"
        },
        { status: 400 }
      );
    }

    const attendanceService = NewAttendanceService.getInstance();

    // If courseId is provided, get attendance for that specific course
    if (courseId) {
      const result = await attendanceService.getStudentCourseAttendance(studentId, courseId);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          data: {
            studentId,
            courseId,
            ...result.data
          }
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to get student course attendance"
          },
          { status: 500 }
        );
      }
    }

    // Get all attendance data for the student
    const result = await attendanceService.getStudentAttendanceFromDocument(studentId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to get student attendance"
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in student attendance API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
