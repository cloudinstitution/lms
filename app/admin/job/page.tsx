"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import {
  Briefcase,
  Building,
  Edit,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"

type JobType = "Full-time" | "Part-time" | "Internship" | "Contract"
type JobStatus = "Open" | "Closed"

type Job = {
  id: string
  title: string
  company: string
  location: string
  jobType: JobType
  description: string
  requirements: string
  applyLink?: string
  deadline: string // yyyy-mm-dd
  status: JobStatus
  createdAt: Date
  applicantCount?: number
}

type Applicant = {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  appliedAt: Date
}

const emptyForm = {
  title: "",
  company: "",
  location: "",
  jobType: "Full-time" as JobType,
  description: "",
  requirements: "",
  applyLink: "",
  deadline: "",
}

const AdminJobsPage = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)

  const [viewingApplicantsFor, setViewingApplicantsFor] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      const jobsData: Job[] = []

      for (const jobDoc of snapshot.docs) {
        const data = jobDoc.data()
        jobsData.push({
          id: jobDoc.id,
          title: data.title,
          company: data.company,
          location: data.location,
          jobType: data.jobType,
          description: data.description,
          requirements: data.requirements || "",
          applyLink: data.applyLink || "",
          deadline: data.deadline || "",
          status: data.status || "Open",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        })
      }

      // Fetch applicant counts in parallel
      const withCounts = await Promise.all(
        jobsData.map(async (job) => {
          const appsSnap = await getDocs(
            query(collection(db, "jobApplications"), where("jobId", "==", job.id))
          )
          return { ...job, applicantCount: appsSnap.size }
        })
      )

      setJobs(withCounts)
    } catch (error) {
      toast.error("Error fetching jobs")
      console.error(error)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm(emptyForm)
    setShowForm(false)
  }

  const validateForm = (data: typeof emptyForm) => {
    if (!data.title.trim() || !data.company.trim() || !data.location.trim() || !data.description.trim()) {
      toast.error("Please fill in title, company, location and description")
      return false
    }
    return true
  }

  const handlePostJob = async () => {
    if (!validateForm(form)) return

    setLoading(true)
    try {
      await addDoc(collection(db, "jobs"), {
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim(),
        jobType: form.jobType,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        applyLink: form.applyLink.trim(),
        deadline: form.deadline,
        status: "Open",
        createdAt: new Date(),
      })

      toast.success("Job posted successfully")
      resetForm()
      fetchJobs()
    } catch (error) {
      toast.error("Error posting job")
      console.error(error)
    }
    setLoading(false)
  }

  const startEditing = (job: Job) => {
    setEditingId(job.id)
    setEditForm({
      title: job.title,
      company: job.company,
      location: job.location,
      jobType: job.jobType,
      description: job.description,
      requirements: job.requirements,
      applyLink: job.applyLink || "",
      deadline: job.deadline,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const saveEdit = async (jobId: string) => {
    if (!validateForm(editForm)) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        title: editForm.title.trim(),
        company: editForm.company.trim(),
        location: editForm.location.trim(),
        jobType: editForm.jobType,
        description: editForm.description.trim(),
        requirements: editForm.requirements.trim(),
        applyLink: editForm.applyLink.trim(),
        deadline: editForm.deadline,
      })

      setJobs(jobs.map((j) => (j.id === jobId ? { ...j, ...editForm, requirements: editForm.requirements.trim() } : j)))
      toast.success("Job updated")
      cancelEditing()
    } catch (error) {
      toast.error("Error updating job")
      console.error(error)
    }
    setLoading(false)
  }

  const toggleStatus = async (job: Job) => {
    const newStatus: JobStatus = job.status === "Open" ? "Closed" : "Open"
    try {
      await updateDoc(doc(db, "jobs", job.id), { status: newStatus })
      setJobs(jobs.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j)))
      toast.success(`Job marked as ${newStatus}`)
    } catch (error) {
      toast.error("Error updating job status")
      console.error(error)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Delete this job posting and all its applications? This cannot be undone.")) {
      return
    }

    setLoading(true)
    try {
      // Delete related applications first
      const appsSnap = await getDocs(query(collection(db, "jobApplications"), where("jobId", "==", jobId)))
      await Promise.all(appsSnap.docs.map((d) => deleteDoc(d.ref)))

      await deleteDoc(doc(db, "jobs", jobId))
      setJobs(jobs.filter((j) => j.id !== jobId))
      toast.success("Job deleted")
    } catch (error) {
      toast.error("Error deleting job")
      console.error(error)
    }
    setLoading(false)
  }

  const openApplicants = async (job: Job) => {
    setViewingApplicantsFor(job)
    setApplicantsLoading(true)
    try {
      const q = query(collection(db, "jobApplications"), where("jobId", "==", job.id), orderBy("appliedAt", "desc"))
      const snap = await getDocs(q)
      const data: Applicant[] = snap.docs.map((d) => {
        const a = d.data()
        return {
          id: d.id,
          studentId: a.studentId,
          studentName: a.studentName,
          studentEmail: a.studentEmail,
          appliedAt: a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(),
        }
      })
      setApplicants(data)
    } catch (error) {
      toast.error("Error fetching applicants")
      console.error(error)
    }
    setApplicantsLoading(false)
  }

  const filteredJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.company.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [jobs, searchQuery]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" /> Jobs Management
        </h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Cancel" : "Post a Job"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Job Posting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Job title (e.g. Frontend Developer)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Input
                placeholder="Company name"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
              <Input
                placeholder="Location (e.g. Bengaluru / Remote)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <Select
                value={form.jobType}
                onValueChange={(value: JobType) => setForm({ ...form, jobType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Application deadline"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
              <Input
                placeholder="External apply link (optional)"
                value={form.applyLink}
                onChange={(e) => setForm({ ...form, applyLink: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Job description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Textarea
              placeholder="Requirements / qualifications (optional)"
              rows={3}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
            <Button onClick={handlePostJob} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Post Job
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Posted Jobs ({jobs.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                className="pl-8 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No jobs posted yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  {editingId === job.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Title"
                        />
                        <Input
                          value={editForm.company}
                          onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                          placeholder="Company"
                        />
                        <Input
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          placeholder="Location"
                        />
                        <Select
                          value={editForm.jobType}
                          onValueChange={(value: JobType) => setEditForm({ ...editForm, jobType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Internship">Internship</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={editForm.deadline}
                          onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                        />
                        <Input
                          value={editForm.applyLink}
                          onChange={(e) => setEditForm({ ...editForm, applyLink: e.target.value })}
                          placeholder="Apply link"
                        />
                      </div>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                      />
                      <Textarea
                        value={editForm.requirements}
                        onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                        rows={2}
                        placeholder="Requirements"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => saveEdit(job.id)} disabled={loading}>
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                job.status === "Open"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {job.status}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {job.jobType}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building className="h-3.5 w-3.5" /> {job.company}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {job.location}
                            </span>
                            {job.deadline && <span>Deadline: {job.deadline}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm mt-3 whitespace-pre-line">{job.description}</p>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openApplicants(job)}
                        >
                          <Users className="h-4 w-4 mr-1" /> Applicants ({job.applicantCount ?? 0})
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(job)}>
                            Mark as {job.status === "Open" ? "Closed" : "Open"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => startEditing(job)}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-600"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applicants modal (simple inline panel) */}
      {viewingApplicantsFor && (
        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Applicants for "{viewingApplicantsFor.title}"</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setViewingApplicantsFor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {applicantsLoading ? (
              <p className="text-muted-foreground text-sm">Loading applicants...</p>
            ) : applicants.length === 0 ? (
              <p className="text-muted-foreground text-sm">No applications yet for this job.</p>
            ) : (
              <div className="space-y-2">
                {applicants.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{a.studentName}</p>
                      <p className="text-sm text-muted-foreground">{a.studentEmail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Applied {a.appliedAt.toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminJobsPage
