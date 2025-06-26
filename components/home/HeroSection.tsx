"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Phone } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useKeenSlider } from "keen-slider/react"
import "keen-slider/keen-slider.min.css"

const heroSlides = [
  {
    title: "Launch Your Tech Career with Expert Training",
    subtitle: "Guaranteed Career Advancement Training Programs",
    description: "Gain in-demand skills with our industry-focused courses in AWS, Azure, Google Cloud, and more.",
    image: "/AWS.png",
    cta: "Explore AWS Courses",
    ctaLink: "/courses/aws"
  },
  {
    title: "Master Cloud Computing & DevOps",
    subtitle: "Industry Recognized Certification",
    description: "Deploy and manage applications in cloud environments with hands-on CI/CD pipeline training.",
    image: "/DevOps.png",
    cta: "Start Learning",
    ctaLink: "/courses/devops"
  },
  {
    title: "Transform Your Career in 45 Hours",
    subtitle: "Expert Trainer Support & Placement Assistance",
    description: "Join thousands of successful graduates working with our 300+ hiring partners.",
    image: "/Azure.png",
    cta: "Contact Now",
    ctaLink: "/contact"
  },
  {
    title: "Azure Cloud Mastery Program",
    subtitle: "Microsoft Certified Training",
    description: "Become a Microsoft Azure expert with comprehensive hands-on training and certification prep.",
    image: "/Azure.png",
    cta: "Learn Azure",
    ctaLink: "/courses/azure"
  },
  {
    title: "Full-Stack Development Bootcamp",
    subtitle: "360 Hours Comprehensive Training",
    description: "Master modern web development with Python, React, and industry-best practices.",
    image: "/Java.png",
    cta: "Join Bootcamp",
    ctaLink: "/courses/fullstack"
  },
  {
    title: "Data Analytics & AI Program",
    subtitle: "Future-Ready Skills",
    description: "Learn data science, machine learning, and AI to drive business decisions.",
    image: "/data_analytics.png",
    cta: "Explore Program",
    ctaLink: "/courses/data-analytics"
  }
]

export default function HeroSection() {
  const [heroSliderRef] = useKeenSlider(
    {
      loop: true,
      dragSpeed: 0.5,
    },
    [
      (slider) => {
        let timeout: ReturnType<typeof setTimeout>
        let mouseOver = false
        function clearNextTimeout() {
          clearTimeout(timeout)
        }
        function nextTimeout() {
          clearTimeout(timeout)
          if (mouseOver) return
          timeout = setTimeout(() => {
            slider.next()
          }, 2000)
        }
        slider.on("created", () => {
          slider.container.addEventListener("mouseover", () => {
            mouseOver = true
            clearNextTimeout()
          })
          slider.container.addEventListener("mouseout", () => {
            mouseOver = false
            nextTimeout()
          })
          nextTimeout()
        })
        slider.on("dragStarted", clearNextTimeout)
        slider.on("animationEnded", nextTimeout)
        slider.on("updated", nextTimeout)
      },
    ]
  )

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 min-h-screen flex items-center">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div ref={heroSliderRef} className="keen-slider w-full">
        {heroSlides.map((slide, index) => (
          <div key={index} className="keen-slider__slide">
            <div className="container mx-auto px-4 py-16 grid lg:grid-cols-5 gap-6 lg:gap-8 items-center justify-center relative z-10 min-h-screen">
              <motion.div 
                className="lg:col-span-2 space-y-4 lg:space-y-6 text-center lg:text-left"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full text-xs lg:text-sm font-medium">
                  {slide.subtitle}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight text-gray-900 dark:text-slate-100">
                  {slide.title}
                </h1>
                <p className="text-sm lg:text-base text-gray-600 dark:text-slate-300 leading-relaxed">
                  {slide.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center lg:justify-start">
                  <Link href={slide.ctaLink}>
                    <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-sm lg:text-base px-6 py-3">
                      {slide.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="tel:+917676370336">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950 text-xs lg:text-sm px-4 py-3"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now: +91 76763 70336
                    </Button>
                  </a>
                </div>
              </motion.div>
              <motion.div 
                className="lg:col-span-3 relative flex justify-center lg:justify-end"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="relative">
                  <div className="relative">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-[400px] sm:w-[500px] lg:w-[600px] xl:w-[700px] h-[300px] sm:h-[375px] lg:h-[450px] xl:h-[525px] object-contain drop-shadow-2xl relative z-10"
                    />
                    
                    <div className="absolute inset-0 w-[400px] sm:w-[500px] lg:w-[600px] xl:w-[700px] h-[150px] sm:h-[200px] lg:h-[250px] xl:h-[300px] top-1/2 -translate-y-1/2">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-xl opacity-25"></div>
                      <div className="absolute inset-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur-lg opacity-20"></div>
                      <div className="absolute inset-4 bg-emerald-500 rounded-lg blur-md opacity-15"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
