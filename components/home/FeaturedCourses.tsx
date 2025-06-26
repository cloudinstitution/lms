"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, BookOpen, Code, Clock, Monitor, Star, Target, Globe } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const featuredCourses = [
  {
    title: "AWS Certificate Training",
    description: "Master Amazon Web Services with hands-on labs and real-world projects",
    icon: <Globe className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
    duration: "45 hrs",
    level: "Beginner to Advanced",
    mode: "Classroom/Online",
    rating: 5,
    students: "2000+",
    image: "/AWS.png"
  },
  {
    title: "Azure Certificate Training",
    description: "Comprehensive Microsoft Azure cloud platform training with certification prep",
    icon: <Monitor className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
    duration: "45 hrs",
    level: "Beginner to Advanced", 
    mode: "Classroom/Online",
    rating: 5,
    students: "1500+",
    image: "/Azure.png"
  },
  {
    title: "Google Cloud Certification",
    description: "Learn Google Cloud Platform services and earn industry-recognized certification",
    icon: <Code className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
    duration: "45 hrs",
    level: "Beginner to Advanced",
    mode: "Classroom/Online", 
    rating: 5,
    students: "1200+",
    image: "/DevOps.png"
  },
  {
    title: "Python Full-Stack Training",
    description: "Complete Python development from backend APIs to frontend frameworks",
    icon: <Code className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
    duration: "360 hrs",
    level: "Beginner to Advanced",
    mode: "Classroom/Online",
    rating: 5,
    students: "800+",
    image: "/Java.png"
  },
  {
    title: "UI/UX Design Training",
    description: "Design thinking, user research, prototyping, and modern design tools",
    icon: <BookOpen className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
    duration: "70 hrs", 
    level: "Beginner to Intermediate",
    mode: "Classroom/Online",
    rating: 5,
    students: "600+",
    image: "/UI UX Design.png"
  },
  {
    title: "Data Analytics Training",
    description: "Statistical analysis, data visualization, and machine learning fundamentals",
    icon: <Target className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
    duration: "300 hrs",
    level: "Beginner to Advanced",
    mode: "Classroom/Online",
    rating: 5,
    students: "900+",
    image: "/data_analytics.png"
  }
]

export default function FeaturedCourses() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
            Guaranteed Career Advancement Training Programs
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">Featured Courses</h2>
          <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
            Our most popular courses designed to help you master the skills employers are looking for.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCourses.map((course, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden transition-all hover:shadow-lg border-t-4 border-t-emerald-500 dark:bg-slate-800/50 group h-full">
                <div className="relative overflow-hidden">
                  <div className="w-full h-48 bg-white dark:bg-slate-800 flex items-center justify-center p-4">
                    <img 
                      src={course.image} 
                      alt={course.title}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute top-4 right-4 bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {course.duration}
                  </div>
                </div>
                <CardHeader className="pb-4 bg-emerald-50/50 dark:bg-slate-800/50 group-hover:bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 dark:group-hover:from-emerald-950/10 dark:group-hover:to-emerald-900/20 transition-colors">
                  <div className="mb-2">{course.icon}</div>
                  <CardTitle className="dark:text-slate-100">{course.title}</CardTitle>
                  <CardDescription className="dark:text-slate-400">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(course.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-slate-400">({course.students} students)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                        <span className="font-medium dark:text-slate-300">{course.level}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                        <span className="font-medium dark:text-slate-300">{course.mode}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 pt-4">
                  <Link href={`/courses/${course.title.toLowerCase().replace(/ /g, '-')}`} className="w-full">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Get Course Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/courses">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950"
            >
              View All Courses <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
