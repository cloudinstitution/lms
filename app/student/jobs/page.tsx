"use client"

import StudentLayout from "@/components/student-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  AlertTriangle,
  Briefcase,
  Building,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Search,
  X,
  Upload,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import { toast } from "react-toastify"

type JobType =
  | "Full-time"
  | "Part-time"
  | "Internship"
  | "Contract"

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

// A job is "expired" once its deadline date has passed, compared at the
// day level (a deadline of today still counts as active). Jobs without a
// deadline are never considered expired.
const isJobExpired = (deadline: string): boolean => {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  if (Number.isNaN(deadlineDate.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)

  return deadlineDate < today
}

const StudentJobsPage = () => {

  // ==============================
  // STUDENT + JOB STATE
  // ==============================

  const [studentData, setStudentData] =
    useState<any>(null)

  const [jobs, setJobs] =
    useState<Job[]>([])

  const [appliedJobIds, setAppliedJobIds] =
    useState<Set<string>>(new Set())

  const [loading, setLoading] =
    useState(true)

  const [searchTerm, setSearchTerm] =
    useState("")


  // ==============================
  // APPLICATION FORM STATE
  // ==============================

  const [showApplicationForm, setShowApplicationForm] =
    useState(false)

  const [selectedJob, setSelectedJob] =
    useState<Job | null>(null)

  const [applicationName, setApplicationName] =
    useState("")

  const [applicationEmail, setApplicationEmail] =
    useState("")

  const [applicationPhone, setApplicationPhone] =
    useState("")

  const [applicationExperience, setApplicationExperience] =
    useState("")

  const [resume, setResume] =
    useState<File | null>(null)

  const [submittingApplication, setSubmittingApplication] =
    useState(false)


  // ==============================
  // LOAD STUDENT + JOBS
  // ==============================

  useEffect(() => {

    const data = getStudentSession()

    setStudentData(data)

    loadJobs(data)

  }, [])


  // ==============================
  // LOAD JOBS
  // ==============================

  const loadJobs = async (student: any) => {

    setLoading(true)

    try {

      // ==============================
      // LOAD OPEN JOBS
      // ==============================

      const q = query(
        collection(db, "jobs"),
        where("status", "==", "Open"),
        orderBy("createdAt", "desc")
      )

      const snapshot =
        await getDocs(q)

      const jobsData: Job[] =
        snapshot.docs.map((d) => {

          const data = d.data()

          return {
            id: d.id,

            title:
              data.title || "",

            company:
              data.company || "",

            location:
              data.location || "",

            jobType:
              data.jobType,

            description:
              data.description || "",

            requirements:
              data.requirements || "",

            applyLink:
              data.applyLink || "",

            deadline:
              data.deadline || "",

            status:
              data.status,

            createdAt:
              data.createdAt?.toDate
                ? data.createdAt.toDate()
                : new Date(),
          }

        })

      setJobs(jobsData)


      // ==============================
      // FIND ALREADY APPLIED JOBS
      // ==============================

      const studentId =
        student?.id ||
        student?.studentId

      if (studentId) {

        const appsSnap =
          await getDocs(
            query(
              collection(
                db,
                "jobApplications"
              ),
              where(
                "studentId",
                "==",
                studentId
              )
            )
          )

        const appliedIds =
          appsSnap.docs
            .map(
              (d) =>
                d.data().jobId
            )
            .filter(Boolean)

        setAppliedJobIds(
          new Set(appliedIds)
        )

      } else {

        setAppliedJobIds(
          new Set()
        )

      }

    } catch (error) {

      console.error(
        "Error loading jobs:",
        error
      )

      toast.error(
        "Error loading jobs"
      )

    } finally {

      setLoading(false)

    }

  }


  // ==============================
  // OPEN APPLICATION FORM
  // ==============================

  const handleApply = (job: Job) => {

    if (isJobExpired(job.deadline)) {

      toast.error(
        "This job's application deadline has passed."
      )

      return

    }


    if (!studentData) {

      toast.error(
        "Please log in again to apply"
      )

      return

    }


    const studentId =
      studentData.id ||
      studentData.studentId


    if (!studentId) {

      toast.error(
        "Could not identify your student account."
      )

      return

    }


    // ==============================
    // CHECK DUPLICATE APPLICATION
    // ==============================

    if (
      appliedJobIds.has(
        job.id
      )
    ) {

      toast.info(
        "You've already applied to this job"
      )

      return

    }


    // ==============================
    // SELECT JOB
    // ==============================

    setSelectedJob(job)


    // ==============================
    // PREFILL STUDENT DETAILS
    // ==============================

    setApplicationName(
      studentData.name || ""
    )

    setApplicationEmail(
      studentData.email ||
      studentData.username ||
      ""
    )

    setApplicationPhone(
      studentData.phone || ""
    )

    setApplicationExperience("")

    setResume(null)

    setShowApplicationForm(true)

  }


  // ==============================
  // CLOSE APPLICATION FORM
  // ==============================

  const closeApplicationForm = () => {

    if (
      submittingApplication
    ) {

      return

    }


    setShowApplicationForm(false)

    setSelectedJob(null)

    setApplicationName("")

    setApplicationEmail("")

    setApplicationPhone("")

    setApplicationExperience("")

    setResume(null)

  }


  // ==============================
  // RESUME VALIDATION
  // ==============================

  const handleResumeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0]

    if (!file) {

      setResume(null)

      return

    }


    // ==============================
    // ALLOWED FILE TYPES
    // ==============================

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
    ]


    const extension =
      "." +
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()


    if (
      !extension ||
      !allowedExtensions.includes(
        extension
      )
    ) {

      toast.error(
        "Please upload a PDF, DOC, or DOCX resume."
      )

      e.target.value = ""

      setResume(null)

      return

    }


    // ==============================
    // MAXIMUM 5 MB
    // ==============================

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      toast.error(
        "Resume must be smaller than 5 MB."
      )

      e.target.value = ""

      setResume(null)

      return

    }


    setResume(file)

  }


  // ==============================
  // SUBMIT APPLICATION
  // ==============================

  const handleSubmitApplication = async (
    e: React.FormEvent
  ) => {

    e.preventDefault()


    if (!selectedJob) {

      return

    }


    // ==============================
    // VALIDATION
    // ==============================

    if (
      !applicationName.trim()
    ) {

      toast.error(
        "Please enter your name"
      )

      return

    }


    if (
      !applicationEmail.trim()
    ) {

      toast.error(
        "Please enter your email"
      )

      return

    }


    if (
      !applicationPhone.trim()
    ) {

      toast.error(
        "Please enter your phone number"
      )

      return

    }


    if (!resume) {

      toast.error(
        "Please select your resume"
      )

      return

    }


    const studentId =
      studentData?.id ||
      studentData?.studentId


    if (!studentId) {

      toast.error(
        "Student information not found. Please login again."
      )

      return

    }


    // ==============================
    // PREVENT DUPLICATE APPLICATION
    // ==============================

    if (
      appliedJobIds.has(
        selectedJob.id
      )
    ) {

      toast.info(
        "You've already applied to this job"
      )

      closeApplicationForm()

      return

    }


    setSubmittingApplication(true)


    try {

      // ==================================================
      // CREATE FORM DATA FOR EMAIL API
      // ==================================================

      const formData =
        new FormData()


      formData.append(
        "name",
        applicationName.trim()
      )


      formData.append(
        "email",
        applicationEmail.trim()
      )


      formData.append(
        "phone",
        applicationPhone.trim()
      )


      formData.append(
        "experience",
        applicationExperience.trim()
      )


      formData.append(
        "studentId",
        studentId
      )


      formData.append(
        "jobId",
        selectedJob.id
      )


      formData.append(
        "jobTitle",
        selectedJob.title
      )


      formData.append(
        "company",
        selectedJob.company
      )


      formData.append(
        "location",
        selectedJob.location
      )


      formData.append(
        "jobType",
        selectedJob.jobType
      )


      formData.append(
        "resume",
        resume
      )


      // ==================================================
      // SEND EMAIL THROUGH NEXT.JS API
      // ==================================================

      const response =
        await fetch(
          "/student/jobs/api/send",
          {
            method: "POST",
            body: formData,
          }
        )


      const result =
        await response.json()


      // ==================================================
      // CHECK API RESPONSE
      // ==================================================

      if (!response.ok) {

        throw new Error(
          result.message ||
          "Failed to submit application"
        )

      }


      // ==================================================
      // SAVE APPLICATION TO FIRESTORE
      // ==================================================

      const applicationData = {

        // Student information

        studentId:
          studentId,

        studentName:
          applicationName.trim(),

        studentEmail:
          applicationEmail.trim(),

        studentPhone:
          applicationPhone.trim(),


        // Job information

        jobId:
          selectedJob.id,

        jobTitle:
          selectedJob.title,

        company:
          selectedJob.company,

        location:
          selectedJob.location,

        jobType:
          selectedJob.jobType,


        // Application information

        experience:
          applicationExperience.trim(),

        resumeName:
          resume.name,

        resumeType:
          resume.type,

        resumeSize:
          resume.size,


        // Application status

        status:
          "Applied",


        // Timestamp

        appliedAt:
          new Date(),

        createdAt:
          new Date(),

      }


      await addDoc(
        collection(
          db,
          "jobApplications"
        ),
        applicationData
      )


      // ==================================================
      // UPDATE LOCAL APPLIED STATE
      // ==================================================

      setAppliedJobIds(
        (previous) => {

          const updated =
            new Set(previous)

          updated.add(
            selectedJob.id
          )

          return updated

        }
      )


      // ==================================================
      // SUCCESS
      // ==================================================

      toast.success(
        "Application submitted successfully!"
      )


      // ==================================================
      // CLOSE FORM
      // ==================================================

      closeApplicationForm()

    } catch (error) {

      console.error(
        "Application error:",
        error
      )


      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit application"
      )

    } finally {

      setSubmittingApplication(false)

    }

  }


  // ==============================
  // FILTER JOBS
  // ==============================

  const filteredJobs =
    useMemo(
      () => {

        const search =
          searchTerm.toLowerCase()


        return jobs.filter(
          (job) =>

            job.title
              .toLowerCase()
              .includes(search) ||

            job.company
              .toLowerCase()
              .includes(search) ||

            job.location
              .toLowerCase()
              .includes(search)
        )

      },
      [
        jobs,
        searchTerm,
      ]
    )


  // ==============================
  // UI
  // ==============================

  return (

    <StudentLayout>

      <div className="container mx-auto px-4 py-8">

        {/* ==============================
             HEADER
        ============================== */}

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">

          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center">

            <Briefcase className="h-6 w-6 mr-2 text-purple-500" />

            Job Opportunities

          </h1>


          <div className="relative">

            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />

            <Input
              placeholder="Search by title, company, location..."
              className="pl-8 w-72 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
            />

          </div>

        </div>


        {/* ==============================
             JOB LIST
        ============================== */}

        {loading ? (

          <p className="text-center text-slate-500 dark:text-slate-400 py-12">

            Loading jobs...

          </p>

        ) : filteredJobs.length === 0 ? (

          <div className="text-center py-16 border border-dashed rounded-lg border-slate-300 dark:border-slate-700">

            <Briefcase className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />

            <p className="text-slate-500 dark:text-slate-400">

              No open positions right now.
              Check back soon!

            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {filteredJobs.map(
              (job) => {

                const alreadyApplied =
                  appliedJobIds.has(
                    job.id
                  )

                const expired =
                  isJobExpired(
                    job.deadline
                  )

                return (

                  <Card
                    key={job.id}
                    className={`shadow-sm hover:shadow-md transition-shadow ${
                      expired
                        ? "border-red-200 dark:border-red-900/50"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >

                    <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900 rounded-t-lg pb-3">

                      <div className="flex items-start justify-between gap-2">

                        <CardTitle className="text-lg text-slate-800 dark:text-slate-100">

                          {job.title}

                        </CardTitle>


                        <div className="flex items-center gap-1.5 flex-wrap justify-end">

                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap">

                            {job.jobType}

                          </span>

                          {expired && (

                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-medium whitespace-nowrap">

                              <AlertTriangle className="h-3 w-3" />

                              Expired

                            </span>

                          )}

                        </div>

                      </div>


                      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-3 flex-wrap pt-1">

                        <span className="flex items-center gap-1">

                          <Building className="h-3.5 w-3.5" />

                          {job.company}

                        </span>


                        <span className="flex items-center gap-1">

                          <MapPin className="h-3.5 w-3.5" />

                          {job.location}

                        </span>

                      </div>

                    </CardHeader>


                    <CardContent className="pt-4 flex flex-col h-full">

                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-4">

                        {job.description}

                      </p>


                      {job.requirements && (

                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">

                          <span className="font-medium">

                            Requirements:

                          </span>{" "}

                          {job.requirements}

                        </p>

                      )}


                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">

                        {job.deadline ? (

                          <span
                            className={`text-xs flex items-center gap-1 ${
                              expired
                                ? "text-red-600 dark:text-red-400 font-medium"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >

                            <CalendarClock className="h-3.5 w-3.5" />

                            {expired
                              ? "Deadline passed on "
                              : "Apply by "}

                            {job.deadline}

                          </span>

                        ) : (

                          <span />

                        )}


                        <div className="flex items-center gap-2">

                          {job.applyLink && (

                            <a
                              href={
                                job.applyLink
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >

                              <Button
                                variant="outline"
                                size="sm"
                              >

                                <ExternalLink className="h-3.5 w-3.5 mr-1" />

                                Details

                              </Button>

                            </a>

                          )}


                          <Button
                            size="sm"
                            disabled={
                              alreadyApplied ||
                              expired
                            }
                            onClick={() =>
                              handleApply(
                                job
                              )
                            }
                            className={
                              alreadyApplied
                                ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
                                : expired
                                ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-700"
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                            }
                          >

                            {alreadyApplied ? (

                              <>

                                <CheckCircle2 className="h-4 w-4 mr-1" />

                                Applied

                              </>

                            ) : expired ? (

                              "Applications Closed"

                            ) : (

                              "Apply Now"

                            )}

                          </Button>

                        </div>

                      </div>

                    </CardContent>

                  </Card>

                )

              }
            )}

          </div>

        )}


        {/* =====================================================
             APPLICATION FORM MODAL
        ===================================================== */}

        {showApplicationForm &&
          selectedJob && (

            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
              onMouseDown={(e) => {

                if (
                  e.target ===
                    e.currentTarget &&
                  !submittingApplication
                ) {

                  closeApplicationForm()

                }

              }}
            >

              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

                <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900">

                  <div className="flex items-center justify-between">

                    <div>

                      <CardTitle className="text-xl">

                        Apply for{" "}

                        {selectedJob.title}

                      </CardTitle>

                      <p className="text-sm text-slate-500 mt-1">

                        {selectedJob.company}

                      </p>

                    </div>


                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={
                        closeApplicationForm
                      }
                      disabled={
                        submittingApplication
                      }
                    >

                      <X className="h-5 w-5" />

                    </Button>

                  </div>

                </CardHeader>


                <CardContent className="pt-6">

                  <form
                    onSubmit={
                      handleSubmitApplication
                    }
                    className="space-y-5"
                  >

                    {/* ==============================
                         NAME
                    ============================== */}

                    <div>

                      <label className="text-sm font-medium">

                        Full Name

                      </label>

                      <Input
                        className="mt-1"
                        value={
                          applicationName
                        }
                        onChange={(e) =>
                          setApplicationName(
                            e.target.value
                          )
                        }
                        placeholder="Enter your full name"
                        required
                      />

                    </div>


                    {/* ==============================
                         EMAIL
                    ============================== */}

                    <div>

                      <label className="text-sm font-medium">

                        Email

                      </label>

                      <Input
                        type="email"
                        className="mt-1"
                        value={
                          applicationEmail
                        }
                        onChange={(e) =>
                          setApplicationEmail(
                            e.target.value
                          )
                        }
                        placeholder="Enter your email"
                        required
                      />

                    </div>


                    {/* ==============================
                         PHONE
                    ============================== */}

                    <div>

                      <label className="text-sm font-medium">

                        Phone Number

                      </label>

                      <Input
                        type="tel"
                        className="mt-1"
                        value={
                          applicationPhone
                        }
                        onChange={(e) =>
                          setApplicationPhone(
                            e.target.value
                          )
                        }
                        placeholder="Enter your phone number"
                        required
                      />

                    </div>


                    {/* ==============================
                         EXPERIENCE
                    ============================== */}

                    <div>

                      <label className="text-sm font-medium">

                        Experience / Skills

                      </label>

                      <textarea
                        className="mt-1 w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                        value={
                          applicationExperience
                        }
                        onChange={(e) =>
                          setApplicationExperience(
                            e.target.value
                          )
                        }
                        placeholder="Describe your experience, skills, internships, projects, etc."
                      />

                    </div>


                    {/* ==============================
                         RESUME
                    ============================== */}

                    <div>

                      <label className="text-sm font-medium">

                        Resume

                      </label>

                      <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 hover:bg-slate-50 dark:hover:bg-slate-900">

                        <Upload className="h-5 w-5 text-purple-500" />

                        <span className="text-sm text-slate-600 dark:text-slate-400">

                          {resume
                            ? resume.name
                            : "Choose your resume (PDF/DOC/DOCX)"}

                        </span>

                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={
                            handleResumeChange
                          }
                        />

                      </label>

                      <p className="text-xs text-slate-500 mt-1">

                        Maximum file size: 5 MB

                      </p>

                    </div>


                    {/* ==============================
                         BUTTONS
                    ============================== */}

                    <div className="flex justify-end gap-3 pt-3">

                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          closeApplicationForm
                        }
                        disabled={
                          submittingApplication
                        }
                      >

                        Cancel

                      </Button>


                      <Button
                        type="submit"
                        disabled={
                          submittingApplication
                        }
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >

                        {submittingApplication
                          ? "Sending Application..."
                          : "Submit Application"}

                      </Button>

                    </div>

                  </form>

                </CardContent>

              </Card>

            </div>

          )}

      </div>

    </StudentLayout>

  )

}

export default StudentJobsPage
