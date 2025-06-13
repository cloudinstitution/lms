"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { processAttendanceQRCode } from "@/lib/attendance-utils"
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser"
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
