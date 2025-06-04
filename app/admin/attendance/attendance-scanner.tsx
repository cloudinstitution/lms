"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { processAttendanceQRCode } from "@/lib/attendance-utils"
import { BrowserQRCodeReader } from "@zxing/browser"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface AttendanceScannerProps {
  onAttendanceMarked?: () => void // Callback for successful scan
}

const AttendanceScanner = ({ onAttendanceMarked }: AttendanceScannerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [codeReader, setCodeReader] = useState<BrowserQRCodeReader | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserQRCodeReader()
    setCodeReader(reader)

    return () => {
      stopScanning()
    }
  }, [])

  const startScanning = async () => {
    if (!codeReader || scanning) return

    setScanning(true)
    setStatus("scanning")
    setScanned(false)
    setResult(null)
    setStudentName(null)
    setMessage("Scanning for QR code...")
    setCameraError(null)

    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices()

      if (devices.length === 0) {
        setCameraError("No camera devices found. Please ensure your camera is connected and permissions are granted.")
        setStatus("error")
        setMessage("No camera devices found. Please ensure your camera is connected and permissions are granted.")
        setScanning(false)
        return
      }

      const selectedDeviceId = devices[0].deviceId

      if (videoRef.current) {
        codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, async (result, err) => {
          if (result && !scanned) {
            const qrData = result.getText()
            setResult(qrData)
            setScanned(true)

            try {
              console.log("Processing QR code:", qrData)
              // Process the QR code using the utility function
              const response = await processAttendanceQRCode(qrData)
              console.log("QR code processing response:", response)

              if (response.success) {
                setStatus("success")
                setMessage(response.message)
                if (response.studentName) {
                  setStudentName(response.studentName)
                }
                // Notify parent component of successful scan
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

            // Stop the camera stream after a successful scan
            stopScanning()
          } else if (err && err.message !== "No MultiFormat Readers were able to detect the code.") {
            console.error("QR code scanning error:", err)
            setStatus("error")
            setMessage(`Error scanning QR code: ${err.message}`)
            stopScanning()
          }
        })
      }
    } catch (error) {
      console.error("Error starting scanner:", error)
      setCameraError(`Error starting scanner: ${error instanceof Error ? error.message : "Unknown error"}`)
      setStatus("error")
      setMessage(`Error starting scanner: ${error instanceof Error ? error.message : "Unknown error"}`)
      setScanning(false)
    }
  }

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
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
      <div className="w-full max-w-md relative">
        <video
          ref={videoRef}
          className={`w-full aspect-video border-2 rounded-lg bg-muted dark:bg-muted/20 ${scanning ? "border-primary" : "border-muted"}`}
        />

        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/10 dark:bg-background/20 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm font-medium text-foreground">Scanning...</p>
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
