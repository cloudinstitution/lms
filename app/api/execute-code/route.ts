import { executeCodeWithAdapter } from "@/lib/judge0-wrapper"
import { NextResponse } from "next/server"

// Handle GET requests (for preview/testing)
export async function GET() {
  return NextResponse.json(
    {
      message: "This endpoint requires a POST request with code, language, and stdin parameters",
      status: "ok",
      documentation: "Send a POST request with JSON body containing: { code: string, language: string, stdin: string }",
    },
    { status: 200 },
  )
}

// Handle POST requests (for code execution)
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json().catch((error) => {
      console.error("Error parsing request body:", error)
      return null
    })

    // Check if body was parsed successfully
    if (!body) {
      return NextResponse.json({ error: "Invalid request body. JSON parsing failed." }, { status: 400 })
    }

    const { code, language, stdin } = body

    // Validate required parameters
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    if (!language) {
      return NextResponse.json({ error: "Language is required" }, { status: 400 })
    }

    // Log the execution attempt for debugging
    console.log(`Executing ${language} code with Judge0...`)
    console.log(`Input: ${stdin || "None provided"}`)

    // Execute code using Judge0 API with language adapter
    const result = await executeCodeWithAdapter(code, language, stdin || "")

    // Log the result for debugging
    console.log("Judge0 execution result:", {
      status: result.status,
      hasStdout: !!result.stdout,
      hasStderr: !!result.stderr,
      hasCompileOutput: !!result.compile_output,
      processedOutput: result.processedOutput,
    })

    // If there's no processed output but there is stdout, use that
    if (!result.processedOutput && result.stdout) {
      result.processedOutput = result.stdout.trim()
    }

    // If there's still no output but there's an error, use that
    if (!result.processedOutput && (result.stderr || result.compile_output)) {
      result.processedOutput = result.stderr || result.compile_output
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error executing code:", error)

    // Return a detailed error response
    return NextResponse.json(
      {
        error: "Failed to execute code",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
