/**
 * Utility functions for course-specific features
 * 
 * AWS Course Detection:
 * - Checks if any of the student's enrolled courses contain "AWS" in the name (case-insensitive)
 * - This includes courses like "AWS", "AWS Cloud Computing", "AWS DevOps", etc.
 * - Programming features are disabled for AWS students as they focus on cloud concepts
 */
import { getStudentSession } from './session-storage';

/**
 * Check if the current student is enrolled in AWS course
 * @returns boolean indicating if student is in AWS course
 */
export function isStudentInAWSCourse(): boolean {
  try {
    const studentData = getStudentSession();
    
    if (!studentData || !studentData.courseName) {
      return false;
    }
    
    // Check if any of the student's courses contain "AWS" (case-insensitive)
    const courseNames = Array.isArray(studentData.courseName) 
      ? studentData.courseName 
      : [studentData.courseName];
      
    return courseNames.some((courseName: string) => 
      courseName && courseName.toLowerCase().includes('aws')
    );
  } catch (error) {
    console.error('Error checking AWS course enrollment:', error);
    return false;
  }
}

/**
 * Get AWS course names that the student is enrolled in
 * @returns Array of AWS course names
 */
export function getStudentAWSCourses(): string[] {
  try {
    const studentData = getStudentSession();
    
    if (!studentData || !studentData.courseName) {
      return [];
    }
    
    const courseNames = Array.isArray(studentData.courseName) 
      ? studentData.courseName 
      : [studentData.courseName];
      
    return courseNames.filter((courseName: string) => 
      courseName && courseName.toLowerCase().includes('aws')
    );
  } catch (error) {
    console.error('Error getting AWS courses:', error);
    return [];
  }
}