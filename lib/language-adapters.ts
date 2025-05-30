// This file contains adapters for different programming languages
// to properly format code for execution and parse outputs

interface LanguageAdapter {
  prepareCode: (code: string, input: string) => string
  parseOutput: (output: string) => string
}

const adapters: Record<string, LanguageAdapter> = {
  javascript: {
    prepareCode: (code: string, input: string) => {
      // Wrap code in a module that reads input and calls the solution function
      return `
        ${code}
        
        // Read input and call solution
        const input = \`${input.replace(/`/g, "\\`")}\`;
        console.log(solution(input));
      `
    },
    parseOutput: (output: string) => {
      // Clean up output (remove trailing newlines, etc.)
      return output.trim()
    },
  },

  python: {
    prepareCode: (code: string, input: string) => {
      // For Python, we can just pass the input as stdin
      return code
    },
    parseOutput: (output: string) => {
      return output.trim()
    },
  },

  java: {
    prepareCode: (code: string, input: string) => {
      // For Java, we need to ensure the class is named Main for Judge0
      const mainClass = code.includes("class Main") ? code : code.replace(/class\s+(\w+)/, "class Main")

      // Add code to read input and call solution
      if (!mainClass.includes("public static void main")) {
        return `
          ${mainClass}
          
          public static void main(String[] args) {
            String input = "${input.replace(/"/g, '\\"')}";
            System.out.println(Solution.solution(input));
          }
        `
      }

      return mainClass
    },
    parseOutput: (output: string) => {
      return output.trim()
    },
  },

  cpp: {
    prepareCode: (code: string, input: string) => {
      // For C++, add main function if not present
      if (!code.includes("int main")) {
        return `
          ${code}
          
          #include <iostream>
          #include <string>
          
          int main() {
            std::string input = "${input.replace(/"/g, '\\"')}";
            std::cout << solution(input) << std::endl;
            return 0;
          }
        `
      }

      return code
    },
    parseOutput: (output: string) => {
      return output.trim()
    },
  },
}

// Default adapter for languages without specific handling
const defaultAdapter: LanguageAdapter = {
  prepareCode: (code: string) => code,
  parseOutput: (output: string) => output.trim(),
}

export function getLanguageAdapter(language: string): LanguageAdapter {
  const normalizedLanguage = language.toLowerCase()
  return adapters[normalizedLanguage] || defaultAdapter
}
