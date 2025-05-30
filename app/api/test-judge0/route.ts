import { NextResponse } from "next/server"

// This endpoint is used to check if the Judge0 API is available
export async function GET() {
  const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com"
  const JUDGE0_API_KEY = "07f2f64360mshd61de342a5548dcp134f99jsn1beeaecd0bcd"
  const JUDGE0_API_HOST = "judge0-ce.p.rapidapi.com"

  try {
    // Try to fetch languages from Judge0 API to check if it's available
    const response = await fetch(`${JUDGE0_API_URL}/languages`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": JUDGE0_API_HOST,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          error: `Judge0 API returned status ${response.status}: ${response.statusText}`,
        },
        { status: 200 },
      )
    }

    // API is available
    return NextResponse.json(
      {
        status: "ok",
        message: "Judge0 API is available and configured correctly",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error checking Judge0 API:", error)

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 },
    )
  }
}
