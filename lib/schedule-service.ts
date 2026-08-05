import { CourseSchedule, HolidayEvent, ScheduleException } from '@/types/schedule';
import { addDoc, collection, deleteDoc, doc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

// Collections
const SCHEDULES_COLLECTION = 'schedules';
const HOLIDAYS_COLLECTION = 'calendarEvents';
const EXCEPTIONS_COLLECTION = 'schedule_exceptions';

// Course Schedule Operations
export const getCourseSchedules = async (userRole?: string, userId?: string): Promise<CourseSchedule[]> => {
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  
  let q;
  if (userRole === 'teacher' && userId) {
    // Teachers only see their own schedules and global admin schedules
    q = query(schedulesRef, where('createdBy', 'in', [userId, 'admin']));
  } else {
    // Admins see all schedules
    q = schedulesRef;
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CourseSchedule[];
};

export const createCourseSchedule = async (
  schedule: Omit<CourseSchedule, 'id'>, 
  userRole?: string, 
  userId?: string
): Promise<string> => {
  // Clean the data to remove undefined/null values and handle schedule-specific fields
  const cleanedSchedule = Object.entries(schedule).reduce((acc, [key, value]) => {
    // Always exclude undefined and null
    if (value === undefined || value === null) {
      return acc;
    }
    
    // For recurring schedules, dayOfWeek is required; for one-time events, exclude it
    if (key === 'dayOfWeek') {
      if (schedule.isRecurring && value !== '') {
        acc[key] = value;
      }
      return acc;
    }
    
    // For one-time events, specificDate is required; for recurring, exclude it
    if (key === 'specificDate') {
      if (!schedule.isRecurring && value !== '') {
        acc[key] = value;
      }
      return acc;
    }
    
    // For recurring events, startDate and endDate define the recurrence period
    if (key === 'startDate' || key === 'endDate') {
      if (schedule.isRecurring && value !== '') {
        acc[key] = value;
      }
      return acc;
    }
    
    // For other fields, exclude empty strings
    if (value !== '') {
      acc[key] = value;
    }
    
    return acc;
  }, {} as any);

  const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), {
    ...cleanedSchedule,
    courseId: cleanedSchedule.courseId || `course_${Date.now()}`, // Generate courseId if not provided
    createdBy: userId || 'admin', // Track who created the schedule
    createdByRole: userRole || 'admin', // Track the role of the creator
    isGlobal: userRole === 'admin' || false, // Mark admin schedules as global
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateCourseSchedule = async (id: string, schedule: Partial<CourseSchedule>): Promise<void> => {
  // Clean the data to remove undefined/null values and handle schedule-specific fields
  const cleanedSchedule = Object.entries(schedule).reduce((acc, [key, value]) => {
    // Always exclude undefined and null
    if (value === undefined || value === null) {
      return acc;
    }
    
    // For recurring schedules, dayOfWeek is required; for one-time events, exclude it
    if (key === 'dayOfWeek') {
      if (schedule.isRecurring && value !== '') {
        acc[key] = value;
      }
      return acc;
    }
    
    // For one-time events, specificDate is required; for recurring, exclude it
    if (key === 'specificDate') {
      if (!schedule.isRecurring && value !== '') {
        acc[key] = value;
      }
      return acc;
    }
    
    // For recurring events, startDate and endDate define the recurrence period
    if (key === 'startDate' || key === 'endDate') {
      if (schedule.isRecurring && value !== '') {
        acc[key] = value;
      }
      return acc;
    }
    
    // For other fields, exclude empty strings
    if (value !== '') {
      acc[key] = value;
    }
    
    return acc;
  }, {} as any);

  const scheduleRef = doc(db, SCHEDULES_COLLECTION, id);
  await updateDoc(scheduleRef, {
    ...cleanedSchedule,
    updatedAt: Timestamp.now()
  });
};

export const deleteCourseSchedule = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, SCHEDULES_COLLECTION, id));
};

// Get schedules by course ID with role-based filtering
export const getCourseSchedulesByCourse = async (
  courseId: string, 
  userRole?: string, 
  userId?: string
): Promise<CourseSchedule[]> => {
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  
  let q;
  if (userRole === 'teacher' && userId) {
    // Teachers only see their own schedules and global admin schedules for this course
    q = query(
      schedulesRef, 
      where('courseId', '==', courseId),
      where('createdBy', 'in', [userId, 'admin'])
    );
  } else {
    // Admins see all schedules for this course
    q = query(schedulesRef, where('courseId', '==', courseId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CourseSchedule[];
};

// Schedule Exceptions
export const addScheduleException = async (
  scheduleId: string,
  exception: ScheduleException
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const scheduleDoc = await getDocs(query(collection(db, SCHEDULES_COLLECTION), where('id', '==', scheduleId)));
  
  if (scheduleDoc.empty) throw new Error('Schedule not found');
  
  const schedule = scheduleDoc.docs[0];
  const exceptions = schedule.data().exceptions || [];
  await updateDoc(scheduleRef, {
    exceptions: [...exceptions, exception]
  });
};

// Holiday & Event Operations
export const getHolidaysAndEvents = async (): Promise<HolidayEvent[]> => {
  const holidaysRef = collection(db, HOLIDAYS_COLLECTION);
  const snapshot = await getDocs(holidaysRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as HolidayEvent[];
};

export const createHolidayEvent = async (event: Omit<HolidayEvent, 'id'>): Promise<string> => {
  // Clean the data to remove undefined/null values and empty strings
  const cleanedEvent = Object.entries(event).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  const docRef = await addDoc(collection(db, HOLIDAYS_COLLECTION), {
    ...cleanedEvent,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateHolidayEvent = async (id: string, event: Partial<HolidayEvent>): Promise<void> => {
  // Clean the data to remove undefined/null values and empty strings
  const cleanedEvent = Object.entries(event).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  const eventRef = doc(db, HOLIDAYS_COLLECTION, id);
  await updateDoc(eventRef, {
    ...cleanedEvent,
    updatedAt: Timestamp.now()
  });
};

export const deleteHolidayEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, HOLIDAYS_COLLECTION, id));
};

// Get events by type
export const getEventsByType = async (type: string): Promise<HolidayEvent[]> => {
  const eventsRef = collection(db, HOLIDAYS_COLLECTION);
  const q = query(eventsRef, where('type', '==', type));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as HolidayEvent[];
};

// Get events by date range
export const getEventsByDateRange = async (startDate: string, endDate: string): Promise<HolidayEvent[]> => {
  const eventsRef = collection(db, HOLIDAYS_COLLECTION);
  const q = query(
    eventsRef, 
    where('startDate', '>=', startDate),
    where('startDate', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as HolidayEvent[];
};

// Combined Calendar View Operations
export const getAllScheduleEvents = async (userRole?: string, userId?: string): Promise<(CourseSchedule | HolidayEvent)[]> => {
  const [schedules, holidays] = await Promise.all([
    getCourseSchedules(userRole, userId),
    getHolidaysAndEvents()
  ]);
  return [...schedules, ...holidays];
};

// Get filtered events for calendar display
export const getFilteredCalendarEvents = async (
  filters?: {
    courseIds?: string[];
    eventTypes?: string[];
    startDate?: string;
    endDate?: string;
  },
  userRole?: string,
  userId?: string
): Promise<(CourseSchedule | HolidayEvent)[]> => {
  let schedules: CourseSchedule[] = [];
  let events: HolidayEvent[] = [];

  if (!filters?.courseIds || filters.courseIds.length === 0) {
    schedules = await getCourseSchedules(userRole, userId);
  } else {
    // Get schedules for specific courses
    const schedulePromises = filters.courseIds.map(courseId => 
      getCourseSchedulesByCourse(courseId, userRole, userId)
    );
    const courseSchedules = await Promise.all(schedulePromises);
    schedules = courseSchedules.flat();
  }

  if (!filters?.eventTypes || filters.eventTypes.length === 0) {
    events = await getHolidaysAndEvents();
  } else {
    // Get events for specific types
    const eventPromises = filters.eventTypes.map(type => getEventsByType(type));
    const typeEvents = await Promise.all(eventPromises);
    events = typeEvents.flat();
  }

  // Apply date filtering if provided
  if (filters?.startDate && filters?.endDate) {
    events = events.filter(event => 
      event.startDate >= filters.startDate! && event.startDate <= filters.endDate!
    );
    
    schedules = schedules.filter(schedule => {
      if (schedule.specificDate) {
        return schedule.specificDate >= filters.startDate! && schedule.specificDate <= filters.endDate!;
      }
      if (schedule.startDate && schedule.endDate) {
        return schedule.startDate <= filters.endDate! && schedule.endDate >= filters.startDate!;
      }
      return true; // Include schedules without specific dates
    });
  }

  return [...schedules, ...events];
};
