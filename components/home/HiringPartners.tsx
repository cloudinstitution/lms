"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"

const hiringPartners = [
  { name: "TCS", logo: "/placeholder.svg?height=60&width=120&text=TCS" },
  { name: "Infosys", logo: "/placeholder.svg?height=60&width=120&text=Infosys" },
  { name: "Wipro", logo: "/placeholder.svg?height=60&width=120&text=Wipro" },
  { name: "Amazon", logo: "/placeholder.svg?height=60&width=120&text=Amazon" },
  { name: "Microsoft", logo: "/placeholder.svg?height=60&width=120&text=Microsoft" },
  { name: "Google", logo: "/placeholder.svg?height=60&width=120&text=Google" },
  { name: "Accenture", logo: "/placeholder.svg?height=60&width=120&text=Accenture" },
  { name: "IBM", logo: "/placeholder.svg?height=60&width=120&text=IBM" },
  { name: "Oracle", logo: "/placeholder.svg?height=60&width=120&text=Oracle" },
  { name: "Dell", logo: "/placeholder.svg?height=60&width=120&text=Dell" },
  { name: "HP", logo: "/placeholder.svg?height=60&width=120&text=HP" },
  { name: "Cognizant", logo: "/placeholder.svg?height=60&width=120&text=Cognizant" },
  { name: "HCL", logo: "/placeholder.svg?height=60&width=120&text=HCL" },
  { name: "Tech Mahindra", logo: "/placeholder.svg?height=60&width=120&text=Tech+Mahindra" },
  { name: "Capgemini", logo: "/placeholder.svg?height=60&width=120&text=Capgemini" },
  { name: "Deloitte", logo: "/placeholder.svg?height=60&width=120&text=Deloitte" },
  { name: "Salesforce", logo: "/placeholder.svg?height=60&width=120&text=Salesforce" },
  { name: "Adobe", logo: "/placeholder.svg?height=60&width=120&text=Adobe" },
  { name: "Cisco", logo: "/placeholder.svg?height=60&width=120&text=Cisco" },
  { name: "Intel", logo: "/placeholder.svg?height=60&width=120&text=Intel" },
  { name: "Nvidia", logo: "/placeholder.svg?height=60&width=120&text=Nvidia" },
  { name: "VMware", logo: "/placeholder.svg?height=60&width=120&text=VMware" },
  { name: "ServiceNow", logo: "/placeholder.svg?height=60&width=120&text=ServiceNow" },
  { name: "Snowflake", logo: "/placeholder.svg?height=60&width=120&text=Snowflake" }
]

export default function HiringPartners() {
  return (
    <section id="hiring-partners" className="py-16 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-2">
            Fuel Your Career
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-slate-100">
            Our 300+ Hiring Partners
          </h2>
          <p className="text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
            Get Closer to Your Dream Company. Our Graduates are working with leading tech partners.
          </p>
        </div>            
        
        <div className="space-y-6">
          {/* First Row - Scrolling Left */}
          <div className="overflow-hidden">
            <div className="flex animate-scroll-left hover:pause-animation">
              {[...hiringPartners.slice(0, 12), ...hiringPartners.slice(0, 12), ...hiringPartners.slice(0, 12)].map((partner, index) => (
                <div key={`row1-${index}`} className="flex-shrink-0 w-[200px] mx-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.02 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all group h-32"
                  >
                    <div className="text-center w-full">
                      <div className="w-full h-16 mx-auto mb-2 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                        <img
                          src={partner.logo}
                          alt={partner.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{partner.name}</p>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Second Row - Scrolling Left (with slight delay) */}
          <div className="overflow-hidden">
            <div className="flex animate-scroll-left hover:pause-animation" style={{ animationDelay: '-30s' }}>
              {[...hiringPartners.slice(12), ...hiringPartners.slice(12), ...hiringPartners.slice(12)].map((partner, index) => (
                <div key={`row2-${index}`} className="flex-shrink-0 w-[200px] mx-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.02 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all group h-32"
                  >
                    <div className="text-center w-full">
                      <div className="w-full h-16 mx-auto mb-2 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                        <img
                          src={partner.logo}
                          alt={partner.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{partner.name}</p>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600 dark:text-slate-300 mb-4">
            And many more leading companies across the globe...
          </p>
          <Link href="/placement">
            <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950">
              View Placement Statistics
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
