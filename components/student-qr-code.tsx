"use client"
import { QRCodeCanvas } from "qrcode.react";

interface StudentQRCodeProps {
  attendanceCode: string
  size?: number
}

export function StudentQRCode({ attendanceCode, size = 200 }: StudentQRCodeProps) {
  if (!attendanceCode) {
    return (
      <div className="h-48 w-48 flex items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-lg border-2 border-black">
      <QRCodeCanvas
        value={attendanceCode}
        size={size}
        level="H" // High error correction capability
        includeMargin={true}
      />
    </div>
  )
}
