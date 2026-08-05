"use client"

import MainLayout from "@/components/main-layout"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import "@/styles/phone-input.css"
import {
  Award,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  Globe,
  Home,
  MessageSquare,
  PlayCircle,
  Star,
  TrendingUp,
  Users,
  X
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { toast } from "sonner"

// Google Sheets URL for enrollment data submission
const GOOGLE_SHEETS_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;

// Function to submit enrollment data to Google Sheets
const submitToGoogleSheets = async (enrollmentData: any, courseTitle: string) => {
  // Check if Google Sheets URL is configured
  if (!GOOGLE_SHEETS_URL) {
    console.error('Google Sheets URL not configured. Please set NEXT_PUBLIC_GOOGLE_SHEETS_URL in your environment variables.')
    return {
      success: false,
      error: 'Google Sheets integration not configured. Please contact support.',
      details: {
        message: 'NEXT_PUBLIC_GOOGLE_SHEETS_URL environment variable is not set'
      }
    }
  }

  console.log('=== SUBMITTING TO GOOGLE SHEETS ===')
  console.log('Enrollment data:', enrollmentData)
  console.log('Course title:', courseTitle)
  console.log('Apps Script URL:', GOOGLE_SHEETS_URL)
  
  // Prepare data object with all required fields
  const submissionData = {
    firstName: enrollmentData.firstName || '',
    lastName: enrollmentData.lastName || '',
    email: enrollmentData.email || '',
    phone: enrollmentData.phone || '',
    city: enrollmentData.city || '',
    currentEducation: enrollmentData.currentEducation || '',
    experience: enrollmentData.experience || '',
    motivation: enrollmentData.motivation || '',
    preferredStartDate: enrollmentData.preferredStartDate || '',
    paymentMethod: enrollmentData.paymentMethod || '',
    courseTitle: courseTitle || '',
    enrollmentDate: new Date().toLocaleString(),
    testSubmission: 'false'
  }
  
  console.log('Prepared submission data:', submissionData)
  
  // Method 1: Try FormData POST (most compatible with Apps Script)
  try {
    console.log('Method 1: Trying FormData POST...')
    
    const formData = new FormData()
    Object.entries(submissionData).forEach(([key, value]) => {
      formData.append(key, String(value))
      console.log(`Added to FormData: ${key} = ${value}`)
    })
    
    console.log('FormData prepared, sending request...')
    
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors', // Required to bypass CORS
      body: formData
    })
    
    console.log('FormData POST completed (no-cors mode)')
    console.log('Response type:', response.type)
    console.log('Response redirected:', response.redirected)
    
    // Wait for the data to be processed
    console.log('Waiting 3 seconds for data processing...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('FormData submission completed successfully')
    return { 
      success: true, 
      data: 'Data submitted successfully via FormData. Please check the Google Sheet to verify the data was saved.',
      method: 'FormData POST',
      note: 'Due to CORS restrictions, we cannot verify the response. Please check your Google Sheet.'
    }
    
  } catch (error) {
    console.error('Method 1 (FormData POST) failed:', error)
    
    // Method 2: Try GET with data parameter as fallback
    try {
      console.log('Method 2: Trying GET with data parameter...')
      
      // Simplify data for GET request to avoid URL length issues
      const simpleData = {
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        email: submissionData.email,
        phone: submissionData.phone,
        courseTitle: submissionData.courseTitle,
        timestamp: new Date().toISOString()
      }
      
      const params = new URLSearchParams({
        data: JSON.stringify(simpleData)
      })
      
      const getUrl = GOOGLE_SHEETS_URL + '?' + params.toString()
      console.log('GET URL length:', getUrl.length)
      console.log('GET URL preview:', getUrl.substring(0, 200) + '...')
      
      if (getUrl.length > 2000) {
        console.warn('URL is very long, might be truncated by some browsers')
      }
      
      const response = await fetch(getUrl, {
        method: 'GET',
        mode: 'no-cors'
      })
      
      console.log('GET request completed')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      return { 
        success: true, 
        data: 'Data submitted successfully via GET method. Please check the Google Sheet.',
        method: 'GET with data parameter',
        note: 'Simplified data was sent due to URL length restrictions.'
      }
      
    } catch (getError) {
      console.error('Method 2 (GET) also failed:', getError)
      
      // Return error with helpful debugging info
      return { 
        success: false, 
        error: 'All submission methods failed. Please check the troubleshooting steps.',
        details: {
          formDataError: error instanceof Error ? error.message : String(error),
          getError: getError instanceof Error ? getError.message : String(getError),
          appScriptUrl: GOOGLE_SHEETS_URL,
          dataKeys: Object.keys(submissionData),
          troubleshooting: 'Check Google Apps Script logs and ensure the script is deployed correctly.'
        }
      }
    }
  }
}

// Mapping of slugs to course IDs for the featured courses
const slugToCourseMapping: { [key: string]: number } = {
  "aws-certificate-training": 3,
  "azure-certificate-training": 4, 
  "google-cloud-certification": 5,
  "python-full-stack-training": 2,
  "java-full-stack-training": 1,
  "ui-ux-design-training": 6,
  "data-analytics-training": 8,
  "devops": 7,
  "multi-cloud": 5,
  "multi-cloud-and-devops": 8,
  "aws": 3,
  "azure": 4,
  // Add more mappings as needed
}

// Course data - matching the courses from the main courses page
const coursesData = [
  {
    id: 1,
    title: "Java Full Stack Web Development",
    description: "Master frontend and backend technologies to build complete web applications using Java, Spring Boot, React, and modern development tools.",
    fullDescription: "This comprehensive Java Full Stack Web Development course is designed to take you from beginner to professional developer. You'll learn both frontend and backend technologies, database management, and deployment strategies. The course includes hands-on projects, real-world scenarios, and industry best practices.",
    duration: "24 weeks",
    level: "Intermediate",
    category: "Web & Application Development",
    price: "₹30000",
    originalPrice: "₹45000",
    students: 1240,
    rating: 4.8,
    instructor: {
      name: "Priya Sharma",
      bio: "Senior Full Stack Developer with 8+ years of experience at top tech companies. Expert in Java ecosystem and modern web technologies.",
      image: "/placeholder-user.jpg",
      experience: "8+ years"
    },
    skills: [
      "Java Programming",
      "Spring Boot Framework", 
      "React.js Development",
      "RESTful API Design",
      "Database Management",
      "Version Control (Git)",
      "Testing & Debugging",
      "Deployment & DevOps"
    ],
    curriculum: [
      {
        module: "Java Fundamentals",
        lessons: 12,
        duration: "3 weeks",
        topics: ["Object-Oriented Programming", "Data Structures", "Exception Handling", "Collections Framework"]
      },
      {
        module: "Spring Boot Backend",
        lessons: 15,
        duration: "4 weeks", 
        topics: ["Spring MVC", "Spring Data JPA", "Spring Security", "RESTful Services"]
      },
      {
        module: "Frontend with React",
        lessons: 10,
        duration: "3 weeks",
        topics: ["React Components", "State Management", "Hooks", "React Router"]
      },
      {
        module: "Database Integration",
        lessons: 8,
        duration: "2 weeks",
        topics: ["MySQL", "JPA/Hibernate", "Database Design", "Query Optimization"]
      },
      {
        module: "Full Stack Project",
        lessons: 6,
        duration: "2 weeks",
        topics: ["Project Planning", "Implementation", "Testing", "Deployment"]
      }
    ],
    image: "/Java.png",
    highlights: [
      "Live project experience",
      "Industry-standard tools",
      "Job placement assistance",
      "Certificate upon completion"
    ]
  },
  {
    id: 2,
    title: "Python Full Stack Web Development",
    description: "Build dynamic web applications using Python, Django, React, and REST APIs with comprehensive full-stack development skills.",
    fullDescription: "Master Python full-stack development from backend APIs to frontend frameworks. This course covers Django, Flask, React, database design, and deployment strategies. Perfect for aspiring web developers who want to build scalable applications.",
    duration: "24 weeks",
    level: "Beginner",
    category: "Web & Application Development", 
    price: "₹30000",
    originalPrice: "₹42000",
    students: 980,
    rating: 4.7,
    instructor: {
      name: "Rahul Gupta",
      bio: "Python expert with 10+ years in web development. Former lead developer at major fintech companies.",
      image: "/placeholder-user.jpg",
      experience: "10+ years"
    },
    skills: [
      "Python Programming",
      "Django Framework",
      "React.js Frontend",
      "REST API Development", 
      "PostgreSQL Database",
      "Git Version Control",
      "AWS Deployment",
      "Testing Frameworks"
    ],
    curriculum: [
      {
        module: "Python Fundamentals",
        lessons: 10,
        duration: "3 weeks",
        topics: ["Python Syntax", "Data Structures", "Functions", "OOP Concepts"]
      },
      {
        module: "Django Backend",
        lessons: 14,
        duration: "4 weeks",
        topics: ["Django Models", "Views & Templates", "Authentication", "REST Framework"]
      },
      {
        module: "React Frontend",
        lessons: 12,
        duration: "3 weeks", 
        topics: ["Components", "State Management", "API Integration", "Routing"]
      },
      {
        module: "Database & APIs",
        lessons: 8,
        duration: "2 weeks",
        topics: ["PostgreSQL", "Database Design", "API Development", "Authentication"]
      }
    ],
    image: "/Java.png",
    highlights: [
      "Real-world projects",
      "Modern development tools",
      "Career guidance",
      "Industry certification"
    ]
  },
  {
    id: 3,
    title: "AWS",
    description: "Deploy and manage applications in cloud environments with CI/CD pipelines using Amazon Web Services.",
    fullDescription: "Comprehensive AWS training covering core services, architecture design, security, and best practices. Learn to deploy scalable applications, manage infrastructure, and implement DevOps practices in the cloud.",
    duration: "6 weeks",
    level: "Advanced", 
    category: "Cloud Computing",
    price: "₹20000",
    originalPrice: "₹28000",
    students: 760,
    rating: 4.9,
    instructor: {
      name: "Amit Kumar",
      bio: "AWS Solutions Architect with 12+ years experience. Certified in multiple AWS services and cloud architecture.",
      image: "/placeholder-user.jpg",
      experience: "12+ years"
    },
    skills: [
      "AWS Core Services",
      "EC2 & VPC",
      "S3 & CloudFront",
      "RDS & DynamoDB",
      "Lambda Functions",
      "CloudFormation",
      "Security & IAM",
      "Monitoring & Logging"
    ],
    curriculum: [
      {
        module: "AWS Fundamentals",
        lessons: 8,
        duration: "1 week",
        topics: ["AWS Console", "Core Services", "Pricing", "Security Basics"]
      },
      {
        module: "Compute & Storage",
        lessons: 10,
        duration: "2 weeks",
        topics: ["EC2 Instances", "S3 Storage", "EBS Volumes", "Load Balancers"]
      },
      {
        module: "Database & Networking",
        lessons: 8,
        duration: "1 week", 
        topics: ["RDS", "DynamoDB", "VPC", "Route 53"]
      },
      {
        module: "Advanced Services",
        lessons: 12,
        duration: "2 weeks",
        topics: ["Lambda", "API Gateway", "CloudFormation", "Monitoring"]
      }
    ],
    image: "/AWS.png",
    highlights: [
      "AWS certification prep",
      "Hands-on labs",
      "Real cloud projects",
      "Expert mentorship"
    ]
  },
  {
    id: 4,
    title: "Azure",
    description: "Learn to architect, deploy, and manage services using Microsoft Azure cloud platform with hands-on experience.",
    fullDescription: "Master Microsoft Azure cloud services with comprehensive training in compute, storage, networking, and security. Learn to design and implement scalable cloud solutions for enterprise applications.",
    duration: "6 weeks",
    level: "Intermediate",
    category: "Cloud Computing",
    price: "₹20000",
    originalPrice: "₹28000",
    students: 620,
    rating: 4.7,
    instructor: {
      name: "Sandeep Verma",
      bio: "Microsoft Certified Azure Solutions Architect with 10+ years experience in cloud architecture and enterprise solutions.",
      image: "/placeholder-user.jpg",
      experience: "10+ years"
    },
    skills: [
      "Azure Core Services",
      "Virtual Machines & Networking",
      "Azure Storage Solutions",
      "App Services & Functions",
      "Azure DevOps",
      "Security & Identity",
      "Monitoring & Analytics",
      "Cost Management"
    ],
    curriculum: [
      {
        module: "Azure Fundamentals",
        lessons: 8,
        duration: "1 week",
        topics: ["Azure Portal", "Core Services", "Pricing", "Management Groups"]
      },
      {
        module: "Compute & Networking",
        lessons: 10,
        duration: "2 weeks",
        topics: ["Virtual Machines", "Load Balancers", "VNets", "Azure Functions"]
      },
      {
        module: "Storage & Databases",
        lessons: 8,
        duration: "1 week",
        topics: ["Blob Storage", "SQL Database", "Cosmos DB", "Data Factory"]
      },
      {
        module: "DevOps & Security",
        lessons: 12,
        duration: "2 weeks",
        topics: ["Azure DevOps", "Key Vault", "Active Directory", "Monitoring"]
      }
    ],
    image: "/Azure.png",
    highlights: [
      "Azure certification prep",
      "Real-world scenarios",
      "Enterprise solutions",
      "Industry mentorship"
    ]
  },
  {
    id: 5,
    title: "Multi-cloud",
    description: "Understand and work with multiple cloud platforms like AWS, Azure, and GCP for hybrid cloud solutions.",
    fullDescription: "Comprehensive multi-cloud training covering AWS, Azure, and Google Cloud Platform. Learn to design and manage hybrid cloud architectures, implement cross-cloud strategies, and optimize costs across multiple cloud providers.",
    duration: "24 weeks",
    level: "Intermediate",
    category: "Cloud Computing",
    price: "₹35000",
    originalPrice: "₹50000",
    students: 1450,
    rating: 4.8,
    instructor: {
      name: "Rajesh Patel",
      bio: "Multi-cloud architect with certifications in AWS, Azure, and GCP. 15+ years experience in enterprise cloud solutions.",
      image: "/placeholder-user.jpg",
      experience: "15+ years"
    },
    skills: [
      "Multi-cloud Architecture",
      "AWS Services",
      "Azure Services", 
      "Google Cloud Platform",
      "Hybrid Cloud Design",
      "Cloud Migration",
      "Cost Optimization",
      "Security Best Practices"
    ],
    curriculum: [
      {
        module: "Multi-cloud Fundamentals",
        lessons: 10,
        duration: "3 weeks",
        topics: ["Cloud Comparison", "Architecture Patterns", "Cost Models", "Security"]
      },
      {
        module: "AWS Deep Dive",
        lessons: 15,
        duration: "6 weeks",
        topics: ["Core Services", "Advanced Features", "Best Practices", "Certification Prep"]
      },
      {
        module: "Azure Integration",
        lessons: 12,
        duration: "4 weeks",
        topics: ["Azure Services", "Hybrid Solutions", "AD Integration", "DevOps"]
      },
      {
        module: "GCP & Strategy",
        lessons: 10,
        duration: "3 weeks",
        topics: ["GCP Services", "Multi-cloud Strategy", "Migration Planning", "Optimization"]
      }
    ],
    image: "/DevOps.png",
    highlights: [
      "Triple cloud certification",
      "Hybrid architecture design",
      "Cost optimization strategies",
      "Enterprise case studies"
    ]
  },
  {
    id: 7,
    title: "DevOps",
    description: "Learn CI/CD, containerization, automation, and monitoring in real-world DevOps pipelines for modern software delivery.",
    fullDescription: "Comprehensive DevOps training covering the entire software delivery lifecycle. Learn Docker, Kubernetes, Jenkins, Git, monitoring tools, and infrastructure as code to implement robust CI/CD pipelines.",
    duration: "6 weeks",
    level: "Advanced",
    category: "DevOps & Automation",
    price: "₹20000",
    originalPrice: "₹30000",
    students: 540,
    rating: 4.9,
    instructor: {
      name: "Vikash Singh",
      bio: "DevOps Engineer with 12+ years in automation and cloud infrastructure. Expert in containerization and CI/CD pipeline design.",
      image: "/placeholder-user.jpg",
      experience: "12+ years"
    },
    skills: [
      "Docker Containerization",
      "Kubernetes Orchestration",
      "Jenkins CI/CD",
      "Git Version Control",
      "Infrastructure as Code",
      "Monitoring & Logging",
      "Cloud Deployment",
      "Security Automation"
    ],
    curriculum: [
      {
        module: "DevOps Fundamentals",
        lessons: 8,
        duration: "1 week",
        topics: ["DevOps Culture", "Git Workflows", "Linux Administration", "Shell Scripting"]
      },
      {
        module: "Containerization",
        lessons: 10,
        duration: "2 weeks",
        topics: ["Docker Basics", "Container Images", "Docker Compose", "Registry Management"]
      },
      {
        module: "Orchestration",
        lessons: 12,
        duration: "2 weeks",
        topics: ["Kubernetes Basics", "Pods & Services", "Deployments", "Helm Charts"]
      },
      {
        module: "CI/CD & Monitoring",
        lessons: 10,
        duration: "1 week",
        topics: ["Jenkins Pipelines", "Terraform", "Prometheus", "ELK Stack"]
      }
    ],
    image: "/DevOps.png",
    highlights: [
      "Hands-on lab environment",
      "Real CI/CD pipelines",
      "Industry best practices",
      "Certificate of completion"
    ]
  },
  {
    id: 6,
    title: "UI/UX Design Training",
    description: "Design thinking, user research, prototyping, and modern design tools for creating exceptional user experiences.",
    fullDescription: "Comprehensive UI/UX design training covering design thinking methodology, user research techniques, wireframing, prototyping, and modern design tools. Learn to create user-centered designs that balance aesthetics with functionality.",
    duration: "70 hrs",
    level: "Beginner to Intermediate",
    category: "Design",
    price: "₹18000",
    originalPrice: "₹25000",
    students: 600,
    rating: 4.8,
    instructor: {
      name: "Aarti Jain",
      bio: "UI/UX Designer with 9+ years experience at top design agencies. Expert in user-centered design and modern design tools.",
      image: "/placeholder-user.jpg",
      experience: "9+ years"
    },
    skills: [
      "Design Thinking",
      "User Research",
      "Wireframing",
      "Prototyping",
      "Figma",
      "Adobe XD",
      "User Testing",
      "Design Systems"
    ],
    curriculum: [
      {
        module: "Design Fundamentals",
        lessons: 10,
        duration: "2 weeks",
        topics: ["Design Principles", "Color Theory", "Typography", "Layout Design"]
      },
      {
        module: "User Research",
        lessons: 8,
        duration: "1.5 weeks",
        topics: ["User Interviews", "Personas", "Journey Mapping", "Usability Testing"]
      },
      {
        module: "Design Tools",
        lessons: 12,
        duration: "2 weeks",
        topics: ["Figma Mastery", "Adobe XD", "Prototyping", "Design Systems"]
      },
      {
        module: "Portfolio Development",
        lessons: 6,
        duration: "1 week",
        topics: ["Case Studies", "Portfolio Website", "Presentation Skills", "Job Preparation"]
      }
    ],
    image: "/UI UX Design.png",
    highlights: [
      "Portfolio development",
      "Industry-standard tools",
      "Real client projects",
      "Job placement assistance"
    ]
  },
  {
    id: 8,
    title: "Multi-cloud and DevOps",
    description: "Combine cloud expertise with DevOps tools to deploy scalable, reliable systems across multiple cloud platforms.",
    fullDescription: "Advanced course combining multi-cloud architecture with DevOps practices. Learn to implement CI/CD pipelines across AWS, Azure, and GCP, manage infrastructure as code, and ensure high availability in hybrid environments.",
    duration: "24 weeks",
    level: "Advanced",
    category: "DevOps & Automation",
    price: "₹35000",
    originalPrice: "₹48000",
    students: 820,
    rating: 4.8,
    instructor: {
      name: "Arjun Mehta",
      bio: "Senior DevOps Architect specializing in multi-cloud deployments. 14+ years experience in enterprise automation and cloud strategy.",
      image: "/placeholder-user.jpg",
      experience: "14+ years"
    },
    skills: [
      "Multi-cloud DevOps",
      "Cross-platform CI/CD",
      "Infrastructure as Code",
      "Container Orchestration",
      "Cloud Security",
      "Monitoring & Alerting",
      "Cost Optimization",
      "Disaster Recovery"
    ],
    curriculum: [
      {
        module: "Multi-cloud Strategy",
        lessons: 12,
        duration: "4 weeks",
        topics: ["Cloud Comparison", "Architecture Design", "Cost Management", "Security"]
      },
      {
        module: "DevOps Automation",
        lessons: 15,
        duration: "6 weeks",
        topics: ["CI/CD Pipelines", "Infrastructure as Code", "Configuration Management", "Testing"]
      },
      {
        module: "Container Orchestration",
        lessons: 10,
        duration: "3 weeks",
        topics: ["Multi-cloud Kubernetes", "Service Mesh", "Monitoring", "Scaling"]
      },
      {
        module: "Production Operations",
        lessons: 8,
        duration: "2 weeks",
        topics: ["Monitoring", "Incident Response", "Performance Tuning", "Disaster Recovery"]
      }
    ],
    image: "/DevOps.png",
    highlights: [
      "Multi-cloud expertise",
      "Advanced automation",
      "Production-ready skills",
      "Industry case studies"
    ]
  },
  {
    id: 9,
    title: "Data Analytics",
    description: "Learn data analysis, visualization, and business intelligence tools for data-driven decision making and insights.",
    fullDescription: "Comprehensive data analytics training covering statistical analysis, data visualization, machine learning basics, and business intelligence tools. Learn to extract insights from data and create compelling visualizations for business stakeholders.",
    duration: "12 weeks",
    level: "Intermediate",
    category: "Data Analytics",
    price: "₹25000",
    originalPrice: "₹35000",
    students: 580,
    rating: 4.6,
    instructor: {
      name: "Dr. Neha Agarwal",
      bio: "Data Scientist with PhD in Statistics. 8+ years experience in analytics, machine learning, and business intelligence solutions.",
      image: "/placeholder-user.jpg",
      experience: "8+ years"
    },
    skills: [
      "Statistical Analysis",
      "Data Visualization",
      "Python for Analytics",
      "SQL & Databases",
      "Business Intelligence",
      "Machine Learning Basics",
      "Excel Advanced",
      "Dashboard Creation"
    ],
    curriculum: [
      {
        module: "Data Fundamentals",
        lessons: 10,
        duration: "3 weeks",
        topics: ["Statistics Basics", "Data Types", "Exploratory Analysis", "Python Pandas"]
      },
      {
        module: "Visualization & BI",
        lessons: 12,
        duration: "4 weeks",
        topics: ["Matplotlib", "Seaborn", "Tableau", "Power BI", "Dashboard Design"]
      },
      {
        module: "Advanced Analytics",
        lessons: 10,
        duration: "3 weeks",
        topics: ["Regression Analysis", "Time Series", "Clustering", "Classification"]
      },
      {
        module: "Business Applications",
        lessons: 8,
        duration: "2 weeks",
        topics: ["Business Cases", "Report Writing", "Presentation Skills", "Data Strategy"]
      }
    ],
    image: "/data_analytics.png",
    highlights: [
      "Real business datasets",
      "Industry-standard tools",
      "Portfolio projects",
      "Business intelligence focus"
    ]
  }
]

const faqs = [
  {
    question: "What are the prerequisites for this course?",
    answer: "Basic understanding of programming concepts is helpful but not required. We start from fundamentals and gradually build up to advanced topics."
  },
  {
    question: "Will I get a certificate upon completion?",
    answer: "Yes, you'll receive a certificate of completion that is recognized by industry partners and can be added to your LinkedIn profile."
  },
  {
    question: "What kind of job support do you provide?",
    answer: "We provide resume building, interview preparation, job placement assistance, and access to our hiring partner network."
  },
  {
    question: "Can I access the course materials after completion?",
    answer: "Yes, you'll have lifetime access to all course materials, including video lectures, assignments, and project files."
  },
  {
    question: "Is there any live interaction with instructors?",
    answer: "Yes, we have live doubt-solving sessions, weekly Q&A calls, and 1-on-1 mentorship sessions with instructors."
  }
]

export default function CourseDetailPage() {
  const params = useParams()
  const idOrSlug = params.id as string
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    currentEducation: '',
    experience: '',
    motivation: '',
    preferredStartDate: '',
    paymentMethod: '',
    agreeToTerms: false
  })
  const [enrollmentLoading, setEnrollmentLoading] = useState(false)
  const [enrollmentStep, setEnrollmentStep] = useState(1)

  useEffect(() => {
    let courseId: number | null = null
    
    // Check if it's a numeric ID
    const numericId = parseInt(idOrSlug)
    if (!isNaN(numericId)) {
      courseId = numericId
    } else {
      // It's a slug, map it to course ID
      courseId = slugToCourseMapping[idOrSlug] || null
    }
    
    // Find course by ID
    const foundCourse = courseId ? coursesData.find(c => c.id === courseId) : null
    setCourse(foundCourse)
    setLoading(false)

    // Check if course is in wishlist (from localStorage)
    if (foundCourse && typeof window !== 'undefined') {
      const wishlist = JSON.parse(localStorage.getItem('courseWishlist') || '[]')
      setIsWishlisted(wishlist.includes(foundCourse.id))
    }
  }, [idOrSlug])

  const handleWishlist = () => {
    if (!course || typeof window === 'undefined') return
    
    const wishlist = JSON.parse(localStorage.getItem('courseWishlist') || '[]')
    let newWishlist
    
    if (isWishlisted) {
      newWishlist = wishlist.filter((id: number) => id !== course.id)
    } else {
      newWishlist = [...wishlist, course.id]
    }
    
    localStorage.setItem('courseWishlist', JSON.stringify(newWishlist))
    setIsWishlisted(!isWishlisted)
  }

  const handleEnroll = () => {
    setShowEnrollModal(true)
    setEnrollmentStep(1)
  }

  const handleEnrollmentSubmit = async () => {
    if (enrollmentStep < 3) {
      setEnrollmentStep(enrollmentStep + 1)
      return
    }

    setEnrollmentLoading(true)
    
    try {
      // Submit to Google Sheets
      console.log('Submitting enrollment data to Google Sheets...')
      const result = await submitToGoogleSheets(enrollmentData, course?.title || 'Unknown Course')
      
      if (result.success) {
        setShowEnrollModal(false)
        
        // Show success message with toast
        toast.success('Enrollment Successful!', {
          description: `Successfully enrolled in ${course?.title}! Your enrollment has been recorded and our team will contact you soon.`,
          duration: 5000,
        })
        
        // Reset form
        setEnrollmentData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          city: '',
          currentEducation: '',
          experience: '',
          motivation: '',
          preferredStartDate: '',
          paymentMethod: '',
          agreeToTerms: false
        })
      } else {
        throw new Error(typeof result.error === 'string' ? result.error : 'Failed to submit enrollment data')
      }
    } catch (error) {
      console.error('Enrollment error:', error)
      toast.error('Enrollment Failed', {
        description: 'There was an error processing your enrollment. Please try again or contact support.',
        duration: 5000,
      })
    } finally {
      setEnrollmentLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setEnrollmentData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Course Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
            <Link href="/courses">
              <Button>Browse All Courses</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Enroll in Course
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {course?.title}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEnrollModal(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-4">
                    {[
                      { step: 1, title: "Personal Information" },
                      { step: 2, title: "Background Information" },
                      { step: 3, title: "Payment & Confirmation" }
                    ].map(({ step, title }, index) => (
                      <div key={step} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                            enrollmentStep >= step 
                              ? 'bg-emerald-600 text-white shadow-lg' 
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {enrollmentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                          </div>
                          <span className={`mt-2 text-xs font-medium text-center max-w-20 leading-tight ${
                            enrollmentStep >= step 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {title}
                          </span>
                        </div>
                        {index < 2 && (
                          <div className={`w-16 h-px mx-4 transition-colors ${
                            enrollmentStep > step ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step Content */}
              {enrollmentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Personal Information
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Let us know about yourself
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="firstName"
                        value={enrollmentData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="lastName"
                        value={enrollmentData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={enrollmentData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <PhoneInput
                        country={'in'}
                        value={enrollmentData.phone}
                        onChange={(value) => handleInputChange('phone', value)}
                        inputClass="phone-input-field"
                        containerClass="phone-input-container"
                        buttonClass="phone-input-dropdown"
                        dropdownClass="phone-input-dropdown-list"
                        searchClass="search-class"
                        enableSearch={true}
                        disableSearchIcon={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                      <Input
                        id="city"
                        value={enrollmentData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Enter your city"
                      />
                    </div>
                  </div>
                </div>
              )}

              {enrollmentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Background Information
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Help us understand your experience level
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentEducation">Current Education Level</Label>
                    <Select onValueChange={(value) => handleInputChange('currentEducation', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high-school">High School</SelectItem>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                        <SelectItem value="post-graduate">Post Graduate</SelectItem>
                        <SelectItem value="professional">Professional Certification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Professional Experience</Label>
                    <Select onValueChange={(value) => handleInputChange('experience', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fresher">Fresher (0 years)</SelectItem>
                        <SelectItem value="1-2">1-2 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5-10">5-10 years</SelectItem>
                        <SelectItem value="10+">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivation">Why are you interested in this course?</Label>
                    <Textarea
                      id="motivation"
                      value={enrollmentData.motivation}
                      onChange={(e) => handleInputChange('motivation', e.target.value)}
                      placeholder="Tell us about your goals and motivation for taking this course"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredStartDate">Preferred Start Date</Label>
                    <Input
                      id="preferredStartDate"
                      type="date"
                      value={enrollmentData.preferredStartDate}
                      onChange={(e) => handleInputChange('preferredStartDate', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {enrollmentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Payment & Confirmation
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Review your enrollment details
                    </p>
                  </div>

                  {/* Course Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Course Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Course</span>
                          <span className="font-medium">{course?.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Duration</span>
                          <span className="font-medium">{course?.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Level</span>
                          <span className="font-medium">{course?.level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Price</span>
                          <span className="font-semibold text-emerald-600">{course?.price}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit-card">Credit Card</SelectItem>
                        <SelectItem value="debit-card">Debit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="net-banking">Net Banking</SelectItem>
                        <SelectItem value="emi">EMI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      checked={enrollmentData.agreeToTerms}
                      onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                      className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm cursor-pointer">
                      I agree to the{' '}
                      <Link href="/terms" className="text-emerald-600 hover:underline font-medium">
                        Terms and Conditions
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-emerald-600 hover:underline font-medium">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (enrollmentStep > 1) {
                      setEnrollmentStep(enrollmentStep - 1)
                    } else {
                      setShowEnrollModal(false)
                    }
                  }}
                  className="min-w-24"
                >
                  {enrollmentStep > 1 ? 'Previous' : 'Cancel'}
                </Button>

                <Button
                  onClick={handleEnrollmentSubmit}
                  disabled={
                    enrollmentLoading ||
                    (enrollmentStep === 1 && (!enrollmentData.firstName || !enrollmentData.lastName || !enrollmentData.email || !enrollmentData.phone || !enrollmentData.city)) ||
                    (enrollmentStep === 2 && (!enrollmentData.currentEducation || !enrollmentData.experience)) ||
                    (enrollmentStep === 3 && (!enrollmentData.paymentMethod || !enrollmentData.agreeToTerms))
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-32"
                >
                  {enrollmentLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : enrollmentStep < 3 ? (
                    'Next Step'
                  ) : (
                    'Complete Enrollment'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-emerald-600">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Link href="/courses" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600">
                Courses
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {course.title}
              </span>
            </nav>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-400 mb-4">
                  {course.category}
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">{course.title}</h1>
                <p className="text-xl text-emerald-100 mb-6">{course.description}</p>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>{course.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>{course.students.toLocaleString()}+ students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span>{course.rating}/5 rating</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100" onClick={handleEnroll}>
                    <PlayCircle className="h-5 w-5 mr-2" />
                    Enroll Now
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    <Download className="h-5 w-5 mr-2" />
                    Download Syllabus
                  </Button>
                </div>
              </div>

              <div className="lg:flex justify-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md">
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <img 
                      src={course.image} 
                      alt={course.title}
                      className="w-full h-48 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl font-bold">{course.price}</span>
                      {course.originalPrice && (
                        <span className="text-emerald-200 line-through">{course.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-emerald-100 text-sm">One-time payment • Lifetime access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Key Highlights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                    Key Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {course.highlights.map((highlight: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* What You'll Learn */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-emerald-600" />
                    What You'll Learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {course.skills.map((skill: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Course Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-6 w-6 text-emerald-600" />
                    Course Overview
                  </CardTitle>
                  <CardDescription>
                    {course.fullDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {course.curriculum.map((module: any, index: number) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-lg">{module.module}</h4>
                          <Badge variant="outline">{module.duration}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {module.lessons} lessons
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {module.topics.map((topic: string, topicIndex: number) => (
                            <Badge key={topicIndex} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* About the Instructor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-6 w-6 text-emerald-600" />
                    About the Instructor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-emerald-600">
                        {course.instructor.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{course.instructor.name}</h4>
                      <p className="text-emerald-600 font-medium">{course.instructor.experience} Experience</p>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {course.instructor.bio}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-emerald-600" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Enrollment Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-3xl font-bold text-emerald-600">{course.price}</span>
                      {course.originalPrice && (
                        <span className="text-gray-500 line-through">{course.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">One-time payment</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Duration</span>
                      <span className="font-medium">{course.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Level</span>
                      <span className="font-medium">{course.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Students</span>
                      <span className="font-medium">{course.students.toLocaleString()}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{course.rating}/5</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleEnroll}>
                      Enroll Now
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleWishlist}
                    >
                      {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                      Money-Back Guarantee
                    </h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      30-day money-back guarantee if you're not satisfied with the course.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Related Courses */}
              <Card>
                <CardHeader>
                  <CardTitle>Related Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {coursesData
                      .filter(c => c.id !== course.id && c.category === course.category)
                      .slice(0, 2)
                      .map((relatedCourse) => (
                        <Link key={relatedCourse.id} href={`/courses/${relatedCourse.id}`}>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                            <h4 className="font-medium mb-1">{relatedCourse.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {relatedCourse.description.substring(0, 80)}...
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-emerald-600">{relatedCourse.price}</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs">{relatedCourse.rating}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}