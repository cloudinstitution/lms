import NewAttendanceService, { MarkAttendanceRequest } from "@/lib/new-attendance-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, date, presentStudents, teacherId, teacherName } = body;

    // Validate required fields
    if (!courseId || !date || !Array.isArray(presentStudents) || !teacherId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: courseId, date, presentStudents, teacherId"
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          success: false,
          error: "Date must be in YYYY-MM-DD format"
        },
        { status: 400 }
      );
    }

    const attendanceService = NewAttendanceService.getInstance();
    
    const markRequest: MarkAttendanceRequest = {
      courseId,
      date,
      presentStudents,
      teacherId,
      teacherName
    };

    const result = await attendanceService.markAttendance(markRequest);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          courseId,
          date,
          presentCount: presentStudents.length,
          presentStudents
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in attendance marking API:", error);
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!courseId) {
      return NextResponse.json(
        {
          success: false,
          error: "courseId is required"
        },
        { status: 400 }
      );
    }

    const attendanceService = NewAttendanceService.getInstance();

    // If specific date is requested
    if (date) {
      const attendanceData = await attendanceService.getAttendanceByDate(courseId, date);
      const stats = await attendanceService.getAttendanceStats(courseId, date);

      return NextResponse.json({
        success: true,
        data: {
          attendance: attendanceData,
          stats
        }
      });
    }

    // If date range is requested
    if (startDate && endDate) {
      const attendanceRecords = await attendanceService.getCourseAttendance({
        courseId,
        dateRange: {
          start: startDate,
          end: endDate
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          records: attendanceRecords,
          count: attendanceRecords.length
        }
      });
    }

    // Get all attendance records for the course
    const attendanceRecords = await attendanceService.getCourseAttendance({
      courseId
    });

    return NextResponse.json({
      success: true,
      data: {
        records: attendanceRecords,
        count: attendanceRecords.length
      }
    });

  } catch (error) {
    console.error("Error in attendance retrieval API:", error);
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, date, presentStudents, teacherId, teacherName } = body;

    // Validate required fields
    if (!courseId || !date || !Array.isArray(presentStudents) || !teacherId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: courseId, date, presentStudents, teacherId"
        },
        { status: 400 }
      );
    }

    const attendanceService = NewAttendanceService.getInstance();
    const result = await attendanceService.updateAttendance(
      courseId,
      date,
      presentStudents,
      teacherId,
      teacherName
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          courseId,
          date,
          presentCount: presentStudents.length,
          presentStudents
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in attendance update API:", error);
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
