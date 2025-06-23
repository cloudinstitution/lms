import { CourseSchedule, HolidayEvent, ScheduleException } from '@/types/schedule';
import { addDoc, collection, deleteDoc, doc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

// Collections
const SCHEDULES_COLLECTION = 'schedules';
const HOLIDAYS_COLLECTION = 'holidays';
const EXCEPTIONS_COLLECTION = 'schedule_exceptions';

// Course Schedule Operations
export const getCourseSchedules = async (): Promise<CourseSchedule[]> => {
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  const snapshot = await getDocs(schedulesRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CourseSchedule[];
};

export const createCourseSchedule = async (schedule: Omit<CourseSchedule, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), {
    ...schedule,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateCourseSchedule = async (id: string, schedule: Partial<CourseSchedule>): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, id);
  await updateDoc(scheduleRef, {
    ...schedule,
    updatedAt: Timestamp.now()
  });
};

export const deleteCourseSchedule = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, SCHEDULES_COLLECTION, id));
};

// Schedule Exceptions
export const addScheduleException = async (
  scheduleId: string,
  exception: ScheduleException
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const schedule = (await getDocs(query(collection(db, SCHEDULES_COLLECTION), where('id', '==', scheduleId)))).docs[0];
  
  if (!schedule) throw new Error('Schedule not found');
  
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
  const docRef = await addDoc(collection(db, HOLIDAYS_COLLECTION), {
    ...event,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateHolidayEvent = async (id: string, event: Partial<HolidayEvent>): Promise<void> => {
  const eventRef = doc(db, HOLIDAYS_COLLECTION, id);
  await updateDoc(eventRef, {
    ...event,
    updatedAt: Timestamp.now()
  });
};

export const deleteHolidayEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, HOLIDAYS_COLLECTION, id));
};

// Combined Calendar View Operations
export const getAllScheduleEvents = async (): Promise<(CourseSchedule | HolidayEvent)[]> => {
  const [schedules, holidays] = await Promise.all([
    getCourseSchedules(),
    getHolidaysAndEvents()
  ]);
  return [...schedules, ...holidays];
};
