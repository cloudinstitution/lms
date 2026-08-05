"use client"

import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { GraduationCap, Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function Header() {
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
    <header className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/cloudinstitution_logo.png" 
            alt="Cloud Institution Logo"
            width={40}
            height={40}
            className="object-contain"
          />
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
  )
}
