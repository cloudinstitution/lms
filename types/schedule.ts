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
  // Enhanced fields for specific dates
  specificDate?: string; // ISO date string for one-time events
  startDate?: string; // Start date for recurring schedules
  endDate?: string; // End date for recurring schedules
  title?: string; // Title for calendar display
  // Role-based access control fields
  createdBy?: string; // User ID of the creator
  createdByRole?: string; // Role of the creator (admin/teacher)
  isGlobal?: boolean; // Whether this is a global schedule (admin-created)
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
  // Enhanced fields for calendar
  allDay?: boolean;
  location?: string;
}

// Calendar event interface for unified display
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: CourseSchedule | HolidayEvent;
  color?: string;
  type: 'schedule' | 'holiday' | 'event';
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
