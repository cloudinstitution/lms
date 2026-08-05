import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Database, Search, Server } from "lucide-react"
import MainLayout from "@/components/main-layout"

export default function CoursesPage() {
  const courseCategories = [
    { id: "all", label: "All Courses" },
    { id: "Web & Application Development", label: "Web & Application Development" },
    { id: "Data Science & Analytics", label: "Data Science & Analytics" },
    { id: "Cloud Computing", label: "Cloud Computing" },
    { id: "DevOps & Automation", label: "DevOps & Automation" },
  ]

  const courses = [    {
      id: 1,
      title: "Java Full Stack Web Development",
      description: "Master frontend and backend technologies to build complete web applications",
      icon: <Code className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />,
      duration: "24 weeks",
      level: "Intermediate",
      category: "Web & Application Development",
      price: "₹30000",
      students: 1240,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      id: 2,
      title: "Python Full Stack Web Development",
      description: "Build dynamic web applications using Python, Django, React, and REST APIs",
      icon: <Code className="h-10 w-10 text-teal-600 dark:text-teal-400" />,
      duration: "24 weeks",
      level: "Beginner",
      category: "Web & Application Development",
      price: "₹30000",
      students: 980,
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      id: 3,
      title: "AWS",
      description: "Deploy and manage applications in cloud environments with CI/CD pipelines",
      icon: <Server className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />,
      duration: "6 weeks",
      level: "Advanced",
      category: "Cloud Computing",
      price: "₹20000",
      students: 760,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      id: 4,
      title: "Azure",
      description: "Learn to architect, deploy, and manage services using Microsoft Azure",
      icon: <Server className="h-10 w-10 text-teal-600 dark:text-teal-400" />,
      duration: "6 weeks",
      level: "Intermediate",
      category: "Cloud Computing",
      price: "₹20000",
      students: 620,
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      id: 5,
      title: "Multi-cloud",
      description: "Understand and work with multiple cloud platforms like AWS, Azure, and GCP",
      icon: <Server className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />,
      duration: "24 weeks",
      level: "Intermediate",
      category: "Cloud Computing",
      price: "₹35000",
      students: 1450,
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      id: 6,
      title: "DevOps",
      description: "Learn CI/CD, containerization, automation, and monitoring in real-world DevOps pipelines",
      icon: <Database className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />,
      duration: "6 weeks",
      level: "Advanced",
      category: "DevOps & Automation",
      price: "₹20000",
      students: 540,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      id: 7,
      title: "Multi-Cloud and DevOps",
      description: "Combine cloud expertise with DevOps tools to deploy scalable, reliable systems",
      icon: <Server className="h-10 w-10 text-teal-600 dark:text-teal-400" />,
      duration: "24 weeks",
      level: "Advanced",
      category: "DevOps & Automation",
      price: "₹35000",
      students: 820,
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      id: 8,
      title: "Data Analytics",
      description: "Learn data analysis, visualization, and business intelligence tools for decision-making",
      icon: <Database className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />,
      duration: "12 weeks",
      level: "Intermediate",
      category: "Data Analytics",
      price: "₹25000",
      students: 580,
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    },
  ]

  return (
    <MainLayout>      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium mb-2">
              Our Programs
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Explore Our Courses</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Discover the perfect course to advance your career and gain in-demand skills
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Find Your Perfect Course</h2>
            <p className="text-gray-600 dark:text-gray-300">Browse our comprehensive catalog of professional courses</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="search"
              placeholder="Search courses..."
              className="w-full pl-8 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 flex flex-wrap h-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {courseCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="mb-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm dark:text-gray-300"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {courseCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses
                  .filter((course) => category.id === "all" || course.category === category.id)
                  .map((course) => (                    <Card
                      key={course.id}
                      className="overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-emerald-500/10 border-t-4 border-t-emerald-500 group dark:bg-gray-800 dark:border-gray-700"
                    >
                      <CardHeader
                        className={`pb-4 ${course.bgColor} group-hover:bg-gradient-to-r from-emerald-50 to-teal-50 dark:group-hover:from-emerald-950/30 dark:group-hover:to-teal-950/30 transition-colors`}
                      >
                        <div className="mb-2 group-hover:scale-110 transition-transform">{course.icon}</div>
                        <CardTitle className="text-gray-900 dark:text-white">{course.title}</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300">{course.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Duration</p>
                            <p className="font-medium text-gray-900 dark:text-white">{course.duration}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Level</p>
                            <p className="font-medium text-gray-900 dark:text-white">{course.level}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Price</p>
                            <p className="font-medium text-emerald-700 dark:text-emerald-400">{course.price}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Students</p>
                            <p className="font-medium text-gray-900 dark:text-white">{course.students.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-gray-50 dark:bg-gray-700 dark:border-gray-600 pt-4">
                        <Link href={`/courses/${course.id}`} className="w-full">
                          <Button
                            variant="outline"
                            className="w-full text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            View Course
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>        <div className="mt-16 text-center">
          <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium mb-2">
            Need Help?
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Not Sure Which Course to Choose?</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Our education counselors can help you find the perfect course based on your career goals and interests.
          </p>
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
            Schedule a Consultation
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}
