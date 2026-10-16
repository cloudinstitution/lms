/** Server-side course catalogue. Prices here are the ONLY prices ever charged (the browser's price is never trusted). */
export interface CatalogCourse {
  id: number
  title: string
  description: string
  duration: string
  level: string
  category: string
  price: number // INR, whole rupees
}

export const CATALOG: CatalogCourse[] = [
  { id: 1, title: "Java Full Stack Web Development", description: "Master frontend and backend technologies to build complete web applications", duration: "24 weeks", level: "Intermediate", category: "Web & Application Development", price: 30000 },
  { id: 2, title: "Python Full Stack Web Development", description: "Build dynamic web applications using Python, Django, React, and REST APIs", duration: "24 weeks", level: "Beginner", category: "Web & Application Development", price: 30000 },
  { id: 3, title: "AWS", description: "Deploy and manage applications in cloud environments with CI/CD pipelines", duration: "6 weeks", level: "Advanced", category: "Cloud Computing", price: 20000 },
  { id: 4, title: "Azure", description: "Learn to architect, deploy, and manage services using Microsoft Azure", duration: "6 weeks", level: "Intermediate", category: "Cloud Computing", price: 20000 },
  { id: 5, title: "Multi-cloud", description: "Understand and work with multiple cloud platforms like AWS, Azure, and GCP", duration: "24 weeks", level: "Intermediate", category: "Cloud Computing", price: 35000 },
  { id: 6, title: "DevOps", description: "Learn CI/CD, containerization, automation, and monitoring in real-world DevOps pipelines", duration: "6 weeks", level: "Advanced", category: "DevOps & Automation", price: 20000 },
  { id: 7, title: "Multi-Cloud and DevOps", description: "Combine cloud expertise with DevOps tools to deploy scalable, reliable systems", duration: "24 weeks", level: "Advanced", category: "DevOps & Automation", price: 35000 },
  { id: 8, title: "Data Analytics", description: "Learn data analysis, visualization, and business intelligence tools for decision-making", duration: "12 weeks", level: "Intermediate", category: "Data Analytics", price: 25000 },
]

export const findCourse = (id: unknown): CatalogCourse | null => {
  const n = Number(id)
  return CATALOG.find((c) => c.id === n) ?? null
}
