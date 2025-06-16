import { AttendanceRecord } from './attendance-service';

export interface AttendanceSummaryResponse {
  overallSummary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    presentPercentage: number;
    totalHours: number;
    averageHoursPerDay: number;
  };
  monthlySummary: {
    month: string;
    presentDays: number;
    absentDays: number;
    presentPercentage: number;
  }[];
  courseBreakdown: {
    courseId: string;
    courseName: string;
    presentDays: number;
    absentDays: number;
    presentPercentage: number;
  }[];
  records?: AttendanceRecord[]; // Optional records for detailed processing
}
