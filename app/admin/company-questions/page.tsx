"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Edit, Save, X, Building, MessageSquare, Search } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, deleteDoc, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore"
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

  return (
    <div className="container mx-auto p-6 bg-gradient-to-b from-white to-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-primary">Company Questions Dashboard</h1>

      {/* Add Company Section */}
      <Card className="mb-8 border-slate-200 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl text-primary">Add New Company</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="flex-1 border-slate-200 focus-visible:ring-primary/30"
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
        {/* Companies List */}
        <Card className="md:col-span-1 border-slate-200 shadow-lg h-fit">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl text-primary">Companies</CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 w-full border-slate-200 focus-visible:ring-primary/30"
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
                  <div
                    key={company.id}
                    className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-all ${
                      selectedCompany === company.id
                        ? "bg-primary/15 border-l-4 border-primary shadow-sm"
                        : "hover:bg-slate-100 border-l-4 border-transparent"
                    }`}
                    onClick={() => setSelectedCompany(company.id)}
                  >
                    <span className="font-medium truncate">{company.companyName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCompany(company.id)
                      }}
                      className="opacity-60 hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions & Answers Section */}
        <Card className="md:col-span-2 border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl text-primary">
                {selectedCompany
                  ? `Questions for ${companies.find((c) => c.id === selectedCompany)?.companyName}`
                  : "Select a company to manage questions"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {selectedCompany ? (
              <>
                {/* Add Question Form */}
                <div className="mb-6 space-y-4 p-5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                  <h3 className="font-medium text-primary">Add New Question</h3>
                  <Input
                    placeholder="Enter question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="border-slate-200 focus-visible:ring-primary/30"
                  />
                  <Textarea
                    placeholder="Enter answer"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={3}
                    className="border-slate-200 focus-visible:ring-primary/30 min-h-[100px]"
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
                  {questions.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                      <p className="text-slate-500">No questions added yet</p>
                    </div>
                  ) : (
                    questions.map((qa) => (
                      <Card key={qa.id} className="p-4 border-slate-200 hover:shadow-md transition-all">
                        {editingId === qa.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                              placeholder="Question"
                              className="border-slate-200 focus-visible:ring-primary/30"
                            />
                            <Textarea
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              placeholder="Answer"
                              rows={3}
                              className="border-slate-200 focus-visible:ring-primary/30 min-h-[100px]"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => qa.id && saveEdit(qa.id)}
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90"
                              >
                                <Save className="h-4 w-4 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold mb-2 text-primary">Q: {qa.question}</div>
                            <div className="text-slate-700 mb-3 bg-slate-50 p-3 rounded-md border border-slate-100">
                              A: {qa.answer}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(qa)}
                                className="border-primary/20 text-primary hover:bg-primary/10"
                              >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
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
            ) : (
              <div className="text-center py-16 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a company from the list to manage its questions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
