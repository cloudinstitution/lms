import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    where,
    writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

export interface AttendanceDate {
    presentStudents: string[];
    createdBy: string; // ID of the person who marked attendance
    createdByName: string; // Role of the person who marked attendance (admin/teacher)
    timestamp: Timestamp;
    totalStudents?: number;
    courseId: string;
    date: string;
}

export interface CourseAttendance {
    courseId: string;
    courseName: string;
    dates: Record<string, AttendanceDate>;
}

export interface MarkAttendanceRequest {
    courseId: string;
    date: string; // Format: YYYY-MM-DD
    presentStudents: string[];
    teacherId: string;
    teacherName?: string; // Optional role of the teacher/admin (admin/teacher)
}

export interface GetAttendanceRequest {
    courseId: string;
    dateRange?: {
        start: string;
        end: string;
    };
}

export interface StudentAttendanceRecord {
    studentId: string;
    courseId: string;
    date: string;
    present: boolean;
    markedBy: string;
    timestamp: Timestamp;
}

// New interfaces for student attendance structure
export interface StudentCourseAttendance {
    [courseId: string]: {
        datesPresent: string[];
        summary: {
            totalClasses: number;
            attended: number;
            percentage: number;
        };
    };
}

export interface StudentAttendanceDocument {
    studentId: string;
    attendanceByCourse: StudentCourseAttendance;
    lastUpdated: Timestamp;
}

class NewAttendanceService {
    private static instance: NewAttendanceService;

    private constructor() { }

    public static getInstance(): NewAttendanceService {
        if (!NewAttendanceService.instance) {
            NewAttendanceService.instance = new NewAttendanceService();
        }
        return NewAttendanceService.instance;
    }

    /**
     * Mark attendance for a course on a specific date
     */
    async markAttendance(request: MarkAttendanceRequest): Promise<{
        success: boolean;
        message: string;
        error?: string;
    }> {
        try {
            const { courseId, date, presentStudents, teacherId, teacherName } = request;

            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error("Date must be in YYYY-MM-DD format");
            }

            // Reference to the attendance document
            const attendanceDocRef = doc(db, "attendance", courseId);
            const dateDocRef = doc(db, "attendance", courseId, "dates", date);

            // Create the date document with attendance data
            const attendanceData: AttendanceDate = {
                presentStudents,
                createdBy: teacherId,
                createdByName: teacherName || "admin",
                timestamp: serverTimestamp() as Timestamp,
                totalStudents: presentStudents.length,
                courseId,
                date
            };

            console.log('NewAttendanceService.markAttendance - storing:', {
                courseId,
                date,
                teacherId,
                teacherName,
                attendanceData
            });

            // Use batch to ensure atomicity
            const batch = writeBatch(db);

            // Set the course document (this will create it if it doesn't exist)
            batch.set(attendanceDocRef, {
                courseId,
                lastUpdated: serverTimestamp(),
                updatedBy: teacherId
            }, { merge: true });

            // Set the date-specific attendance
            batch.set(dateDocRef, attendanceData);

            // Update each student's attendance record
            await this.updateStudentAttendanceRecords(courseId, date, presentStudents, batch);

            await batch.commit();

            return {
                success: true,
                message: `Attendance marked successfully for ${presentStudents.length} students on ${date}`
            };

        } catch (error) {
            console.error("Error marking attendance:", error);
            return {
                success: false,
                message: "Failed to mark attendance",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }

    /**
     * Get attendance for a course on a specific date
     */
    async getAttendanceByDate(courseId: string, date: string): Promise<AttendanceDate | null> {
        try {
            const dateDocRef = doc(db, "attendance", courseId, "dates", date);
            const dateDoc = await getDoc(dateDocRef);

            if (dateDoc.exists()) {
                return dateDoc.data() as AttendanceDate;
            }

            return null;
        } catch (error) {
            console.error("Error getting attendance by date:", error);
            return null;
        }
    }

    /**
     * Get all attendance records for a course within a date range
     */
    async getCourseAttendance(request: GetAttendanceRequest): Promise<AttendanceDate[]> {
        try {
            const { courseId, dateRange } = request;

            const datesCollectionRef = collection(db, "attendance", courseId, "dates");

            let attendanceQuery = query(datesCollectionRef, orderBy("date", "desc"));

            if (dateRange) {
                attendanceQuery = query(
                    datesCollectionRef,
                    where("date", ">=", dateRange.start),
                    where("date", "<=", dateRange.end),
                    orderBy("date", "desc")
                );
            }

            const querySnapshot = await getDocs(attendanceQuery);
            const attendanceRecords: AttendanceDate[] = [];

            querySnapshot.forEach((doc) => {
                attendanceRecords.push({
                    ...doc.data(),
                    date: doc.id // The document ID is the date
                } as AttendanceDate);
            });

            return attendanceRecords;
        } catch (error) {
            console.error("Error getting course attendance:", error);
            return [];
        }
    }

    /**
     * Get attendance summary for a student across all courses
     */
    async getStudentAttendanceSummary(studentId: string, dateRange?: {
        start: string;
        end: string;
    }): Promise<{
        totalClasses: number;
        attendedClasses: number;
        attendancePercentage: number;
        records: StudentAttendanceRecord[];
    }> {
        try {
            // Get all attendance documents
            const attendanceCollectionRef = collection(db, "attendance");
            const coursesSnapshot = await getDocs(attendanceCollectionRef);

            const records: StudentAttendanceRecord[] = [];

            for (const courseDoc of coursesSnapshot.docs) {
                const courseId = courseDoc.id;
                const datesCollectionRef = collection(db, "attendance", courseId, "dates");

                let datesQuery = query(datesCollectionRef, orderBy("date", "desc"));

                if (dateRange) {
                    datesQuery = query(
                        datesCollectionRef,
                        where("date", ">=", dateRange.start),
                        where("date", "<=", dateRange.end),
                        orderBy("date", "desc")
                    );
                }

                const datesSnapshot = await getDocs(datesQuery);

                datesSnapshot.forEach((dateDoc) => {
                    const dateData = dateDoc.data() as AttendanceDate;
                    const isPresent = dateData.presentStudents.includes(studentId);

                    records.push({
                        studentId,
                        courseId,
                        date: dateDoc.id,
                        present: isPresent,
                        markedBy: dateData.createdBy,
                        timestamp: dateData.timestamp
                    });
                });
            }

            const totalClasses = records.length;
            const attendedClasses = records.filter(record => record.present).length;
            const attendancePercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

            return {
                totalClasses,
                attendedClasses,
                attendancePercentage: Math.round(attendancePercentage * 100) / 100,
                records
            };

        } catch (error) {
            console.error("Error getting student attendance summary:", error);
            return {
                totalClasses: 0,
                attendedClasses: 0,
                attendancePercentage: 0,
                records: []
            };
        }
    }

    /**
     * Get attendance statistics for a course on a specific date
     */
    async getAttendanceStats(courseId: string, date: string): Promise<{
        totalStudents: number;
        presentStudents: number;
        absentStudents: number;
        attendancePercentage: number;
        presentStudentIds: string[];
    } | null> {
        try {
            const attendanceData = await this.getAttendanceByDate(courseId, date);

            if (!attendanceData) {
                return null;
            }

            // You might want to get total enrolled students from courses collection
            const presentStudents = attendanceData.presentStudents.length;
            const totalStudents = attendanceData.totalStudents || presentStudents;
            const absentStudents = totalStudents - presentStudents;
            const attendancePercentage = totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0;

            return {
                totalStudents,
                presentStudents,
                absentStudents,
                attendancePercentage: Math.round(attendancePercentage * 100) / 100,
                presentStudentIds: attendanceData.presentStudents
            };

        } catch (error) {
            console.error("Error getting attendance stats:", error);
            return null;
        }
    }

    /**
     * Update attendance for a specific date (add/remove students)
     */
    async updateAttendance(
        courseId: string,
        date: string,
        presentStudents: string[],
        teacherId: string,
        teacherName?: string
    ): Promise<{ success: boolean; message: string; error?: string }> {
        try {
            const dateDocRef = doc(db, "attendance", courseId, "dates", date);

            const updateData: Partial<AttendanceDate> = {
                presentStudents,
                createdBy: teacherId,
                createdByName: teacherName || "admin",
                timestamp: serverTimestamp() as Timestamp,
                totalStudents: presentStudents.length,
            };

            // Use batch to ensure atomicity
            const batch = writeBatch(db);

            // Update the attendance document
            batch.set(dateDocRef, updateData, { merge: true });

            // Update student attendance records
            await this.updateStudentAttendanceRecords(courseId, date, presentStudents, batch);

            await batch.commit();

            return {
                success: true,
                message: `Attendance updated successfully for ${presentStudents.length} students on ${date}`
            };

        } catch (error) {
            console.error("Error updating attendance:", error);
            return {
                success: false,
                message: "Failed to update attendance",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }

    /**
     * Update student attendance records in the students collection
     */
    private async updateStudentAttendanceRecords(
        courseId: string,
        date: string,
        presentStudents: string[],
        batch: any
    ): Promise<void> {
        try {
            // Get only students who are enrolled in this specific course
            const studentsCollectionRef = collection(db, "students");
            const studentsSnapshot = await getDocs(studentsCollectionRef);

            for (const studentDoc of studentsSnapshot.docs) {
                const studentId = studentDoc.id;
                const currentStudentData = studentDoc.data();
                
                // Check if student is enrolled in this course
                const courseIDs = Array.isArray(currentStudentData.courseID) 
                    ? currentStudentData.courseID 
                    : [currentStudentData.courseID];
                
                // Convert courseId to number for comparison (course IDs are stored as numbers)
                const courseIdNum = parseInt(courseId);
                const isEnrolledInCourse = courseIDs.some((id: any) => {
                    const idNum = typeof id === 'string' ? parseInt(id) : id;
                    return idNum === courseIdNum;
                });

                // Only update students who are actually enrolled in this course
                if (!isEnrolledInCourse) {
                    continue;
                }

                const studentDocRef = doc(db, "students", studentId);
                const currentAttendanceByCourse = currentStudentData.attendanceByCourse || {};
                const currentCourseAttendance = currentAttendanceByCourse[courseId] || {
                    datesPresent: [],
                    summary: { totalClasses: 0, attended: 0, percentage: 0 }
                };

                // Check if student was present
                const wasPresent = presentStudents.includes(studentId);

                // Update datesPresent array
                let updatedDatesPresent = [...currentCourseAttendance.datesPresent];

                if (wasPresent && !updatedDatesPresent.includes(date)) {
                    updatedDatesPresent.push(date);
                    updatedDatesPresent.sort(); // Keep dates sorted
                } else if (!wasPresent && updatedDatesPresent.includes(date)) {
                    updatedDatesPresent = updatedDatesPresent.filter(d => d !== date);
                }

                // Calculate updated summary
                const totalClasses = await this.getTotalClassesForStudentInCourse(studentId, courseId);
                const attended = updatedDatesPresent.length;
                const percentage = totalClasses > 0 ? Math.round((attended / totalClasses) * 10000) / 100 : 0;

                // Update the student document
                const updatedAttendanceByCourse = {
                    ...currentAttendanceByCourse,
                    [courseId]: {
                        datesPresent: updatedDatesPresent,
                        summary: {
                            totalClasses,
                            attended,
                            percentage
                        }
                    }
                };

                // Prepare the update data - only include needed fields and exclude attendanceDates
                const updateData = {
                    ...currentStudentData,
                    attendanceByCourse: updatedAttendanceByCourse,
                    lastUpdated: serverTimestamp()
                };

                // Remove attendanceDates field if it exists (we use attendanceByCourse now)
                if ('attendanceDates' in updateData) {
                    delete updateData.attendanceDates;
                }

                batch.set(studentDocRef, updateData, { merge: true });
            }
        } catch (error) {
            console.error("Error updating student attendance records:", error);
            throw error;
        }
    }

    /**
     * Get total classes for a student in a specific course
     * Calculates based on course creation date to current date, counting weekdays only
     */
    private async getTotalClassesForStudentInCourse(studentId: string, courseId: string): Promise<number> {
        try {
            // Query courses collection to find the course with matching courseID
            const coursesCollectionRef = collection(db, "courses");
            const coursesQuery = query(coursesCollectionRef, where("courseID", "==", parseInt(courseId)));
            const coursesSnapshot = await getDocs(coursesQuery);
            
            if (coursesSnapshot.empty) {
                console.warn(`Course with courseID ${courseId} not found`);
                // Fallback to counting attendance records
                const datesCollectionRef = collection(db, "attendance", courseId, "dates");
                const datesSnapshot = await getDocs(datesCollectionRef);
                return datesSnapshot.size;
            }
            
            const courseDoc = coursesSnapshot.docs[0];
            const courseData = courseDoc.data();
            const courseCreatedAt = courseData.createdAt;
            
            if (!courseCreatedAt) {
                console.warn(`Course ${courseId} has no createdAt date`);
                // Fallback to counting attendance records
                const datesCollectionRef = collection(db, "attendance", courseId, "dates");
                const datesSnapshot = await getDocs(datesCollectionRef);
                return datesSnapshot.size;
            }
            
            // Parse the course creation date (stored as ISO string)
            const startDate = new Date(courseCreatedAt);
            const currentDate = new Date();
            
            // Calculate total weekdays from course start to current date
            const totalWeekdays = this.calculateWeekdaysBetweenDates(startDate, currentDate);
            
            console.log(`Course ${courseId} created on ${startDate.toISOString()}, total weekdays to today: ${totalWeekdays}`);
            
            return totalWeekdays;
            
        } catch (error) {
            console.error("Error getting total classes:", error);
            // Fallback to counting attendance records
            try {
                const datesCollectionRef = collection(db, "attendance", courseId, "dates");
                const datesSnapshot = await getDocs(datesCollectionRef);
                return datesSnapshot.size;
            } catch (fallbackError) {
                console.error("Error in fallback counting:", fallbackError);
                return 0;
            }
        }
    }

    /**
     * Calculate the number of weekdays (Monday-Friday) between two dates
     */
    private calculateWeekdaysBetweenDates(startDate: Date, endDate: Date): number {
        let count = 0;
        const current = new Date(startDate);
        
        // Ensure we don't go beyond the current date
        const end = new Date(Math.min(endDate.getTime(), new Date().getTime()));
        
        while (current <= end) {
            const dayOfWeek = current.getDay();
            // Count weekdays (Monday = 1, Friday = 5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        
        return count;
    }

    /**
     * Get current date in YYYY-MM-DD format
     */
    static getCurrentDate(): string {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    /**
     * Format date from Date object to YYYY-MM-DD string
     */
    static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Get student attendance data from student document
     */
    async getStudentAttendanceFromDocument(studentId: string): Promise<{
        success: boolean;
        data?: StudentAttendanceDocument;
        error?: string;
    }> {
        try {
            const studentDocRef = doc(db, "students", studentId);
            const studentDoc = await getDoc(studentDocRef);

            if (studentDoc.exists()) {
                const studentData = studentDoc.data();
                return {
                    success: true,
                    data: {
                        studentId,
                        attendanceByCourse: studentData.attendanceByCourse || {},
                        lastUpdated: studentData.lastUpdated || serverTimestamp() as Timestamp
                    }
                };
            } else {
                return {
                    success: false,
                    error: "Student not found"
                };
            }
        } catch (error) {
            console.error("Error getting student attendance from document:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }

    /**
     * Get student attendance for a specific course from student document
     */
    async getStudentCourseAttendance(studentId: string, courseId: string): Promise<{
        success: boolean;
        data?: {
            datesPresent: string[];
            summary: {
                totalClasses: number;
                attended: number;
                percentage: number;
            };
        };
        error?: string;
    }> {
        try {
            const result = await this.getStudentAttendanceFromDocument(studentId);

            if (result.success && result.data) {
                const courseAttendance = result.data.attendanceByCourse[courseId];

                if (courseAttendance) {
                    return {
                        success: true,
                        data: courseAttendance
                    };
                } else {
                    return {
                        success: true,
                        data: {
                            datesPresent: [],
                            summary: {
                                totalClasses: 0,
                                attended: 0,
                                percentage: 0
                            }
                        }
                    };
                }
            } else {
                return {
                    success: false,
                    error: result.error || "Failed to get student data"
                };
            }
        } catch (error) {
            console.error("Error getting student course attendance:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }
}

export default NewAttendanceService;
