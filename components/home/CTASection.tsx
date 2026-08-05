"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Phone } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function CTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-900 dark:to-emerald-800 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern opacity-10"></div>
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white dark:text-slate-100">
            Start Your Journey Today!
          </h2>
          <p className="max-w-2xl mx-auto mb-8 text-white/90 dark:text-slate-200 text-lg">
            Join thousands of students who have transformed their careers with our courses. Get industry-recognized certification and guaranteed placement assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+917676370336">
              <Button size="lg" variant="secondary" className="gap-2 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Phone className="h-4 w-4" />
                Call Now: +91 76763 70336
              </Button>
            </a>
            <Link href="/courses">
              <Button size="lg" className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
                Explore Courses <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://api.whatsapp.com/send?phone=917676370336" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white dark:border-slate-200 text-white dark:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800"
              >
                WhatsApp Us
              </Button>
            </a>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Expert Trainers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>100% Placement Support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Industry Certification</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
