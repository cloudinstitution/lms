"use client"

import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { GraduationCap, Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Fix hydration error by waiting for component to mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Helper function to check if a link is active
  const isActive = (path: string) => {
    if (!mounted) return false // Return false during SSR
    if (path === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(path)
  }

  // Helper function to get link classes with active state
  const getLinkClasses = (path: string) => {
    const baseClasses = "text-sm font-medium transition-colors"
    const activeClasses = "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 pb-1"
    const inactiveClasses = "hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400"
    
    return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
            <span className="font-bold text-xl text-emerald-800 dark:text-emerald-400">Cloud Institution</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/courses" className={getLinkClasses("/courses")}>
              Courses
            </Link>
            <Link href="/about" className={getLinkClasses("/about")}>
              About Us
            </Link>
            <Link href="/" className={getLinkClasses("/")}>
              Home
            </Link>
            <Link href="#testimonials" className="text-sm font-medium hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors">
              Testimonials
            </Link>
            <Link href="/contact" className={getLinkClasses("/contact")}>
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
              {mounted ? (
                theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Link href="/login">
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950 hidden md:inline-flex">
                Login
              </Button>
            </Link>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col space-y-4">
                <Link href="/courses" className={`${getLinkClasses("/courses")} block`}>
                  Courses
                </Link>
                <Link href="/about" className={`${getLinkClasses("/about")} block`}>
                  About Us
                </Link>
                <Link href="/" className={`${getLinkClasses("/")} block`}>
                  Home
                </Link>
                <Link href="#testimonials" className="text-sm font-medium hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors block">
                  Testimonials
                </Link>
                <Link href="/contact" className={`${getLinkClasses("/contact")} block`}>
                  Contact
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950">
                    Login
                  </Button>
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-slate-950 text-slate-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-emerald-500" />
                <span className="font-bold text-lg text-slate-50">Cloud Institution</span>
              </Link>
              <p className="text-slate-400">
                Empowering individuals with the skills they need to succeed in the digital world.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-500">Quick Links</h3>
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
              <address className="not-italic text-gray-400">
                <p>Cloud Institution</p>
                <p>123 Learning Street</p>
                <p>Education City, 12345</p>
              </address>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-400">Follow Us</h3>
              <div className="flex space-x-4">
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
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
