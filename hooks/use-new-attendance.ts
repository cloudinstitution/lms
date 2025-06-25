import { AttendanceDate, StudentAttendanceRecord } from '@/lib/new-attendance-service';
import { useCallback, useState } from 'react';

interface UseNewAttendanceReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  markAttendance: (params: {
    courseId: string;
    date: string;
    presentStudents: string[];
    teacherId: string;
    teacherName?: string;
  }) => Promise<{ success: boolean; message: string }>;
  
  updateAttendance: (params: {
    courseId: string;
    date: string;
    presentStudents: string[];
    teacherId: string;
    teacherName?: string;
  }) => Promise<{ success: boolean; message: string }>;
  
  getCourseAttendance: (params: {
    courseId: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<{
    success: boolean;
    data?: {
      attendance?: AttendanceDate;
      stats?: {
        totalStudents: number;
        presentStudents: number;
        absentStudents: number;
        attendancePercentage: number;
        presentStudentIds: string[];
      };
      records?: AttendanceDate[];
      count?: number;
    };
  }>;
  
  getStudentSummary: (params: {
    studentId: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<{
    success: boolean;
    data?: {
      studentId: string;
      totalClasses: number;
      attendedClasses: number;
      attendancePercentage: number;
      records: StudentAttendanceRecord[];
      dateRange: { start: string; end: string } | null;
    };
  }>;
  
  getStudentFromDocument: (params: {
    studentId: string;
    courseId?: string;
  }) => Promise<{
    success: boolean;
    data?: any;
  }>;
  
  clearError: () => void;
}

export const useNewAttendance = (): UseNewAttendanceReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const markAttendance = useCallback(async (params: {
    courseId: string;
    date: string;
    presentStudents: string[];
    teacherId: string;
    teacherName?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/new-mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark attendance');
      }

      return {
        success: true,
        message: result.message || 'Attendance marked successfully'
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAttendance = useCallback(async (params: {
    courseId: string;
    date: string;
    presentStudents: string[];
    teacherId: string;
    teacherName?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attendance/new-mark', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update attendance');
      }

      return {
        success: true,
        message: result.message || 'Attendance updated successfully'
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getCourseAttendance = useCallback(async (params: {
    courseId: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({ courseId: params.courseId });
      
      if (params.date) {
        searchParams.append('date', params.date);
      }
      if (params.startDate) {
        searchParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        searchParams.append('endDate', params.endDate);
      }

      const response = await fetch(`/api/attendance/new-mark?${searchParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get attendance data');
      }

      return {
        success: true,
        data: result.data
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentSummary = useCallback(async (params: {
    studentId: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({ studentId: params.studentId });
      
      if (params.startDate) {
        searchParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        searchParams.append('endDate', params.endDate);
      }

      const response = await fetch(`/api/attendance/student-summary?${searchParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get student attendance summary');
      }

      return {
        success: true,
        data: result.data
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentFromDocument = useCallback(async (params: {
    studentId: string;
    courseId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({ studentId: params.studentId });
      
      if (params.courseId) {
        searchParams.append('courseId', params.courseId);
      }

      const response = await fetch(`/api/attendance/student-document?${searchParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get student attendance from document');
      }

      return {
        success: true,
        data: result.data
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    markAttendance,
    updateAttendance,
    getCourseAttendance,
    getStudentSummary,
    getStudentFromDocument,
    clearError,
  };
};
