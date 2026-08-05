"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const realTestimonials = [
  {
    name: "Rahul Kumar",
    role: "AWS Solutions Architect at TechCorp",
    image: "/placeholder-user.jpg",
    testimonial: "The AWS certification training gave me all the skills I needed to land my dream job. The hands-on experience and expert mentorship were invaluable throughout my journey.",
    rating: 5,
    course: "AWS Certification"
  },
  {
    name: "Priya Sharma",
    role: "DevOps Engineer at CloudSys",
    image: "/placeholder-user.jpg",
    testimonial: "I had no prior experience in DevOps, but the course structure made it easy to follow. The real-world projects prepared me for actual workplace challenges.",
    rating: 5,
    course: "DevOps Training"
  },
  {
    name: "Amit Patel",
    role: "Data Scientist at FinTech Solutions",
    image: "/placeholder-user.jpg",
    testimonial: "The data analytics course was comprehensive and practical. I was able to implement machine learning models at my new job from day one.",
    rating: 5,
    course: "Data Analytics"
  },
  {
    name: "Sneha Reddy",
    role: "UI/UX Designer at DesignCorp",
    image: "/placeholder-user.jpg",
    testimonial: "The UI/UX design training helped me transition from development to design. The portfolio projects were impressive to potential employers.",
    rating: 5,
    course: "UI/UX Design"
  },
  {
    name: "Vikram Singh",
    role: "Python Developer at StartupHub",
    image: "/placeholder-user.jpg",
    testimonial: "The full-stack Python course was exactly what I needed. The 360-hour program covered everything from basics to advanced frameworks.",
    rating: 5,
    course: "Python Full-Stack"
  },
  {
    name: "Anitha Joseph",
    role: "Digital Marketing Manager at MarketingPro",
    image: "/placeholder-user.jpg",
    testimonial: "The advanced digital marketing course gave me cutting-edge strategies. I increased my company's ROI by 200% using the techniques learned.",
    rating: 5,
    course: "Digital Marketing"
  },
  {
    name: "Karthik Reddy",
    role: "Azure Cloud Engineer at Microsoft",
    image: "/placeholder-user.jpg",
    testimonial: "Cloud Institution's Azure training was comprehensive and hands-on. The practical labs and real-world scenarios prepared me perfectly for my current role.",
    rating: 5,
    course: "Azure Certification"
  },
  {
    name: "Meera Nair",
    role: "Full Stack Developer at Infosys",
    image: "/placeholder-user.jpg",
    testimonial: "The training quality exceeded my expectations. From basics to advanced concepts, everything was covered systematically with excellent support.",
    rating: 5,
    course: "Full Stack Development"
  },
  {
    name: "Rohan Gupta",
    role: "Cloud Architect at Wipro",
    image: "/placeholder-user.jpg",
    testimonial: "Best investment in my career! The multi-cloud training helped me become a certified cloud architect. The placement assistance was outstanding.",
    rating: 5,
    course: "Multi-Cloud"
  },
  {
    name: "Divya Krishnan",
    role: "Business Analyst at Accenture",
    image: "/placeholder-user.jpg",
    testimonial: "The data analytics program transformed my career completely. From a non-technical background to landing a role at Accenture - amazing journey!",
    rating: 5,
    course: "Data Analytics"
  }
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
            Our Students Successful Story
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">What Our Students Say</h2>
          <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
            Hear from our graduates who have successfully transformed their careers with Cloud Institution.
          </p>
        </div>            
        
        <div className="overflow-hidden">
          <div className="flex animate-scroll-left hover:pause-animation">
            {[...realTestimonials, ...realTestimonials, ...realTestimonials].map((testimonial, index) => (
              <div key={index} className="flex-shrink-0 w-[350px] mx-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all border-none dark:bg-slate-800/50 h-full">
                    <CardContent className="pt-6 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 dark:from-slate-800/50 dark:to-slate-900/50">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full mb-4 overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-md">
                          <img
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="mb-4 italic text-slate-700 dark:text-slate-300 relative text-sm">
                          <span className="text-3xl text-emerald-200 dark:text-emerald-800 absolute -top-3 -left-1">"</span>
                          {testimonial.testimonial}
                          <span className="text-3xl text-emerald-200 dark:text-emerald-800 absolute -bottom-6 -right-1">"</span>
                        </p>
                        <div className="mt-4">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">{testimonial.name}</h4>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400">{testimonial.role}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {testimonial.course} Graduate
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Based on 1218+ reviews ⭐ 5.0 rating on Google
          </p>
          <Link href="/testimonials">
            <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950">
              Read More Reviews
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
