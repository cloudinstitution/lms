import { NextResponse } from "next/server"

// Mock database for content (lectures, assignments, quizzes)
const content = {
  lectures: [
    {
      id: 1,
      title: "Introduction to Web Development",
      courseId: 1,
      type: "Video",
      duration: "45 mins",
      url: "/videos/intro-web-dev.mp4",
    },
    {
      id: 2,
      title: "HTML Fundamentals",
      courseId: 1,
      type: "Video",
      duration: "60 mins",
      url: "/videos/html-fundamentals.mp4",
    },
    {
      id: 3,
      title: "CSS Styling Basics",
      courseId: 1,
      type: "Video",
      duration: "55 mins",
      url: "/videos/css-basics.mp4",
    },
    {
      id: 4,
      title: "JavaScript Essentials",
      courseId: 1,
      type: "Video",
      duration: "75 mins",
      url: "/videos/js-essentials.mp4",
    },
    {
      id: 5,
      title: "Introduction to React",
      courseId: 1,
      type: "Video",
      duration: "65 mins",
      url: "/videos/intro-react.mp4",
    },
    {
      id: 6,
      title: "Python Basics",
      courseId: 2,
      type: "Video",
      duration: "50 mins",
      url: "/videos/python-basics.mp4",
    },
    {
      id: 7,
      title: "Data Analysis with Pandas",
      courseId: 2,
      type: "Video",
      duration: "70 mins",
      url: "/videos/pandas-analysis.mp4",
    },
    {
      id: 8,
      title: "Introduction to Machine Learning",
      courseId: 2,
      type: "Video",
      duration: "80 mins",
      url: "/videos/intro-ml.mp4",
    },
  ],

  assignments: [
    {
      id: 1,
      title: "HTML Portfolio Project",
      courseId: 1,
      dueDate: "15 May 2023",
      points: 100,
      description: "Create a personal portfolio website using HTML and CSS.",
    },
    {
      id: 2,
      title: "CSS Styling Challenge",
      courseId: 1,
      dueDate: "22 May 2023",
      points: 150,
      description: "Implement advanced CSS styling techniques on a provided template.",
    },
    {
      id: 3,
      title: "JavaScript Mini-Project",
      courseId: 1,
      dueDate: "1 June 2023",
      points: 200,
      description: "Build a simple interactive web application using JavaScript.",
    },
    {
      id: 4,
      title: "React Component Library",
      courseId: 1,
      dueDate: "15 June 2023",
      points: 250,
      description: "Create a reusable component library in React.",
    },
    {
      id: 5,
      title: "Data Analysis Project",
      courseId: 2,
      dueDate: "20 May 2023",
      points: 200,
      description: "Analyze a provided dataset and create visualizations.",
    },
    {
      id: 6,
      title: "Machine Learning Model",
      courseId: 2,
      dueDate: "10 June 2023",
      points: 300,
      description: "Build and train a machine learning model for a classification problem.",
    },
  ],

  quizzes: [
    { id: 1, title: "HTML & CSS Quiz", courseId: 1, questions: 20, timeLimit: "30 mins", totalPoints: 100 },
    { id: 2, title: "JavaScript Fundamentals", courseId: 1, questions: 25, timeLimit: "45 mins", totalPoints: 125 },
    { id: 3, title: "React Concepts", courseId: 1, questions: 30, timeLimit: "60 mins", totalPoints: 150 },
    { id: 4, title: "Python Basics Quiz", courseId: 2, questions: 20, timeLimit: "30 mins", totalPoints: 100 },
    { id: 5, title: "Data Analysis Concepts", courseId: 2, questions: 25, timeLimit: "45 mins", totalPoints: 125 },
  ],
}

export async function GET(request: Request) {
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "lectures"
  const courseId = searchParams.get("courseId")
  const id = searchParams.get("id")

  // Validate content type
  if (!["lectures", "assignments", "quizzes"].includes(type)) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
  }

  // Return a specific content item by ID
  if (id) {
    const item = content[type as keyof typeof content].find((item: any) => item.id === Number.parseInt(id))
    if (item) {
      return NextResponse.json(item)
    } else {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }
  }

  // Filter content by course ID
  if (courseId) {
    const filteredContent = content[type as keyof typeof content].filter(
      (item: any) => item.courseId === Number.parseInt(courseId),
    )
    return NextResponse.json(filteredContent)
  }

  // Return all content of the specified type
  return NextResponse.json(content[type as keyof typeof content])
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type } = body

    // Validate content type
    if (!type || !["lectures", "assignments", "quizzes"].includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid or missing content type" }, { status: 400 })
    }

    // Validate required fields based on content type
    if (type === "lectures" && (!body.title || !body.courseId || !body.duration)) {
      return NextResponse.json({ success: false, message: "Missing required fields for lecture" }, { status: 400 })
    } else if (type === "assignments" && (!body.title || !body.courseId || !body.dueDate || !body.points)) {
      return NextResponse.json({ success: false, message: "Missing required fields for assignment" }, { status: 400 })
    } else if (type === "quizzes" && (!body.title || !body.courseId || !body.questions || !body.timeLimit)) {
      return NextResponse.json({ success: false, message: "Missing required fields for quiz" }, { status: 400 })
    }

    // In a real app, you would save to a database
    // For this example, we'll just return the created content with an ID
    const contentArray = content[type as keyof typeof content] as any[]
    const newContent = {
      id: contentArray.length + 1,
      ...body,
    }

    return NextResponse.json({ success: true, content: newContent })
  } catch (error) {
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
