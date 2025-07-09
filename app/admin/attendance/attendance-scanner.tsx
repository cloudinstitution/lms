"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { updateStudentAttendanceSummary } from "@/lib/attendance-total-classes-service"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { getAdminSession } from "@/lib/session-storage"
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser"
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface AttendanceScannerProps {
  onAttendanceMarked?: () => void
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface ScannedStudent {
  id: string;
  studentId: string;
  name: string;
  primaryCourseId: string;
  courseName: string;
  scannedAt: Date;
}

const AttendanceScanner = ({ onAttendanceMarked }: AttendanceScannerProps) => {
  const { user, userProfile } = useAuth()
  const adminSession = getAdminSession()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [studentName, setStudentName] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false)

  // Function to validate and extract student info from QR code without marking attendance
  const validateStudentQRCode = async (qrData: string): Promise<{
    success: boolean;
    message: string;
    student?: ScannedStudent;
    alreadyMarked?: boolean;
  }> => {
    try {
      if (!qrData || typeof qrData !== "string") {
        return {
          success: false,
          message: "Invalid QR code format. Please try again."
        };
      }

      // Parse student ID from QR code (expected format: studentId or studentId-YYYY-MM-DD)
      const match = qrData.match(/^([A-Za-z0-9]+)(?:-(\d{4}-\d{2}-\d{2}))?$/);
      if (!match) {
        return {
          success: false,
          message: "Invalid QR code format. Expected student ID."
        };
      }

      const [, studentId] = match;

      // Query students collection to find the student
      const studentsQuery = query(collection(db, "students"), where("studentId", "==", studentId));
      const studentSnap = await getDocs(studentsQuery);

      if (studentSnap.empty) {
        return {
          success: false,
          message: `Student with ID ${studentId} not found.`
        };
      }

      const studentDoc = studentSnap.docs[0];
      const studentData = studentDoc.data();
      const studentName = studentData.name || "Unknown Student";

      // Get student's courses
      const courseIDs = Array.isArray(studentData.courseID) ? studentData.courseID : [studentData.courseID];
      const primaryCourseIndex = studentData.primaryCourseIndex || 0;
      const primaryCourseId = courseIDs[primaryCourseIndex]?.toString() || courseIDs[0]?.toString();

      if (!primaryCourseId) {
        return {
          success: false,
          message: `No course found for student ${studentName}.`
        };
      }

      // Check if student is already in scanned list
      if (scannedStudents.some(s => s.id === studentDoc.id)) {
        return {
          success: false,
          message: `${studentName} has already been scanned.`
        };
      }

      // Check if attendance is already marked for this student's primary course today
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const attendanceDocRef = doc(db, "attendance", primaryCourseId, "dates", dateString);
      const attendanceSnap = await getDoc(attendanceDocRef);
      const existingAttendance = attendanceSnap.exists() ? attendanceSnap.data() : null;

      if (existingAttendance && existingAttendance.presentStudents?.includes(studentDoc.id)) {
        return {
          success: false,
          message: `${studentName} is already marked present for today.`,
          alreadyMarked: true,
          student: {
            id: studentDoc.id,
            studentId: studentId,
            name: studentName,
            primaryCourseId: primaryCourseId,
            courseName: `Course ${primaryCourseId}`,
            scannedAt: new Date()
          }
        };
      }

      // Get course name from courses (assuming we have access to courses data)
      // For now, we'll use the course ID as the course name
      const courseName = `Course ${primaryCourseId}`;

      const scannedStudent: ScannedStudent = {
        id: studentDoc.id,
        studentId: studentId,
        name: studentName,
        primaryCourseId: primaryCourseId,
        courseName: courseName,
        scannedAt: new Date()
      };

      return {
        success: true,
        message: `${studentName} added to scan list.`,
        student: scannedStudent
      };

    } catch (error) {
      console.error("Error validating QR code:", error);
      return {
        success: false,
        message: `Error validating QR code: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  };

  // Function to get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      const videoDevices = devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${devices.indexOf(device) + 1}`
      }))
      setDevices(videoDevices)
      
      // Select the rear camera by default if available
      const rearCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      )
      setSelectedCamera(rearCamera?.deviceId || videoDevices[0]?.deviceId || "")
    } catch (error) {
      console.error("Error getting camera devices:", error)
      setCameraError("Error accessing camera devices")
    }
  }

  // Initialize available cameras when component mounts
  useEffect(() => {
    getAvailableCameras()
  }, [])

  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    }
  }, [])

  const startScanning = async () => {
    if (scanning) return

    setScanning(true)
    setStatus("scanning")
    setScanned(false)
    setResult(null)
    setStudentName(null)
    setMessage("Initializing camera...")
    setCameraError(null)

    try {
      // Check camera permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      } catch (error) {
        console.error("Camera permission error:", error)
        setCameraError("Camera access denied. Please grant camera permissions and try again.")
        setStatus("error")
        setScanning(false)
        
        // Show error toast for camera permission issues
        toast.error("Camera Access Denied", {
          description: "Please grant camera permissions and try again",
          duration: 5000
        })
        return
      }

      const codeReader = new BrowserMultiFormatReader()
        try {
        if (!selectedCamera) {
          setCameraError("No camera selected. Please select a camera.")
          setStatus("error")
          setScanning(false)
          return
        }        setMessage("Camera initialized. Ready to scan QR code...")
        
        // Show info toast when scanner is ready
        toast.info("Scanner Ready", {
          description: "Point your camera at a student QR code to scan",
          duration: 2000
        })

        if (videoRef.current) {
          controlsRef.current = await codeReader.decodeFromVideoDevice(
            selectedCamera,
            videoRef.current,
            async (result, error) => {
              if (result && !scanned) {
                const qrData = result.getText()
                setResult(qrData)
                setScanned(true)

                try {
                  const response = await validateStudentQRCode(qrData)

                  if (response.success && response.student) {
                    setStatus("success")
                    setMessage(response.message)
                    setStudentName(response.student.name)
                    setIsAlreadyMarked(false)
                    
                    // Show success toast for student scanned
                    toast.success("Student Scanned Successfully", {
                      description: `${response.student.name} added to attendance list`,
                      duration: 3000
                    })
                    
                    // Add student to scanned list
                    setScannedStudents(prev => [...prev, response.student!])
                    
                    // Reset scanner for next scan
                    setTimeout(() => {
                      resetScanner()
                    }, 1500)
                  } else {
                    setStatus("error")
                    setMessage(response.message)
                    setIsAlreadyMarked(response.alreadyMarked || false)
                    
                    // Set student name if available (for already marked students)
                    if (response.student) {
                      setStudentName(response.student.name);
                    }
                    
                    // Show appropriate toast based on error type
                    if (response.alreadyMarked) {
                      toast.warning("Student Already Present", {
                        description: `${response.student?.name || 'This student'} is already marked present for today`,
                        duration: 4000
                      })
                    } else {
                      toast.error("Scan Failed", {
                        description: response.message,
                        duration: 4000
                      })
                    }
                  }
                } catch (error) {
                  console.error("Error processing QR code:", error)
                  setStatus("error")
                  setMessage(`Error processing QR code: ${error instanceof Error ? error.message : "Unknown error"}`)
                  setIsAlreadyMarked(false)
                  
                  // Show error toast for processing errors
                  toast.error("QR Code Processing Error", {
                    description: error instanceof Error ? error.message : "Failed to process QR code",
                    duration: 4000
                  })
                }
                stopScanning()
              }
            }
          )
        }
      } catch (error) {
        console.error("Error initializing camera stream:", error)
        setCameraError(`Error initializing camera: ${error instanceof Error ? error.message : "Unknown error"}`)
        setStatus("error")
        setScanning(false)
        
        // Show error toast for camera initialization issues
        toast.error("Camera Initialization Failed", {
          description: error instanceof Error ? error.message : "Failed to initialize camera",
          duration: 5000
        })
      }
    } catch (error) {
      console.error("Error starting scanner:", error)
      setCameraError(`Error accessing camera: ${error instanceof Error ? error.message : "Unknown error"}`)
      setStatus("error")
      setScanning(false)
      
      // Show error toast for general scanner errors
      toast.error("Scanner Error", {
        description: error instanceof Error ? error.message : "Failed to start scanner",
        duration: 5000
      })
    }
  }
  const stopScanning = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false)
    setStatus("idle")
    setMessage("")
    
    // Show info toast when scanner is manually stopped
    if (scanning) {
      toast.info("Scanner Stopped", {
        description: "Camera has been turned off",
        duration: 2000
      })
    }
  }

  const resetScanner = () => {
    stopScanning()
    setStatus("idle")
    setScanned(false)
    setResult(null)
    setStudentName(null)
    setMessage("")
    setCameraError(null)
    setIsAlreadyMarked(false)
    // Don't clear scanned students here - they should persist until submitted or manually cleared
  }

  // Function to submit attendance for all scanned students
  const submitAllAttendance = async () => {
    if (scannedStudents.length === 0) return;
    
    setSubmitting(true);
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Group students by course
      const courseGroups = new Map<string, ScannedStudent[]>();
      scannedStudents.forEach(student => {
        if (!courseGroups.has(student.primaryCourseId)) {
          courseGroups.set(student.primaryCourseId, []);
        }
        courseGroups.get(student.primaryCourseId)!.push(student);
      });

      // Process attendance for each course
      const promises = Array.from(courseGroups.entries()).map(async ([courseId, students]) => {
        try {
          const attendanceDocRef = doc(db, "attendance", courseId, "dates", dateString);
          const attendanceSnap = await getDoc(attendanceDocRef);
          const existingAttendance = attendanceSnap.exists() ? attendanceSnap.data() : null;
          
          // Get current present students for this course and date
          const currentPresentStudents = existingAttendance?.presentStudents || [];
          
          // Add new students to the present list (avoid duplicates)
          const newStudentIds = students.map(s => s.id);
          const updatedPresentStudents = [...new Set([...currentPresentStudents, ...newStudentIds])];
          
          // Use admin session data for proper Firestore document ID
          const teacherId = adminSession?.id || userProfile?.firestoreId || user?.uid || 'scanner';
          const teacherName = adminSession?.role || userProfile?.role || 'scanner';
          
          // Update attendance document
          await setDoc(attendanceDocRef, {
            presentStudents: updatedPresentStudents,
            createdBy: teacherId,
            createdByName: teacherName,
            timestamp: Timestamp.now(),
            courseId: courseId,
            date: dateString
          });

          // Update each student's attendance summary
          const studentPromises = students.map(async (student) => {
            const studentDocRef = doc(db, "students", student.id);
            const studentDoc = await getDoc(studentDocRef);
            
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              const updatedAttendanceByCourse = await updateStudentAttendanceSummary(
                studentData,
                courseId,
                dateString,
                true // student is present (scanned)
              );

              await setDoc(studentDocRef, {
                ...studentData,
                attendanceByCourse: updatedAttendanceByCourse
              }, { merge: true });
            }
          });

          await Promise.all(studentPromises);
        } catch (error) {
          console.error(`Error processing course ${courseId}:`, error);
          throw error;
        }
      });

      await Promise.all(promises);
      
      // Store count before clearing for toast message
      const submittedCount = scannedStudents.length;
      
      // Clear scanned students and show success
      setScannedStudents([]);
      setStatus("success");
      setMessage(`Attendance marked successfully for ${submittedCount} student(s)`);
      
      // Show success toast for attendance submission
      toast.success("Attendance Submitted Successfully", {
        description: `Marked ${submittedCount} student(s) as present`,
        duration: 4000
      });
      
      // Call the callback to refresh the main attendance page
      if (onAttendanceMarked) {
        onAttendanceMarked();
      }
      
    } catch (error) {
      console.error("Error submitting attendance:", error);
      setStatus("error");
      setMessage(`Error submitting attendance: ${error instanceof Error ? error.message : "Unknown error"}`);
      
      // Show error toast for submission failure
      toast.error("Failed to Submit Attendance", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Function to remove a student from the scanned list
  const removeScannedStudent = (studentId: string) => {
    setScannedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // Function to clear all scanned students
  const clearAllScanned = () => {
    setScannedStudents([]);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {devices.length > 1 && (
        <div className="w-full max-w-md">
          <select
            value={selectedCamera}
            onChange={(e) => {
              setSelectedCamera(e.target.value)
              if (scanning) {
                stopScanning()
                setTimeout(() => startScanning(), 500)
              }
            }}
            className="w-full p-2 rounded-lg border border-input bg-background text-sm"
            disabled={scanning}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="w-full max-w-md relative">
        <video
          ref={videoRef}
          className={`w-full aspect-video border-2 rounded-lg ${scanning ? "border-primary" : "border-muted"}`}
          style={{ background: "black" }}
        />        {status === "scanning" && (
          <div className="absolute top-4 right-4 bg-black/70 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-white">Scanning...</p>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <Alert variant="destructive" className="max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-foreground">Camera Error</AlertTitle>
          <AlertDescription className="text-muted-foreground">{cameraError}</AlertDescription>
        </Alert>
      )}

      {(status === "success" || status === "error" || scanning) && (
        <Alert className={`max-w-md ${isAlreadyMarked ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'bg-card border-muted-foreground/20'}`}>
          {scanning && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "success" && <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
          {status === "error" && !isAlreadyMarked && <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
          {status === "error" && isAlreadyMarked && (
            <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
          <AlertTitle className="text-foreground">
            {status === "success" ? "Student Added" : 
             status === "error" && isAlreadyMarked ? "Already Present" : 
             status === "error" ? "Error" : "Scanning"}
          </AlertTitle>
          <AlertDescription className={`${isAlreadyMarked ? 'text-yellow-700 dark:text-yellow-300' : 'text-muted-foreground'}`}>
            {message}
            {studentName && (status === "success" || status === "error") && (
              <p className="font-medium mt-1 text-foreground">Student: {studentName}</p>
            )}
            {isAlreadyMarked && (
              <p className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                This student's attendance for today has already been recorded.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {!scanning && status !== "success" && (
          <Button onClick={startScanning} disabled={scanning}>
            {status === "error" ? "Try Again" : "Start Scanning"}
          </Button>
        )}

        {scanning && (
          <Button variant="outline" onClick={stopScanning}>
            Cancel
          </Button>
        )}

        {(status === "success" || status === "error") && (
          <Button variant="outline" onClick={resetScanner}>
            {scannedStudents.length > 0 ? "Scan Next" : "Reset"}
          </Button>
        )}
      </div>

      {/* Scanned Students List */}
      {scannedStudents.length > 0 && (
        <div className="w-full max-w-md mt-6">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-foreground">Scanned Students ({scannedStudents.length})</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllScanned}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {scannedStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {student.studentId}</p>
                    <p className="text-xs text-muted-foreground">Scanned: {student.scannedAt.toLocaleTimeString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScannedStudent(student.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-2">
              <Button
                onClick={submitAllAttendance}
                disabled={submitting || scannedStudents.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Mark ${scannedStudents.length} Student(s) Present`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AttendanceScanner
