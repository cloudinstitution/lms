export interface Student {
  id: string
  name: string
  username: string // email
  password: string
  phoneNumber: string  
  courseID: number[] // Array of course IDs
  courseName: string[] // Array of course names
  coursesEnrolled: number // Total number of courses enrolled
  studentId: string
  joinedDate: string
  status?: "Active" | "Inactive"
}

export type SortField = keyof Pick<Student, "name" | "username" | "phoneNumber" | "studentId" | "coursesEnrolled" | "joinedDate">
export type SortOrder = "asc" | "desc"

export interface FilterOptions {
  status: string[]
  dateRange: {
    from: Date | null
    to: Date | null
  }
  coursesEnrolled?: number
  courseName?: string
  courseID?: number
}

export interface PaginationState {
  currentPage: number
  itemsPerPage: number
}

export interface FilterState extends FilterOptions {
  search: string
}
