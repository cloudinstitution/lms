"use client"

import { GraduationCap, Mail, MapPin, Phone } from "lucide-react"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-6 w-6 text-emerald-400" />
              <span className="font-bold text-lg text-white">Cloud Institution</span>
            </Link>
            <p className="text-gray-400 mb-4">
              At Cloud Institution, your trusted tech education hub in BTM Layout, Bangalore, we provide personalized, hands-on training in AWS, Azure, Google Cloud, DevOps, and more.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61567161840746"
                target="_blank"
                rel="noopener noreferrer"
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
                href="https://x.com/CloudInst_BTM"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <span className="sr-only">Twitter</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/cloud-institution"
                target="_blank"
                rel="noopener noreferrer"
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
              <a
                href="https://www.instagram.com/cloud_institution/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <span className="sr-only">Instagram</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/channel/UCrMKIBo2--UZ7vHTI_0uxVg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <span className="sr-only">YouTube</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-emerald-400">Top Courses</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/courses/aws-certification" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  AWS Certification Training
                </Link>
              </li>
              <li>
                <Link href="/courses/azure-certification" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Azure Certification Training
                </Link>
              </li>
              <li>
                <Link href="/courses/google-cloud" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Google Cloud Certification
                </Link>
              </li>
              <li>
                <Link href="/courses/kubernetes" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Kubernetes Training
                </Link>
              </li>
              <li>
                <Link href="/courses/ui-ux-design" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  UI/UX Design
                </Link>
              </li>
              <li>
                <Link href="/courses/python-fullstack" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Python Full Stack Training
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-emerald-400">About</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Top Blogs
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-emerald-400">Contact Us</h3>
            <address className="not-italic text-gray-400 space-y-2">
              <div className="mb-4">
                <h4 className="font-medium text-white mb-2">Bangalore</h4>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <p>
                    No 15, 20th Main, 100ft Ring Road,<br />
                    BTM 2nd Stage, Bangalore – 560076
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Phone className="h-5 w-5 text-emerald-400" />
                  <p>+91 76763 70336</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Coimbatore</h4>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <p>
                    229, Sathyamurthy Rd, Peranaidu Layout,<br />
                    Coimbatore, Tamil Nadu 641009
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Phone className="h-5 w-5 text-emerald-400" />
                  <p>+91 84319 66507</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <Mail className="h-5 w-5 text-emerald-400" />
                <p>info@cloudinstitution.com</p>
              </div>
            </address>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Cloud Institution. All rights reserved. | Powered By Cloud Institution</p>
        </div>
      </div>
    </footer>
  )
}
