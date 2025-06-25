import NewAttendanceService from "@/lib/new-attendance-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    let dateRange;
    if (startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    }

    const summary = await attendanceService.getStudentAttendanceSummary(
      studentId,
      dateRange
    );

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        ...summary,
        dateRange: dateRange || null
      }
    });

  } catch (error) {
    console.error("Error in student attendance summary API:", error);
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
