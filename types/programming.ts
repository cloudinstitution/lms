export interface TestCase {
  input: string
  expectedOutput: string
}

export interface TestResult {
  testCase: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  error?: string
}

export interface Submission {
  id: string
  taskId: string
  studentId: string
  studentName: string
  code: string
  submittedAt: string
  status: "pending" | "approved" | "rejected"
  testResults?: {
    passed: boolean
    passedTests: number
    totalTests: number
    results: TestResult[]
  }
  feedback?: string
}

export interface ProgrammingTask {
  id: string
  title: string
  description: string
  language: string
  testCases: TestCase[]
  submissions: Submission[]
  difficulty: string
  dueDate: string
  starterCode: string
  createdAt: string
}

export interface TaskSubmissionsPageProps {
  params: {
    taskId: string
  }
}

export interface SubmissionDetailsPageProps {
  params: {
    taskId: string
    submissionId: string
  }
}
