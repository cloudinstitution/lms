"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { db } from "@/lib/firebase"
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore"
import { Building, Edit, MessageSquare, Plus, Save, Search, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

type QuestionAnswer = {
  id?: string
  question: string
  answer: string
}

type Company = {
  id: string
  companyName: string
  createdAt: Date
}

const AdminDashboard = () => {
  const [companyName, setCompanyName] = useState("")
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionAnswer[]>([])
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState("")
  const [editAnswer, setEditAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch companies on load
  useEffect(() => {
    fetchCompanies()
  }, [])

  // Fetch questions when a company is selected
  useEffect(() => {
    if (selectedCompany) {
      fetchQuestions(selectedCompany)
    } else {
      setQuestions([])
    }
  }, [selectedCompany])

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, "companies"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const companiesData: Company[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        companiesData.push({
          id: doc.id,
          companyName: data.companyName,
          createdAt: data.createdAt.toDate(),
        })
      })

      setCompanies(companiesData)
    } catch (error) {
      toast.error("Error fetching companies")
      console.error(error)
    }
  }

  const fetchQuestions = async (companyId: string) => {
    try {
      const q = query(collection(db, `companies/${companyId}/questions`))
      const querySnapshot = await getDocs(q)
      const questionsData: QuestionAnswer[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        questionsData.push({
          id: doc.id,
          question: data.question,
          answer: data.answer,
        })
      })

      setQuestions(questionsData)
    } catch (error) {
      toast.error("Error fetching questions")
      console.error(error)
    }
  }

  const handleAddCompany = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name")
      return
    }

    setLoading(true)
    try {
      // Check if company already exists
      const q = query(collection(db, "companies"), where("companyName", "==", companyName.trim()))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast.error("Company already exists")
        setLoading(false)
        return
      }

      const docRef = await addDoc(collection(db, "companies"), {
        companyName: companyName.trim(),
        createdAt: new Date(),
      })

      const newCompany = {
        id: docRef.id,
        companyName: companyName.trim(),
        createdAt: new Date(),
      }

      setCompanies([newCompany, ...companies])
      setCompanyName("")
      setSelectedCompany(docRef.id)
      toast.success("Company added successfully")
    } catch (error) {
      toast.error("Error adding company")
      console.error(error)
    }
    setLoading(false)
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm("Are you sure you want to delete this company and all its questions?")) {
      return
    }

    setLoading(true)
    try {
      // First delete all questions
      const questionsSnapshot = await getDocs(collection(db, `companies/${companyId}/questions`))

      const deletePromises = questionsSnapshot.docs.map((doc) => deleteDoc(doc.ref))

      await Promise.all(deletePromises)

      // Then delete the company
      await deleteDoc(doc(db, "companies", companyId))

      setCompanies(companies.filter((company) => company.id !== companyId))

      if (selectedCompany === companyId) {
        setSelectedCompany(null)
        setQuestions([])
      }

      toast.success("Company deleted successfully")
    } catch (error) {
      toast.error("Error deleting company")
      console.error(error)
    }
    setLoading(false)
  }

  const handleAddQuestion = async () => {
    if (!selectedCompany) {
      toast.error("Please select a company first")
      return
    }

    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Please enter both question and answer")
      return
    }

    setLoading(true)
    try {
      const docRef = await addDoc(collection(db, `companies/${selectedCompany}/questions`), {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        createdAt: new Date(),
      })

      const newQA: QuestionAnswer = {
        id: docRef.id,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      }

      setQuestions([...questions, newQA])
      setNewQuestion("")
      setNewAnswer("")
      toast.success("Question added successfully")
    } catch (error) {
      toast.error("Error adding question")
      console.error(error)
    }
    setLoading(false)
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedCompany) return

    if (!window.confirm("Are you sure you want to delete this question?")) {
      return
    }

    setLoading(true)
    try {
      await deleteDoc(doc(db, `companies/${selectedCompany}/questions`, questionId))

      setQuestions(questions.filter((q) => q.id !== questionId))
      toast.success("Question deleted successfully")
    } catch (error) {
      toast.error("Error deleting question")
      console.error(error)
    }
    setLoading(false)
  }

  const startEditing = (question: QuestionAnswer) => {
    setEditingId(question.id || null)
    setEditQuestion(question.question)
    setEditAnswer(question.answer)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditQuestion("")
    setEditAnswer("")
  }

  const saveEdit = async (questionId: string) => {
    if (!selectedCompany || !questionId) return

    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error("Please enter both question and answer")
      return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, `companies/${selectedCompany}/questions`, questionId), {
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        updatedAt: new Date(),
      })

      setQuestions(
        questions.map((q) =>
          q.id === questionId ? { ...q, question: editQuestion.trim(), answer: editAnswer.trim() } : q,
        ),
      )

      cancelEditing()
      toast.success("Question updated successfully")
    } catch (error) {
      toast.error("Error updating question")
      console.error(error)
    }
    setLoading(false)
  }

  const filteredCompanies = companies.filter((company) =>
    company.companyName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (    <div className="container mx-auto p-6 bg-gradient-to-b from-slate-950 to-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-blue-400">Company Questions Dashboard</h1>

      {/* Add Company Section */}
      <Card className="mb-8 border-slate-800 shadow-lg overflow-hidden bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800">
          <div className="flex items-center gap-2">            <Building className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-xl text-blue-400">Add New Company</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="flex-1 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-400/30"
            />
            <Button
              onClick={handleAddCompany}
              disabled={loading || !companyName.trim()}
              className="bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Companies List */}        <Card className="md:col-span-1 border-slate-800 shadow-lg h-fit bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-xl text-purple-400">Companies</CardTitle>
              </div>              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 w-full bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-purple-400/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {filteredCompanies.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                  <p className="text-slate-500">No companies found</p>
                </div>
              ) : (
                filteredCompanies.map((company) => (
                  <div                    key={company.id}
                    className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-all ${
                      selectedCompany === company.id
                        ? "bg-purple-500/10 border-l-4 border-purple-400 shadow-sm"
                        : "hover:bg-slate-800/50 border-l-4 border-transparent"
                    }`}
                    onClick={() => setSelectedCompany(company.id)}
                  >                    <span className="font-medium truncate text-slate-300">{company.companyName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCompany(company.id)
                      }}
                      className="opacity-60 hover:opacity-100 hover:bg-red-950/30 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>        {/* Questions & Answers Section */}
        <Card className="md:col-span-2 border-slate-800 shadow-lg bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-xl text-blue-400">
                {selectedCompany
                  ? `Questions for ${companies.find((c) => c.id === selectedCompany)?.companyName}`
                  : "Select a company to manage questions"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {selectedCompany ? (
              <>
                {/* Add Question Form */}                <div className="mb-6 space-y-4 p-5 bg-slate-800/50 rounded-lg border border-slate-700 shadow-sm">
                  <h3 className="font-medium text-purple-400">Add New Question</h3>
                  <Input
                    placeholder="Enter question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-purple-400/30"
                  />
                  <Textarea
                    placeholder="Enter answer"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={3}
                    className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-purple-400/30 min-h-[100px]"
                  />
                  <Button
                    onClick={handleAddQuestion}
                    disabled={loading || !newQuestion.trim() || !newAnswer.trim()}
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Question
                  </Button>
                </div>

                {/* Questions List */}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {questions.length === 0 ? (                    <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg bg-slate-900/50">
                      <p className="text-slate-400">No questions added yet</p>
                    </div>
                  ) : (
                    questions.map((qa) => (                      <Card key={qa.id} className="p-4 border-slate-700 bg-slate-800/50 hover:shadow-md transition-all">
                        {editingId === qa.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                              placeholder="Question"
                              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-purple-400/30"
                            />
                            <Textarea
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              placeholder="Answer"
                              rows={3}
                              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-purple-400/30 min-h-[100px]"
                            />
                            <div className="flex justify-end gap-2">                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                className="border-red-800 text-red-400 hover:bg-red-950/30 hover:text-red-400"
                              >
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => qa.id && saveEdit(qa.id)}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Save className="h-4 w-4 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (                          <div>
                            <div className="font-semibold mb-2 text-blue-400">Q: {qa.question}</div>
                            <div className="text-slate-300 mb-3 bg-slate-800/50 p-3 rounded-md border border-slate-700">
                              A: {qa.answer}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(qa)}
                                className="border-purple-500/20 text-purple-400 hover:bg-purple-950/30 hover:border-purple-400"
                              >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-800 text-red-400 hover:bg-red-950/30 hover:text-red-400"
                                onClick={() => qa.id && handleDeleteQuestion(qa.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (              <div className="text-center py-16 border border-dashed border-slate-700 rounded-lg bg-slate-800/50">
                <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Select a company from the list to manage its questions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
