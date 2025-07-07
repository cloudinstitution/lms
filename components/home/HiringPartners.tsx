"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

const hiringPartners = [
  { name: "Infosys", logo: "/companies/infosys.webp" },
  { name: "Cognizant", logo: "/companies/cognizant.webp" },
  { name: "Amazon", logo: "/companies/amazon.webp" },
  { name: "Accenture", logo: "/companies/accenture.webp" },
  { name: "Capgemini", logo: "/companies/capgemini.webp" },
  { name: "Tech Mahindra", logo: "/companies/tech-mahindra.webp" },
  { name: "LTIMindtree", logo: "/companies/ltimindtree.webp" },
  { name: "Zoho", logo: "/companies/zoho.webp" },
  { name: "Solera", logo: "/companies/solera.webp" },
  { name: "Synchronoss", logo: "/companies/synchronoss.webp" },
  { name: "Glider AI", logo: "/companies/glider-ai.webp" },
  { name: "Glass Beam", logo: "/companies/glass-beam.webp" },
  { name: "Pro Buddy", logo: "/companies/pro-buddy.webp" },
  { name: "Inito", logo: "/companies/inito.webp" },
  { name: "Avin Systems", logo: "/companies/avin-systems.webp" },
  { name: "Athmin Technologies", logo: "/companies/athmin-technologies.webp" },
  { name: "Centelon", logo: "/companies/centelon.webp" },
  { name: "Ada", logo: "/companies/ada.webp" },
  { name: "Appscrip", logo: "/companies/appscrip.webp" },
  // Adding some additional entries with AWS and Azure logos from public directory
  { name: "AWS", logo: "/AWS.png" },
  { name: "Azure", logo: "/Azure.png" },
  { name: "Java", logo: "/Java.png" },
  { name: "Data Analytics", logo: "/data_analytics.png" },
  { name: "DevOps", logo: "/DevOps.png" }
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
            Get Closer to Your Dream Company. Our Graduates are working with leading tech companies and innovative startups.
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
                        <Image
                          src={partner.logo}
                          alt={`${partner.name} logo`}
                          width={120}
                          height={60}
                          className="max-w-full max-h-full object-contain"
                          priority={index < 12}
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
                        <Image
                          src={partner.logo}
                          alt={`${partner.name} logo`}
                          width={120}
                          height={60}
                          className="max-w-full max-h-full object-contain"
                          priority={index < 12}
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
