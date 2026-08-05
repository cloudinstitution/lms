"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStudentSession } from './session-storage'

/**
 * Custom hook to handle session management in student pages
 * @param callback Function to call with student data when session is available
 * @returns Object containing loading state and router
 */
export function useStudentSession(callback: (studentData: any) => void) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  // Use a stable callback with useCallback
  const stableCallback = useCallback(callback, []);
    useEffect(() => {
    let isMounted = true;
    
    // Get student data from localStorage
    const studentData = getStudentSession()
    
    if (studentData) {
      // We have a valid session, call the callback with student data
      stableCallback(studentData)
      if (isMounted) setIsLoading(false)
    } else {
      // No valid session, redirect to login
      console.warn("No student session found, redirecting to login")
      router.push('/login')
    }
    
    return () => {
      isMounted = false;
    }
  }, [router, stableCallback])
  
  return { router, isLoading }
}
