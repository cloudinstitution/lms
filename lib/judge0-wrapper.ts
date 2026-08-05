/**
 * Judge0 API wrapper with language adapters
 */

// Judge0 API configuration - using environment variables for security
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com"
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "your-api-key-here"
const JUDGE0_API_HOST = "judge0-ce.p.rapidapi.com"

// Language IDs for Judge0 API
export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, // JavaScript (Node.js 12.14.0)
  typescript: 74, // TypeScript (4.2.3)
  python: 71, // Python (3.8.1)
  java: 62, // Java (OpenJDK 13.0.1)
  cpp: 54, // C++ (GCC 9.2.0)
  csharp: 51, // C# (Mono 6.6.0.161)
  php: 68, // PHP (7.4.1)
  ruby: 72, // Ruby (2.7.0)
  go: 60, // Go (1.13.5)
  rust: 73, // Rust (1.40.0)
}

// Language adapters for code preparation and output parsing
interface LanguageAdapter {
  prepareCode: (code: string, input: string) => string
  parseOutput: (output: string) => string
}

const adapters: Record<string, LanguageAdapter> = {
  javascript: {
    prepareCode: (code: string, input: string) => {
      // Parse the input to extract function name and arguments
      const match = input.match(/(\w+)$$(.*)$$/)
      if (!match) {
        console.warn("Input format not recognized, using default wrapper")
        return code
      }

      const [_, functionName, argsString] = match
      const args = argsString.split(",").map((arg) => arg.trim())

      // Create a wrapper that directly calls the function with the extracted arguments
      const solutionWrapper = `
${code}

// Test the function with the provided input
const result = ${functionName}(${args.join(", ")});
console.log(result);
`
      return solutionWrapper
    },
    parseOutput: (output: string) => output.trim(),
  },

  python: {
    prepareCode: (code: string, input: string) => {
      // Similar approach for Python
      const match = input.match(/(\w+)$$(.*)$$/)
      if (!match) {
        return `
def solution(input_str):
    ${code.split("\n").join("\n    ")}

# Read input and call solution
input_str = """${input.replace(/"/g, '\\"')}"""
print(solution(input_str))`
      }

      const [_, functionName, argsString] = match
      const args = argsString.split(",").map((arg) => arg.trim())

      return `
${code}

# Test the function with the provided input
result = ${functionName}(${args.join(", ")})
print(result)
`
    },
    parseOutput: (output: string) => output.trim(),
  },

  java: {
    prepareCode: (code: string, input: string) => {
      if (!code.includes("class Main")) {
        code = `
public class Main {
    ${code}
    
    public static void main(String[] args) {
        String input = "${input.replace(/"/g, '\\"')}";
        System.out.println(solution(input));
    }
}`
      }

      return code
    },
    parseOutput: (output: string) => output.trim(),
  },

  cpp: {
    prepareCode: (code: string, input: string) => {
      if (!code.includes("int main")) {
        return `
#include <iostream>
#include <string>

int main() {
    std::string input = "${input.replace(/"/g, '\\"')}";
    std::cout << solution(input) << std::endl;
    return 0;
}

${code}`
      }

      return code
    },
    parseOutput: (output: string) => output.trim(),
  },
}

// Default adapter for languages without specific handling
const defaultAdapter: LanguageAdapter = {
  prepareCode: (code: string) => code,
  parseOutput: (output: string) => output.trim(),
}

// Get language adapter for a specific language
export function getLanguageAdapter(language: string): LanguageAdapter {
  const normalizedLanguage = language.toLowerCase()
  return adapters[normalizedLanguage] || defaultAdapter
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

// Execute code with Judge0 API
export const executeCode = async (code: string, language: string, stdin = ""): Promise<any> => {
  try {
    const languageId = getLanguageId(language)
    console.log(`Executing code with language ID: ${languageId}`)

    const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`, {
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
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to execute code: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log("Raw Judge0 result:", result)

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

// Execute code with language adapter
export const executeCodeWithAdapter = async (code: string, language: string, stdin = ""): Promise<any> => {
  try {
    const adapter = getLanguageAdapter(language)

    const preparedCode = adapter.prepareCode(code, stdin)
    console.log("Prepared code:", preparedCode)

    const result = await executeCode(preparedCode, language, stdin)

    if (result.stdout) {
      result.processedOutput = adapter.parseOutput(result.stdout)
    }

    return result
  } catch (error) {
    console.error("Error executing code with adapter:", error)
    return {
      status: { description: "Error" },
      stderr: error instanceof Error ? error.message : String(error),
      processedOutput: error instanceof Error ? error.message : String(error),
    }
  }
}

// Format execution result for display
export const formatExecutionResult = (result: any): string => {
  if (!result) return "No result"

  let output = ""

  if (result.status) {
    output += `Status: ${result.status.description}\n\n`
  }

  if (result.stdout) {
    output += `Output:\n${result.stdout}\n\n`
  }

  if (result.compile_output) {
    output += `Compilation Error:\n${result.compile_output}\n\n`
  }

  if (result.stderr) {
    output += `Error:\n${result.stderr}\n\n`
  }

  if (result.time) {
    output += `Execution Time: ${result.time}s\n`
  }

  if (result.memory) {
    output += `Memory Used: ${Math.round(result.memory / 1024)} KB\n`
  }

  return output.trim()
}
