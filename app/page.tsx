"use client"

import {
  Header,
  HeroSection,
  FeaturedCourses,
  WhyChooseUs,
  Testimonials,
  HiringPartners,
  CTASection,
  Footer
} from "@/components/home"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedCourses />
        <WhyChooseUs />
        <Testimonials />
        <HiringPartners />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
