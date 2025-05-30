import type React from "react"
import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-emerald-600" />
            <span className="font-bold text-xl text-emerald-800">Cloud Institution</span>
          </Link>

          {/* Navigation links removed as requested */}

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                Login
              </Button>
            </Link>
            
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-emerald-400" />
                <span className="font-bold text-lg text-white">Cloud Institution</span>
              </Link>
              <p className="text-gray-400">
                Empowering individuals with the skills they need to succeed in the digital world.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-400">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/courses" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    Courses
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-gray-400 hover:text-emerald-400 transition-colors">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-emerald-400">Courses</h3>
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
                <p>No 15, 20th Main, 100ft ring road, BTM</p>
                <p>2nd stage, Bangalore-560076</p>
                <p className="mt-2">Email: info@cloudinstitution.com</p>
                <p>Phone: +91 7676370336</p>
              </address>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Cloud Institution. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
