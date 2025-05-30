"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"

interface CodeExecutionResultProps {
  result: any
}

export default function CodeExecutionResult({ result }: CodeExecutionResultProps) {
  if (!result) return null

  const isSuccess = result.status?.id === 3
  const isCompilationError = result.status?.id === 6
  const isRuntimeError = result.stderr && !isCompilationError

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Execution Result</CardTitle>
          <Badge variant={isSuccess ? "success" : "destructive"}>
            {result.status?.description || "Unknown Status"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Output */}
        {result.stdout && (
          <div>
            <h3 className="text-sm font-medium mb-1 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              Output
            </h3>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">{result.stdout}</pre>
          </div>
        )}

        {/* Processed Output (from language adapter) */}
        {result.processedOutput && !result.stdout && (
          <div>
            <h3 className="text-sm font-medium mb-1 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              Output
            </h3>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {result.processedOutput}
            </pre>
          </div>
        )}

        {/* Compilation Error */}
        {result.compile_output && (
          <div>
            <h3 className="text-sm font-medium mb-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
              Compilation Error
            </h3>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap text-red-500">
              {result.compile_output}
            </pre>
          </div>
        )}

        {/* Runtime Error */}
        {isRuntimeError && (
          <div>
            <h3 className="text-sm font-medium mb-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
              Runtime Error
            </h3>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap text-red-500">
              {result.stderr}
            </pre>
          </div>
        )}

        {/* Execution Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {result.time && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Time: {result.time}s
            </div>
          )}
          {result.memory && <div>Memory: {Math.round(result.memory / 1024)} KB</div>}
        </div>
      </CardContent>
    </Card>
  )
}
