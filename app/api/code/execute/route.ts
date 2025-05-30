import { NextResponse } from "next/server"
import { executeCode, formatExecutionResult } from "@/lib/judge0"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, language, input } = body

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 })
    }

    const result = await executeCode(code, language, input)
    const formattedResult = formatExecutionResult(result)

    return NextResponse.json({ result: formattedResult })
  } catch (error) {
    console.error("Error executing code:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to execute code",
      },
      { status: 500 },
    )
  }
}
