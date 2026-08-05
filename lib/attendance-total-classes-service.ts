import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Gets the total number of classes for a course by counting attendance dates
 * @param courseId The course ID to count total classes for
 * @returns Promise<number> The total number of classes (attendance dates) for the course
 */
export async function getTotalClassesForCourse(courseId: string): Promise<number> {
  try {
    const attendanceDatesRef = collection(db, "attendance", courseId, "dates");
    const attendanceDatesSnapshot = await getDocs(attendanceDatesRef);
    return attendanceDatesSnapshot.size;
  } catch (error) {
    console.error(`Error fetching total classes for course ${courseId}:`, error);
    return 0;
  }
}

/**
 * Updates student attendance summary with correct total classes count
 * @param studentData The student's Firestore document data
 * @param courseId The course ID to update
 * @param dateString The date being marked (YYYY-MM-DD format)
 * @param isPresent Whether the student is present for this date
 * @returns Promise<object> Updated attendanceByCourse object
 */
export async function updateStudentAttendanceSummary(
  studentData: any,
  courseId: string,
  dateString: string,
  isPresent: boolean
): Promise<any> {
  const attendanceByCourse = studentData.attendanceByCourse || {};
  
  if (!attendanceByCourse[courseId]) {
    attendanceByCourse[courseId] = {
      datesPresent: [],
      summary: { totalClasses: 0, attended: 0, percentage: 0 }
    };
  }
  
  const courseAttendance = attendanceByCourse[courseId];
  
  if (isPresent) {
    // Add the date to present dates if not already there
    if (!courseAttendance.datesPresent.includes(dateString)) {
      courseAttendance.datesPresent.push(dateString);
    }
  } else {
    // Remove the date from present dates if it exists
    courseAttendance.datesPresent = courseAttendance.datesPresent.filter(
      (date: string) => date !== dateString
    );
  }
  
  // Get total class count from attendance dates collection
  const totalClassesCount = await getTotalClassesForCourse(courseId);
  
  // Update summary with actual total classes count from attendance collection
  courseAttendance.summary.attended = courseAttendance.datesPresent.length;
  courseAttendance.summary.totalClasses = totalClassesCount;
  courseAttendance.summary.percentage = totalClassesCount > 0 
    ? (courseAttendance.summary.attended / totalClassesCount) * 100 
    : 0;
    
  return attendanceByCourse;
}

/**
 * Updates all students' total class counts for all courses to ensure consistency
 * This function can be used to correct existing data
 * @returns Promise<void>
 */
export async function updateAllStudentsTotalClasses(): Promise<void> {
  try {
    console.log("Starting total classes update for all students...");
    
    // Get all students
    const studentsRef = collection(db, "students");
    const studentsSnapshot = await getDocs(studentsRef);
    
    let updatedCount = 0;
    
    const updatePromises = studentsSnapshot.docs.map(async (studentDocSnap) => {
      const studentData = studentDocSnap.data();
      const attendanceByCourse = studentData.attendanceByCourse || {};
      
      let hasUpdates = false;
      
      // Update total classes for each course the student is enrolled in
      for (const courseId in attendanceByCourse) {
        const currentTotalClasses = attendanceByCourse[courseId].summary?.totalClasses || 0;
        const actualTotalClasses = await getTotalClassesForCourse(courseId);
        
        if (currentTotalClasses !== actualTotalClasses) {
          attendanceByCourse[courseId].summary.totalClasses = actualTotalClasses;
          
          // Recalculate percentage with new total
          const attended = attendanceByCourse[courseId].summary?.attended || 0;
          attendanceByCourse[courseId].summary.percentage = actualTotalClasses > 0 
            ? (attended / actualTotalClasses) * 100 
            : 0;
            
          hasUpdates = true;
        }
      }
      
      // Update student document only if there were changes
      if (hasUpdates) {
        await setDoc(doc(db, "students", studentDocSnap.id), {
          ...studentData,
          attendanceByCourse
        }, { merge: true });
        
        updatedCount++;
      }
    });
    
    await Promise.all(updatePromises);
    console.log(`Updated total classes for ${updatedCount} students`);
    
  } catch (error) {
    console.error("Error updating all students' total classes:", error);
    throw error;
  }
}
