"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  height?: string
  theme?: "vs-dark" | "light"
}

export default function MonacoEditor({ value, onChange, language, height = "400px", theme = "vs-dark" }: MonacoEditorProps) {
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<any>(null)
  const [monaco, setMonaco] = useState<any>(null)

  // Map language to Monaco language
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      javascript: "javascript",
      typescript: "typescript",
      python: "python",
      java: "java",
      cpp: "cpp",
      "c++": "cpp",
      csharp: "csharp",
      "c#": "csharp",
      php: "php",
      ruby: "ruby",
      go: "go",
      rust: "rust",
    }

    return languageMap[lang.toLowerCase()] || "plaintext"
  }

  useEffect(() => {
    let isMounted = true

    const loadMonaco = async () => {
      try {
        setLoading(true)

        // Use dynamic import with error handling
        const monacoModule = await import("monaco-editor/esm/vs/editor/editor.api")

        // Check if component is still mounted
        if (!isMounted) return

        setMonaco(monacoModule)

        if (containerRef.current) {
          // Configure Monaco worker paths to avoid the toUrl error
          window.MonacoEnvironment = {
            getWorkerUrl: (_moduleId: string, label: string) => {
              if (label === "typescript" || label === "javascript") {
                return "/monaco-editor-workers/ts.worker.js"
              }
              return "/monaco-editor-workers/editor.worker.js"
            },
          }          // Create editor
          const newEditor = monacoModule.editor.create(containerRef.current, {
            value,
            language: getMonacoLanguage(language),
            theme: theme,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize: 2,
            wordWrap: "on",
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
          })

          // Set up change event handler
          newEditor.onDidChangeModelContent(() => {
            onChange(newEditor.getValue())
          })

          setEditor(newEditor)
          editorRef.current = newEditor
        }
      } catch (error) {
        console.error("Failed to load Monaco editor:", error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMonaco()

    return () => {
      isMounted = false
      if (editorRef.current) {
        editorRef.current.dispose()
      }
    }
  }, [])

  // Update editor value when prop changes
  useEffect(() => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value)
    }
  }, [value, editor])

  // Update language when prop changes
  useEffect(() => {
    if (editor && monaco) {
      const model = editor.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, getMonacoLanguage(language))
      }
    }
  }, [language, editor, monaco])

  // Update theme when it changes
  useEffect(() => {
    if (editor && monaco) {
      monaco.editor.setTheme(theme)
    }
  }, [theme, editor, monaco])

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
