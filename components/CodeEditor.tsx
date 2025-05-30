"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

type CodeEditorProps = {
  value: string
  onChange: (val: string) => void
  language?: string
  height?: string
}

// This is a simplified code editor component
// In a real application, you would use a proper code editor like Monaco Editor or CodeMirror
export default function CodeEditor({ value, onChange, language = "javascript", height = "300px" }: CodeEditorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono text-sm w-full h-full p-4 resize-none focus:outline-none"
      style={{ height }}
      spellCheck="false"
      placeholder={`Write your ${language} code here...`}
    />
  )
}
