import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MapPin, Phone, Clock, Send, MessageSquare } from "lucide-react"
import MainLayout from "@/components/main-layout"

export default function ContactPage() {
  const contactInfo = [
    {
      title: "Bangalore Office",
      address: "No 15, 20th Main, 100ft Ring Road, BTM 2nd Stage, Bangalore – 560076",
      phone: "+91 76763 70336",
      email: "info@cloudinstitution.com",
      hours: "Mon-Sat: 9:00 AM - 7:00 PM",
      icon: <MapPin className="h-6 w-6 text-emerald-600" />
    },
    {
      title: "Coimbatore Office", 
      address: "229, Sathyamurthy Rd, Peranaidu Layout, Coimbatore, Tamil Nadu 641009",
      phone: "+91 84319 66507",
      email: "info@cloudinstitution.com",
      hours: "Mon-Sat: 9:00 AM - 7:00 PM",
      icon: <MapPin className="h-6 w-6 text-emerald-600" />
    }
  ]

  const quickContacts = [
    {
      title: "Call Us",
      description: "Speak with our education counselors",
      value: "+91 76763 70336",
      icon: <Phone className="h-8 w-8 text-emerald-600" />,
      action: "tel:+917676370336"
    },
    {
      title: "Email Us", 
      description: "Send us your queries anytime",
      value: "info@cloudinstitution.com",
      icon: <Mail className="h-8 w-8 text-emerald-600" />,
      action: "mailto:info@cloudinstitution.com"
    },
    {
      title: "WhatsApp",
      description: "Quick chat with our team",
      value: "Message Now",
      icon: <MessageSquare className="h-8 w-8 text-emerald-600" />,
      action: "https://api.whatsapp.com/send?phone=917676370336"
    }
  ]

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium mb-4">
              Contact Us
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Get in Touch with Cloud Institution
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Have questions about our courses? Need guidance on your career path? Our expert counselors are here to help you make the right choice for your future.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Contact Cards */}
      <div className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Quick Contact</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Choose the best way to reach us
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {quickContacts.map((contact, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow border-t-4 border-emerald-500 dark:bg-slate-800">
                <CardHeader>
                  <div className="flex justify-center mb-4">{contact.icon}</div>
                  <CardTitle className="dark:text-white">{contact.title}</CardTitle>
                  <CardDescription className="dark:text-gray-300">{contact.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <a 
                    href={contact.action}
                    target={contact.action.startsWith('http') ? '_blank' : undefined}
                    rel={contact.action.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      {contact.value}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Form & Office Info */}
      <div className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Send us a Message</h2>
              <Card className="dark:bg-slate-800">
                <CardContent className="p-6">
                  <form className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          First Name
                        </label>
                        <Input 
                          type="text" 
                          placeholder="Enter your first name"
                          className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Name
                        </label>
                        <Input 
                          type="text" 
                          placeholder="Enter your last name"
                          className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <Input 
                        type="email" 
                        placeholder="Enter your email"
                        className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <Input 
                        type="tel" 
                        placeholder="Enter your phone number"
                        className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Course Interest
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white">
                        <option value="">Select a course</option>
                        <option value="aws">AWS Certification</option>
                        <option value="azure">Azure Certification</option>
                        <option value="gcp">Google Cloud Platform</option>
                        <option value="devops">DevOps Training</option>
                        <option value="python">Python Full Stack</option>
                        <option value="data-analytics">Data Analytics</option>
                        <option value="ui-ux">UI/UX Design</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Message
                      </label>
                      <Textarea 
                        placeholder="Tell us about your goals and how we can help you..."
                        rows={4}
                        className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                    </div>
                    
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Office Information */}
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Visit Our Offices</h2>
              <div className="space-y-6">
                {contactInfo.map((office, index) => (
                  <Card key={index} className="dark:bg-slate-800">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {office.icon}
                        <div>
                          <CardTitle className="dark:text-white">{office.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <p className="text-gray-600 dark:text-gray-300">{office.address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <a href={`tel:${office.phone}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {office.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <a href={`mailto:${office.email}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {office.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <p className="text-gray-600 dark:text-gray-300">{office.hours}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Map placeholder */}
              <Card className="mt-6 dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="bg-gray-200 dark:bg-slate-700 h-64 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <MapPin className="h-12 w-12 mx-auto mb-2" />
                      <p>Interactive Map</p>
                      <p className="text-sm">Find us on Google Maps</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Quick answers to common questions
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                question: "What is the duration of your courses?",
                answer: "Our course durations vary from 6 weeks for specialized certifications to 24 weeks for comprehensive programs. Each course is designed to provide thorough coverage of the subject matter."
              },
              {
                question: "Do you provide placement assistance?",
                answer: "Yes, we provide comprehensive placement assistance including resume building, interview preparation, and direct referrals to our 300+ hiring partners."
              },
              {
                question: "Are the courses available online?",
                answer: "We offer flexible learning options including classroom, online, and hybrid modes. You can choose the format that best suits your schedule and learning preferences."
              },
              {
                question: "What are the prerequisites for joining?",
                answer: "Prerequisites vary by course. Most of our courses are designed for beginners to advanced levels. Our counselors can help you choose the right course based on your background."
              },
              {
                question: "Do you provide certificates?",
                answer: "Yes, upon successful completion of any course, you will receive an industry-recognized certificate from Cloud Institution."
              }
            ].map((faq, index) => (
              <Card key={index} className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-900 dark:to-emerald-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 text-white/90">
            Get personalized guidance from our education counselors today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+917676370336">
              <Button size="lg" variant="secondary" className="bg-white text-emerald-600 hover:bg-slate-100">
                <Phone className="h-4 w-4 mr-2" />
                Call Now: +91 76763 70336
              </Button>
            </a>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
