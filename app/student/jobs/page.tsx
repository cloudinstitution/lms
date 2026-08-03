"use client"

import StudentLayout from "@/components/student-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore"
import {
  Briefcase,
  Building,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Search,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"

type JobType = "Full-time" | "Part-time" | "Internship" | "Contract"

type Job = {
  id: string
  title: string
  company: string
  location: string
  jobType: JobType
  description: string
  requirements: string
  applyLink?: string
  deadline: string
  status: "Open" | "Closed"
  createdAt: Date
}

const StudentJobsPage = () => {
  const [studentData, setStudentData] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const data = getStudentSession()
    setStudentData(data)
    loadJobs(data)
  }, [])

  const loadJobs = async (student: any) => {
    setLoading(true)
    try {
      const q = query(
        collection(db, "jobs"),
        where("status", "==", "Open"),
        orderBy("createdAt", "desc")
      )
      const snapshot = await getDocs(q)
      const jobsData: Job[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          title: data.title,
          company: data.company,
          location: data.location,
          jobType: data.jobType,
          description: data.description,
          requirements: data.requirements || "",
          applyLink: data.applyLink || "",
          deadline: data.deadline || "",
          status: data.status,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        }
      })
      setJobs(jobsData)

      // Find which jobs this student already applied to
      const studentId = student?.id || student?.studentId
      if (studentId) {
        const appsSnap = await getDocs(
          query(collection(db, "jobApplications"), where("studentId", "==", studentId))
        )
        setAppliedJobIds(new Set(appsSnap.docs.map((d) => d.data().jobId)))
      }
    } catch (error) {
      toast.error("Error loading jobs")
      console.error(error)
    }
    setLoading(false)
  }

  const handleApply = async (job: Job) => {
    if (!studentData) {
      toast.error("Please log in again to apply")
      return
    }

    const studentId = studentData.id || studentData.studentId
    if (!studentId) {
      toast.error("Could not identify your student account. Please log in again.")
      return
    }

    if (appliedJobIds.has(job.id)) {
      toast.info("You've already applied to this job")
      return
    }

    setApplyingId(job.id)
    try {
      // Double-check for an existing application to avoid duplicates
      const existing = await getDocs(
        query(
          collection(db, "jobApplications"),
          where("jobId", "==", job.id),
          where("studentId", "==", studentId)
        )
      )
      if (!existing.empty) {
        toast.info("You've already applied to this job")
        setAppliedJobIds((prev) => new Set(prev).add(job.id))
        setApplyingId(null)
        return
      }

      await addDoc(collection(db, "jobApplications"), {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        studentId,
        studentName: studentData.name || "Unknown",
        studentEmail: studentData.username || studentData.email || "",
        appliedAt: new Date(),
      })

      setAppliedJobIds((prev) => new Set(prev).add(job.id))
      toast.success(`Applied to ${job.title} at ${job.company}`)
    } catch (error) {
      toast.error("Error submitting application")
      console.error(error)
    }
    setApplyingId(null)
  }

  const filteredJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.location.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [jobs, searchTerm]
  )

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center">
            <Briefcase className="h-6 w-6 mr-2 text-purple-500" /> Job Opportunities
          </h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, company, location..."
              className="pl-8 w-72 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-12">Loading jobs...</p>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-lg border-slate-300 dark:border-slate-700">
            <Briefcase className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No open positions right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredJobs.map((job) => {
              const alreadyApplied = appliedJobIds.has(job.id)
              return (
                <Card
                  key={job.id}
                  className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900 rounded-t-lg pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg text-slate-800 dark:text-slate-100">
                        {job.title}
                      </CardTitle>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap">
                        {job.jobType}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-3 flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" /> {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col h-full">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-4">
                      {job.description}
                    </p>
                    {job.requirements && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        <span className="font-medium">Requirements: </span>
                        {job.requirements}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {job.deadline ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" /> Apply by {job.deadline}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-2">
                        {job.applyLink && (
                          <a href={job.applyLink} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Details
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          disabled={alreadyApplied || applyingId === job.id}
                          onClick={() => handleApply(job)}
                          className={
                            alreadyApplied
                              ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
                              : "bg-purple-600 hover:bg-purple-700 text-white"
                          }
                        >
                          {alreadyApplied ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Applied
                            </>
                          ) : applyingId === job.id ? (
                            "Applying..."
                          ) : (
                            "Apply Now"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}

export default StudentJobsPage
