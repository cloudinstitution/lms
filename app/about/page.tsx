import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Award, BookOpen, Clock, Code, GraduationCap, MapPin, Monitor, Phone, Star, Target, Users, UserCheck, Briefcase, Mail } from "lucide-react"
import MainLayout from "@/components/main-layout"

export default function AboutPage() {
  const stats = [
    { number: "5000+", label: "Students Trained", icon: <Users className="h-8 w-8 text-emerald-600" /> },
    { number: "300+", label: "Hiring Partners", icon: <Briefcase className="h-8 w-8 text-emerald-600" /> },
    { number: "95%", label: "Placement Rate", icon: <Target className="h-8 w-8 text-emerald-600" /> },
    { number: "50+", label: "Expert Trainers", icon: <UserCheck className="h-8 w-8 text-emerald-600" /> },
  ]

  const values = [
    {
      title: "Quality Education",
      description: "We provide industry-relevant, hands-on training that prepares students for real-world challenges.",
      icon: <BookOpen className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
    },
    {
      title: "Expert Guidance",
      description: "Our trainers are industry experts with years of practical experience in their respective fields.",
      icon: <UserCheck className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
    },
    {
      title: "Career Support",
      description: "From resume building to interview preparation, we support students throughout their career journey.",
      icon: <Briefcase className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
    },
    {
      title: "Innovation",
      description: "We continuously update our curriculum to match the latest industry trends and technologies.",
      icon: <Code className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
    }
  ]

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium mb-4">
              About Cloud Institution
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Transforming Careers Through Quality Education
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              At Cloud Institution, we are passionate about empowering individuals with the skills and knowledge needed to excel in today's rapidly evolving tech landscape. Since our inception, we have been committed to delivering world-class training programs that bridge the gap between academic learning and industry requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses">
                <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Explore Our Courses <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="tel:+917676370336">
                <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-t-4 border-emerald-500 dark:bg-slate-800">
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-4">{stat.icon}</div>
                  <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{stat.number}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      <div className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Our Story</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Founded with a vision to democratize quality tech education
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Building Tomorrow's Tech Leaders</h3>
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                  <p>
                    Cloud Institution was founded with a simple yet powerful vision: to make quality tech education accessible to everyone. We recognized the growing gap between industry demands and the skills possessed by fresh graduates, and we set out to bridge this divide.
                  </p>
                  <p>
                    Our journey began in Bangalore, the Silicon Valley of India, where we established our first training center in BTM Layout. From day one, our focus has been on providing hands-on, practical training that prepares students for real-world challenges.
                  </p>
                  <p>
                    Today, we have expanded to multiple locations and have successfully trained thousands of students who are now working with leading companies across the globe. Our success is measured not just by the number of students we train, but by the careers we transform.
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 p-8 rounded-lg">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Founded</h4>
                      <p className="text-gray-600 dark:text-gray-300">2020 in Bangalore</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Locations</h4>
                      <p className="text-gray-600 dark:text-gray-300">Bangalore & Coimbatore</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Recognition</h4>
                      <p className="text-gray-600 dark:text-gray-300">Industry Leader in Tech Training</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Values Section */}
      <div className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Our Core Values</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow dark:bg-slate-800">
                <CardHeader>
                  <div className="flex justify-center mb-4">{value.icon}</div>
                  <CardTitle className="dark:text-white">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="dark:text-gray-300">{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Why Choose Cloud Institution?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              What sets us apart in the world of tech education
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Industry-Aligned Curriculum",
                description: "Our courses are designed in consultation with industry experts to ensure relevance and practicality.",
                icon: <BookOpen className="h-6 w-6 text-emerald-400" />,
              },
              {
                title: "Hands-On Learning",
                description: "We believe in learning by doing. Our training includes real-world projects and practical assignments.",
                icon: <Code className="h-6 w-6 text-emerald-400" />,
              },
              {
                title: "Expert Trainers",
                description: "Learn from industry professionals with years of experience in their respective domains.",
                icon: <UserCheck className="h-6 w-6 text-emerald-400" />,
              },
              {
                title: "Placement Support",
                description: "Comprehensive placement assistance including resume building, interview preparation, and job referrals.",
                icon: <Briefcase className="h-6 w-6 text-emerald-400" />,
              },
              {
                title: "Flexible Learning",
                description: "Choose from classroom, online, or hybrid modes to suit your schedule and learning preference.",
                icon: <Monitor className="h-6 w-6 text-emerald-400" />,
              },
              {
                title: "24/7 Support",
                description: "Round-the-clock support for all your learning needs and technical queries.",
                icon: <Clock className="h-6 w-6 text-emerald-400" />,
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 border-emerald-500 flex gap-4"
              >
                <div className="mt-1">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-900 dark:to-emerald-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Career?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of successful graduates who chose Cloud Institution for their tech journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/courses">
              <Button size="lg" variant="secondary" className="bg-white text-emerald-600 hover:bg-slate-100">
                View Our Courses
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Contact Us Today
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
