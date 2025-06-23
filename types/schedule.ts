export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type DeliveryMode = 'online' | 'offline';

export interface CourseSchedule {
  id: string;
  courseId: string;
  courseName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  mode: DeliveryMode;
  instructorId?: string;
  instructorName?: string;
  location?: string;
  isRecurring: boolean;
  exceptions?: ScheduleException[];
  color?: string;
}

export interface ScheduleException {
  date: string;
  reason: string;
  isCanceled: boolean;
  alternateTime?: {
    startTime: string;
    endTime: string;
  };
}

export type EventType = 'holiday' | 'exam' | 'event' | 'break';

export interface HolidayEvent {
  id: string;
  title: string;
  type: EventType;
  startDate: string;
  endDate: string;
  description?: string;
  color: string;
}

export interface ScheduleViewFilters {
  courses?: string[];
  eventTypes?: EventType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Color codes for different event types
export const EVENT_COLORS = {
  holiday: '#FF6B6B',  // Red
  exam: '#4ECDC4',     // Teal
  event: '#45B7D1',    // Blue
  break: '#96CEB4',    // Green
  default: '#6C5CE7'   // Purple
} as const;
