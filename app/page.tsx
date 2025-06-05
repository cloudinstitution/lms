"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, BookOpen, CheckCircle, Code, GraduationCap, Mail, MapPin, Moon, Phone, Sun, Users } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function Home() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
            <span className="font-bold text-xl text-emerald-800 dark:text-emerald-400">Cloud Institution</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/courses" className="text-sm font-medium hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
              Courses
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-emerald-600 dark:text-emerald-400"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Link href="/login">
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
                Transform Your Future
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-slate-100">
                Launch Your Tech Career with <span className="text-emerald-600 dark:text-emerald-400">Expert Training</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-slate-300">
                Gain in-demand skills with our industry-focused courses and hands-on learning experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/courses">
                  <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
                    Explore Courses <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  >
                    Start Learning Today
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg blur opacity-75"></div>
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="Students learning"
                className="relative rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </section>        {/* Featured Courses */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
                Our Programs
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">Featured Courses</h2>
              <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
                Our most popular courses designed to help you master the skills employers are looking for.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Full Stack Web Development",
                  description: "Master frontend and backend technologies to build complete web applications",
                  icon: <Code className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
                  duration: "16 weeks",
                  level: "Intermediate"
                },
                {
                  title: "Data Science Fundamentals",
                  description: "Learn data analysis, visualization and machine learning techniques",
                  icon: <BookOpen className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
                  duration: "12 weeks",
                  level: "Beginner"
                },
                {
                  title: "Cloud Computing & DevOps",
                  description: "Deploy and manage applications in cloud environments with CI/CD pipelines",
                  icon: <Users className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />,
                  duration: "14 weeks",
                  level: "Advanced"
                },
              ].map((course, index) => (
                <Card
                  key={index}
                  className="overflow-hidden transition-all hover:shadow-lg border-t-4 border-t-emerald-500 dark:bg-slate-800/50 group"
                >
                  <CardHeader
                    className="pb-4 bg-emerald-50/50 dark:bg-slate-800/50 group-hover:bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 dark:group-hover:from-emerald-950/10 dark:group-hover:to-emerald-900/20 transition-colors"
                  >
                    <div className="mb-2">{course.icon}</div>
                    <CardTitle className="dark:text-slate-100">{course.title}</CardTitle>
                    <CardDescription className="dark:text-slate-400">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-slate-400">Duration:</span>
                        <span className="font-medium dark:text-slate-300">{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-slate-400">Level:</span>
                        <span className="font-medium dark:text-slate-300">{course.level}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 pt-4">
                    <Link href={`/courses/${index + 1}`} className="w-full">
                      <Button
                        variant="outline"
                        className="w-full text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      >
                        View Course
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
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

        {/* Why Choose Us */}        <section className="py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
                Our Advantages
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">Why Choose Us</h2>
              <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
                We provide a comprehensive learning experience that prepares you for real-world challenges.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[                {
                  title: "Industry-Relevant Curriculum",
                  description:
                    "Our courses are designed in collaboration with industry experts to ensure you learn skills that employers value.",
                  icon: <BookOpen className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
                },
                {
                  title: "Expert Instructors",
                  description: "Learn from professionals with years of experience in their respective fields.",
                  icon: <Users className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
                },
                {
                  title: "Hands-on Projects",
                  description: "Apply your knowledge through practical projects that simulate real-world scenarios.",
                  icon: <Code className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
                },
                {
                  title: "Placement Assistance",
                  description: "Get help with resume building, interview preparation, and job placement.",
                  icon: <GraduationCap className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
                },
                {
                  title: "Flexible Learning",
                  description: "Access course materials anytime, anywhere, and learn at your own pace.",
                  icon: <CheckCircle className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
                },
                {
                  title: "Community Support",
                  description: "Join a community of learners and professionals to network and grow together.",
                  icon: <Users className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 border-emerald-500 flex gap-4 group hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:border-emerald-400"
                >
                  <div className="mt-1 group-hover:scale-110 transition-transform">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-slate-100">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-slate-300">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
                Success Stories
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">What Our Students Say</h2>
              <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
                Hear from our graduates who have successfully transformed their careers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: "Rahul Sharma",
                  role: "Software Developer at TechCorp",
                  image: "/placeholder.svg?height=100&width=100",
                  testimonial:
                    "The Full Stack Development course gave me all the skills I needed to land my dream job. The instructors were knowledgeable and supportive throughout my journey.",
                },
                {
                  name: "Priya Patel",
                  role: "Data Analyst at FinTech Solutions",
                  image: "/placeholder.svg?height=100&width=100",
                  testimonial:
                    "I had no prior experience in data science, but the course structure made it easy to follow along. Now I'm working as a data analyst and loving every minute of it!",
                },
                {
                  name: "Amit Kumar",
                  role: "DevOps Engineer at CloudSys",
                  image: "/placeholder.svg?height=100&width=100",
                  testimonial:
                    "The hands-on projects in the DevOps course prepared me for real-world challenges. I was able to implement CI/CD pipelines at my new job from day one.",
                },
              ].map((testimonial, index) => (                <Card key={index} className="overflow-hidden hover:shadow-lg transition-all border-none dark:bg-slate-800/50">
                  <CardContent className="pt-6 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 dark:from-slate-800/50 dark:to-slate-900/50">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full mb-4 overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-md">
                        <img
                          src={testimonial.image || "/placeholder.svg"}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="mb-4 italic text-slate-700 dark:text-slate-300 relative">
                        <span className="text-5xl text-emerald-200 dark:text-emerald-800 absolute -top-6 -left-2">"</span>
                        {testimonial.testimonial}
                        <span className="text-5xl text-emerald-200 dark:text-emerald-800 absolute -bottom-10 -right-2">"</span>
                      </p>
                      <div className="mt-4">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{testimonial.name}</h4>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-900 dark:to-emerald-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern opacity-10"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl font-bold mb-4 text-white dark:text-slate-100">Ready to Start Your Learning Journey?</h2>
            <p className="max-w-2xl mx-auto mb-8 text-white/90 dark:text-slate-200">
              Join thousands of students who have transformed their careers with our courses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses">
                <Button size="lg" variant="secondary" className="gap-2 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Explore Courses <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white dark:border-slate-200 text-white dark:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800"
                >
                  Register Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-emerald-400" />
                <span className="font-bold text-lg text-white">Cloud Institution</span>
              </Link>
              <p className="text-gray-400">
                Empowering individuals with the skills they need to succeed in the digital world.
              </p>
              <div className="flex gap-4 mt-4">
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-400">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/courses" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    Courses
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-400">Courses</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/courses/web-development"
                    className="text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    Web Development
                  </Link>
                </li>
                <li>
                  <Link href="/courses/data-science" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    Data Science
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses/cloud-computing"
                    className="text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    Cloud Computing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses/mobile-development"
                    className="text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    Mobile Development
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-400">Contact Us</h3>
              <address className="not-italic text-gray-400 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <p>
                    No 15, 20th Main, 100ft ring road, BTM
                    <br />
                    2nd stage, Bangalore-560076
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-400" />
                  <p>info@cloudinstitution.com</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-emerald-400" />
                  <p>+91 7676370336</p>
                </div>
              </address>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Cloud Institution. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
