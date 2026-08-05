import { NextResponse } from "next/server"

// Mock database for courses
const courses = [
  {
    id: 1,
    title: "Full Stack Web Development",
    description: "Master frontend and backend technologies to build complete web applications",
    category: "web",
    price: "₹49,999",
    duration: "16 weeks",
    level: "Intermediate",
    students: 1240,
    status: "Active",
    instructor: "Rahul Sharma",
    modules: [
      { id: 1, title: "HTML & CSS Fundamentals", lessons: 8 },
      { id: 2, title: "JavaScript Essentials", lessons: 10 },
      { id: 3, title: "React Frontend Development", lessons: 12 },
      { id: 4, title: "Node.js Backend Development", lessons: 10 },
      { id: 5, title: "Database Integration", lessons: 8 },
      { id: 6, title: "Authentication & Authorization", lessons: 6 },
      { id: 7, title: "Deployment & DevOps", lessons: 5 },
    ],
  },
  {
    id: 2,
    title: "Data Science Fundamentals",
    description: "Learn data analysis, visualization and machine learning techniques",
    category: "data",
    price: "₹39,999",
    duration: "12 weeks",
    level: "Beginner",
    students: 980,
    status: "Active",
    instructor: "Priya Patel",
    modules: [
      { id: 1, title: "Introduction to Python", lessons: 8 },
      { id: 2, title: "Data Analysis with Pandas", lessons: 10 },
      { id: 3, title: "Data Visualization", lessons: 8 },
      { id: 4, title: "Statistical Analysis", lessons: 6 },
      { id: 5, title: "Machine Learning Basics", lessons: 12 },
      { id: 6, title: "Supervised Learning", lessons: 8 },
      { id: 7, title: "Unsupervised Learning", lessons: 6 },
    ],
  },
  {
    id: 3,
    title: "Cloud Computing & DevOps",
    description: "Deploy and manage applications in cloud environments with CI/CD pipelines",
    category: "cloud",
    price: "₹54,999",
    duration: "14 weeks",
    level: "Advanced",
    students: 760,
    status: "Active",
    instructor: "Amit Kumar",
    modules: [
      { id: 1, title: "Introduction to Cloud Computing", lessons: 6 },
      { id: 2, title: "AWS Fundamentals", lessons: 10 },
      { id: 3, title: "Infrastructure as Code", lessons: 8 },
      { id: 4, title: "Containerization with Docker", lessons: 8 },
      { id: 5, title: "Kubernetes Orchestration", lessons: 10 },
      { id: 6, title: "CI/CD Pipelines", lessons: 8 },
      { id: 7, title: "Monitoring & Logging", lessons: 6 },
    ],
  },
]

export async function GET(request: Request) {
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const id = searchParams.get("id")

  // Return a specific course by ID
  if (id) {
    const course = courses.find((c) => c.id === Number.parseInt(id))
    if (course) {
      return NextResponse.json(course)
    } else {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
  }

  // Filter courses by category
  if (category && category !== "all") {
    const filteredCourses = courses.filter((course) => course.category === category)
    return NextResponse.json(filteredCourses)
  }

  // Return all courses
  return NextResponse.json(courses)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.description || !body.category || !body.price || !body.duration) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // In a real app, you would save to a database
    // For this example, we'll just return the created course with an ID
    const newCourse = {
      id: courses.length + 1,
      ...body,
      students: 0,
      status: body.status || "Draft",
      modules: [],
    }

    return NextResponse.json({ success: true, course: newCourse })
  } catch (error) {
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
