import { NextResponse } from "next/server"
import { executeCode, formatExecutionResult } from "@/lib/judge0"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, language, testCases, expectedOutputs } = body

    if (!code || !language || !testCases || !expectedOutputs) {
      return NextResponse.json(
        { error: "Code, language, testCases, and expectedOutputs are required" },
        { status: 400 },
      )
    }

    if (!Array.isArray(testCases) || !Array.isArray(expectedOutputs)) {
      return NextResponse.json({ error: "testCases and expectedOutputs must be arrays" }, { status: 400 })
    }

    if (testCases.length !== expectedOutputs.length) {
      return NextResponse.json({ error: "testCases and expectedOutputs must have the same length" }, { status: 400 })
    }

    // Run each test case
    const results = await Promise.all(
      testCases.map(async (testCase, index) => {
        const result = await executeCode(code, language, testCase)
        const formattedResult = formatExecutionResult(result)
        const passed = formattedResult.trim() === expectedOutputs[index].trim()
        return { result: formattedResult, passed }
      }),
    )

    return NextResponse.json({
      results: results,
      success: results.every((r) => r.passed),
    })
  } catch (error) {
    console.error("Error validating code:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to validate code",
      },
      { status: 500 },
    )
  }
}
