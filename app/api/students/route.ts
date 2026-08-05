import { NextResponse } from "next/server"

// Mock database for students
const students = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 9876543210",
    enrolledCourses: [
      { id: 1, title: "Full Stack Web Development", progress: 45 },
      { id: 2, title: "Data Science Fundamentals", progress: 20 },
    ],
    joinDate: "10 Jan 2023",
    status: "Active",
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: "+91 9876543211",
    enrolledCourses: [{ id: 1, title: "Full Stack Web Development", progress: 60 }],
    joinDate: "15 Jan 2023",
    status: "Active",
  },
  {
    id: 3,
    name: "Amit Kumar",
    email: "amit.kumar@example.com",
    phone: "+91 9876543212",
    enrolledCourses: [
      { id: 1, title: "Full Stack Web Development", progress: 75 },
      { id: 2, title: "Data Science Fundamentals", progress: 30 },
      { id: 3, title: "Cloud Computing & DevOps", progress: 15 },
    ],
    joinDate: "20 Jan 2023",
    status: "Active",
  },
]

export async function GET(request: Request) {
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  // Return a specific student by ID
  if (id) {
    const student = students.find((s) => s.id === Number.parseInt(id))
    if (student) {
      return NextResponse.json(student)
    } else {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }
  }

  // Return all students
  return NextResponse.json(students)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // In a real app, you would save to a database
    // For this example, we'll just return the created student with an ID
    const newStudent = {
      id: students.length + 1,
      ...body,
      enrolledCourses: body.enrolledCourses || [],
      joinDate: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
      status: body.status || "Active",
    }

    return NextResponse.json({ success: true, student: newStudent })
  } catch (error) {
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
