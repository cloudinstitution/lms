"use client"

import { UserCheck, Briefcase, Clock, Code, Award, Monitor } from "lucide-react"
import { motion } from "framer-motion"

const features = [
  {
    title: "Expert Trainer Support",
    description: "Real-Time Problem Solving, Personalized Coaching, and One-on-One Mentoring from industry experts with years of experience.",
    icon: <UserCheck className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
  },
  {
    title: "Top Placement Assistance",
    description: "Career Guidance and Counseling, Access to 300+ Hiring Partners, and High Placement Rate with dedicated support.",
    icon: <Briefcase className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
  },
  {
    title: "24x7 Support",
    description: "Continuous Availability, Improved Customer Satisfaction, and Business Continuity with round-the-clock assistance.",
    icon: <Clock className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
  },
  {
    title: "Project Based Learning",
    description: "Real-World Application, Critical Thinking and Problem-Solving, Collaboration and Communication through hands-on projects.",
    icon: <Code className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
  },
  {
    title: "Industry Recognised Certification",
    description: "Validated Skills and Knowledge, Career Advancement opportunities, and Credibility with Employers across the industry.",
    icon: <Award className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
  },
  {
    title: "Flexible Learning Options",
    description: "Choose from Classroom, Online, or Hybrid modes. Access course materials anytime, anywhere, and learn at your own pace.",
    icon: <Monitor className="h-6 w-6 text-emerald-400 dark:text-emerald-400" />,
  },
]

export default function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
            Why Choose Cloud Institution?
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">Our Competitive Advantages</h2>
          <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
            We provide a comprehensive learning experience that prepares you for real-world challenges.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 border-emerald-500 flex gap-4 group hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:border-emerald-400"
            >
              <div className="mt-1 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-slate-100">{feature.title}</h3>
                <p className="text-gray-600 dark:text-slate-300">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
