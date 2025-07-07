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
    courseStartDate?: Date;
    courseEndDate?: Date;
    courseDuration?: string;
    courseDates?: {
      start: string;
      end: string;
    };
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
    totalClasses?: number;
    startDate?: Date;
    endDate?: Date;
    duration?: string;
    category?: string;
    description?: string;
    price?: string;
    status?: string;
  }[];
  records?: AttendanceRecord[]; // Optional records for detailed processing
}
