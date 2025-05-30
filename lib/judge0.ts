/**
 * Judge0 API service for secure code execution
 *
 * This service uses the Judge0 API to execute code securely in a sandboxed environment.
 * Learn more about Judge0 at https://judge0.com/
 */

// Judge0 API base URL - replace with your Judge0 instance URL or use the public API
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com"
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || ""
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com"

// Ensure API key is provided
if (!JUDGE0_API_KEY) {
  console.warn("Judge0 API key is missing. Code execution will fail.")
}

// Language IDs for Judge0 API
// Full list: https://ce.judge0.com/languages/
export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, // JavaScript (Node.js 12.14.0)
  python: 71, // Python (3.8.1)
  java: 62, // Java (OpenJDK 13.0.1)
  cpp: 54, // C++ (GCC 9.2.0)
  csharp: 51, // C# (Mono 6.6.0.161)
  php: 68, // PHP (7.4.1)
  ruby: 72, // Ruby (2.7.0)
  go: 60, // Go (1.13.5)
  rust: 73, // Rust (1.40.0)
}

// Convert language name to Judge0 language ID
export const getLanguageId = (language: string): number => {
  const languageId = LANGUAGE_IDS[language.toLowerCase()]
  if (!languageId) {
    console.warn(`Language '${language}' not found, defaulting to JavaScript`)
    return 63 // Default to JavaScript if not found
  }
  return languageId
}

// Submit code for execution
export const executeCode = async (code: string, language: string, stdin = ""): Promise<any> => {
  try {
    if (!JUDGE0_API_KEY) {
      throw new Error("Judge0 API key is missing. Please set the JUDGE0_API_KEY environment variable.")
    }

    const languageId = getLanguageId(language)
    console.log(`Executing code with language ID: ${languageId}`)

    // Create submission
    const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": JUDGE0_API_HOST,
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: btoa(code),
        stdin: stdin ? btoa(stdin) : "",
        wait: true, // Wait for the result instead of polling
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to execute code: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()

    // Decode the base64 encoded output
    if (result.stdout) {
      result.stdout = atob(result.stdout)
    }
    if (result.stderr) {
      result.stderr = atob(result.stderr)
    }
    if (result.compile_output) {
      result.compile_output = atob(result.compile_output)
    }

    return result
  } catch (error) {
    console.error("Error executing code:", error)
    return {
      status: { description: "Error" },
      stderr: error instanceof Error ? error.message : String(error),
    }
  }
}

// Format execution result for display
export const formatExecutionResult = (result: any): string => {
  if (!result) return "No result"

  let output = ""

  // Add status
  if (result.status) {
    output += `Status: ${result.status.description}\n\n`
  }

  // Add stdout if available
  if (result.stdout) {
    output += `Output:\n${result.stdout}\n\n`
  }

  // Add compile errors if available
  if (result.compile_output) {
    output += `Compilation Error:\n${result.compile_output}\n\n`
  }

  // Add runtime errors if available
  if (result.stderr) {
    output += `Error:\n${result.stderr}\n\n`
  }

  // Add execution time and memory if available
  if (result.time) {
    output += `Execution Time: ${result.time}s\n`
  }

  if (result.memory) {
    output += `Memory Used: ${Math.round(result.memory / 1024)} KB\n`
  }

  return output.trim()
}
