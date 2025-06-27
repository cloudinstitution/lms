"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { getAdminSession } from "@/lib/session-storage"
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser"
import { collection, getDocs, query, where, doc, setDoc, getDoc, Timestamp } from "firebase/firestore"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface AttendanceScannerProps {
  onAttendanceMarked?: () => void
}

interface VideoDevice {
  deviceId: string;
  label: string;
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

  // Function to process QR code using the new attendance system
  const processAttendanceQRCode = async (qrData: string): Promise<{
    success: boolean;
    message: string;
    studentName?: string;
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
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

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
          message: `No course found for student ${studentName}.`,
          studentName
        };
      }

      // Check if attendance is already marked for this student's primary course today
      const attendanceDocRef = doc(db, "attendance", primaryCourseId, "dates", dateString);
      const attendanceSnap = await getDoc(attendanceDocRef);
      const existingAttendance = attendanceSnap.exists() ? attendanceSnap.data() : null;

      if (existingAttendance && existingAttendance.presentStudents?.includes(studentDoc.id)) {
        return {
          success: false,
          message: `Attendance already marked for ${studentName} today.`,
          studentName
        };
      }

      // Get current present students for this course and date, or start with empty array
      const currentPresentStudents = existingAttendance?.presentStudents || [];
      
      // Add this student to the present list
      const updatedPresentStudents = [...currentPresentStudents, studentDoc.id];
      
      // Use admin session data for proper Firestore document ID
      const teacherId = adminSession?.id || userProfile?.firestoreId || user?.uid || 'scanner';
      const teacherName = adminSession?.role || userProfile?.role || 'scanner';
      
      // Update attendance document in the same format as main page
      await setDoc(attendanceDocRef, {
        presentStudents: updatedPresentStudents,
        createdBy: teacherId,
        createdByName: teacherName,
        timestamp: Timestamp.now(),
        courseId: primaryCourseId,
        date: dateString
      });

      // Update student's attendance summary in the same format as main page
      const studentDocRef = doc(db, "students", studentDoc.id);
      const studentDataForUpdate = await getDoc(studentDocRef);
      
      if (studentDataForUpdate.exists()) {
        const currentStudentData = studentDataForUpdate.data();
        const attendanceByCourse = currentStudentData.attendanceByCourse || {};
        
        if (!attendanceByCourse[primaryCourseId]) {
          attendanceByCourse[primaryCourseId] = {
            datesPresent: [],
            summary: { totalClasses: 0, attended: 0, percentage: 0 }
          };
        }
        
        const courseAttendance = attendanceByCourse[primaryCourseId];
        
        // Add the date to present dates if not already there
        if (!courseAttendance.datesPresent.includes(dateString)) {
          courseAttendance.datesPresent.push(dateString);
        }
        
        // Update summary
        courseAttendance.summary.attended = courseAttendance.datesPresent.length;
        courseAttendance.summary.totalClasses = Math.max(
          courseAttendance.summary.totalClasses, 
          courseAttendance.summary.attended
        );
        courseAttendance.summary.percentage = courseAttendance.summary.totalClasses > 0 
          ? (courseAttendance.summary.attended / courseAttendance.summary.totalClasses) * 100 
          : 0;

        await setDoc(studentDocRef, {
          ...currentStudentData,
          attendanceByCourse
        }, { merge: true });
      }

      return {
        success: true,
        message: `Attendance marked successfully for ${studentName}`,
        studentName
      };

    } catch (error) {
      console.error("Error processing QR code:", error);
      return {
        success: false,
        message: `Error marking attendance: ${error instanceof Error ? error.message : "Unknown error"}`
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
                  console.log("Processing QR code:", qrData)
                  const response = await processAttendanceQRCode(qrData)
                  console.log("QR code processing response:", response)

                  if (response.success) {
                    setStatus("success")
                    setMessage(response.message)
                    if (response.studentName) {
                      setStudentName(response.studentName)
                    }
                    if (onAttendanceMarked) {
                      onAttendanceMarked()
                    }
                  } else {
                    setStatus("error")
                    setMessage(response.message)
                    if (response.studentName) {
                      setStudentName(response.studentName)
                    }
                  }
                } catch (error) {
                  console.error("Error processing QR code:", error)
                  setStatus("error")
                  setMessage(`Error processing QR code: ${error instanceof Error ? error.message : "Unknown error"}`)
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
      }
    } catch (error) {
      console.error("Error starting scanner:", error)
      setCameraError(`Error accessing camera: ${error instanceof Error ? error.message : "Unknown error"}`)
      setStatus("error")
      setScanning(false)
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
  }

  const resetScanner = () => {
    stopScanning()
    setStatus("idle")
    setScanned(false)
    setResult(null)
    setStudentName(null)
    setMessage("")
    setCameraError(null)
  }
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
        <Alert className="bg-card border-muted-foreground/20">
          {scanning && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "success" && <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
          {status === "error" && <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
          <AlertTitle className="text-foreground">
            {status === "success" ? "Success" : status === "error" ? "Error" : "Scanning"}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {message}
            {studentName && (status === "success" || status === "error") && (
              <p className="font-medium mt-1 text-foreground">Student: {studentName}</p>
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
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}

export default AttendanceScanner
