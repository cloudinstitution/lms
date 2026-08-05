"use client"

// Define session storage keys
export const SESSION_KEYS = {
  STUDENT_ID: 'studentId',
  STUDENT_NAME: 'studentName',
  STUDENT_DATA: 'studentData',
  IS_ADMIN: 'isAdmin',
  ADMIN_DATA: 'adminData',
  SESSION_EXPIRY: 'sessionExpiry',
}

// Session duration in milliseconds (4 hours)
const SESSION_DURATION = 4 * 60 * 60 * 1000

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

/**
 * Set a session item in localStorage with expiry
 */
export function setSessionItem(key: string, value: any): void {
  if (!isBrowser) return
  
  try {
    // If value is undefined or null, remove the item
    if (value === undefined || value === null) {
      localStorage.removeItem(key)
      return
    }
    
    localStorage.setItem(key, JSON.stringify(value))
    
    // Set session expiry
    const expiry = Date.now() + SESSION_DURATION
    localStorage.setItem(SESSION_KEYS.SESSION_EXPIRY, expiry.toString())
  } catch (error) {
    console.error('Error storing in localStorage:', error)
  }
}

/**
 * Get a session item from localStorage
 */
export function getSessionItem<T>(key: string): T | null {
  if (!isBrowser) return null
  
  try {
    // Check if session is expired
    if (isSessionExpired()) {
      clearSession()
      return null
    }
    
    const item = localStorage.getItem(key)
    if (!item) return null
    
    try {
      return JSON.parse(item) as T
    } catch (e) {
      // If JSON parsing fails, return the item as is (for string values)
      return item as unknown as T
    }
  } catch (error) {
    console.error('Error retrieving from localStorage:', error)
    return null
  }
}

/**
 * Remove a session item from localStorage
 */
export function removeSessionItem(key: string): void {
  if (!isBrowser) return
  
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error removing from localStorage:', error)
  }
}

/**
 * Clear all session items from localStorage
 */
export function clearSession(): void {
  if (!isBrowser) return
  
  try {
    Object.values(SESSION_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Error clearing session from localStorage:', error)
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(): boolean {
  if (!isBrowser) return true
  
  try {
    const expiry = localStorage.getItem(SESSION_KEYS.SESSION_EXPIRY)
    if (!expiry) return true
    
    return Date.now() > parseInt(expiry, 10)
  } catch (error) {
    console.error('Error checking session expiry:', error)
    return true
  }
}

/**
 * Store student data in session
 */
export function storeStudentSession(studentData: any): void {
  if (!isBrowser || !studentData) return
  
  // Store full student data object
  setSessionItem(SESSION_KEYS.STUDENT_DATA, studentData)
  
  // Also store common fields for quick access
  const studentId = studentData.id || studentData.studentId
  if (studentId) {
    setSessionItem(SESSION_KEYS.STUDENT_ID, studentId)
  }
  
  if (studentData.name) {
    setSessionItem(SESSION_KEYS.STUDENT_NAME, studentData.name)
  }
  
  // Ensure the session has an expiry
  const expiry = Date.now() + SESSION_DURATION
  localStorage.setItem(SESSION_KEYS.SESSION_EXPIRY, expiry.toString())
}

/**
 * Get stored student data from session
 */
export function getStudentSession(): any {
  return getSessionItem(SESSION_KEYS.STUDENT_DATA)
}

/**
 * Get student ID from session
 */
export function getStudentId(): string | null {
  return getSessionItem<string>(SESSION_KEYS.STUDENT_ID)
}

/**
 * Get student name from session
 */
export function getStudentName(): string | null {
  return getSessionItem<string>(SESSION_KEYS.STUDENT_NAME)
}

/**
 * Store admin session flag
 */
export function setAdminSession(isAdmin: boolean): void {
  setSessionItem(SESSION_KEYS.IS_ADMIN, isAdmin)
}

/**
 * Check if current session is admin
 */
export function isAdminSession(): boolean {
  return getSessionItem<boolean>(SESSION_KEYS.IS_ADMIN) || false
}

export interface AdminData {
  id: string;
  username: string;
  roleId: number;
  role: 'admin' | 'teacher';
  name?: string;
  assignedCourses?: string[];
}

export function storeAdminSession(adminData: AdminData): void {
  setSessionItem(SESSION_KEYS.ADMIN_DATA, adminData);
  setSessionItem(SESSION_KEYS.IS_ADMIN, true);
}

export function getAdminSession(): AdminData | null {
  return getSessionItem<AdminData>(SESSION_KEYS.ADMIN_DATA);
}
