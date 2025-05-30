"use client"
import StudentLayout from "@/components/student-layout"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Building, Search, MessageSquare, ArrowLeft } from "lucide-react"

type Company = {
  id: string
  companyName: string
  createdAt: Date
}

type QuestionAnswer = {
  id: string
  question: string
  answer: string
}

const StudentView = () => {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionAnswer[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
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
        console.error("Error fetching companies:", error)
      }
    }

    fetchCompanies()
  }, [])

  const handleCompanyClick = async (companyId: string) => {
    if (selectedCompany === companyId) {
      setSelectedCompany(null)
      setQuestions([])
      return
    }

    try {
      const q = collection(db, `companies/${companyId}/questions`)
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

      setSelectedCompany(companyId)
      setQuestions(questionsData)
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const filteredCompanies = companies.filter((company) =>
    company.companyName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center">
            <Building className="h-6 w-6 mr-2 text-purple-500" /> Explore Companies
          </h1>
          <Button
            onClick={() => router.push("/student/dashboard")}
            className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company List */}
          <Card className="md:col-span-1 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900 rounded-t-lg">
              <CardTitle className="flex items-center text-slate-800 dark:text-slate-100">
                <Building className="h-5 w-5 text-purple-500 mr-2" /> Companies
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search companies..."
                  className="pl-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto p-3">
              {filteredCompanies.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No companies found.</p>
              ) : (
                filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className={`p-3 rounded-md cursor-pointer font-medium transition-colors ${
                      selectedCompany === company.id
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-l-4 border-purple-500"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                    onClick={() => handleCompanyClick(company.id)}
                  >
                    {company.companyName}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Questions and Answers */}
          <Card className="md:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900 rounded-t-lg">
              <CardTitle className="flex items-center text-slate-800 dark:text-slate-100">
                <MessageSquare className="h-5 w-5 text-purple-500 mr-2" />
                {selectedCompany
                  ? `Q&A for ${companies.find((c) => c.id === selectedCompany)?.companyName}`
                  : "Select a company to view questions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedCompany && (
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">No questions found for this company.</p>
                    </div>
                  ) : (
                    questions.map((qa, index) => (
                      <Card
                        key={qa.id}
                        className="p-0 overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-start">
                            <span className="flex-shrink-0 flex items-center justify-center bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 w-6 h-6 rounded-full text-xs mr-2 mt-0.5">
                              Q
                            </span>
                            <span>{qa.question}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-950">
                          <div className="text-slate-700 dark:text-slate-300 flex items-start">
                            <span className="flex-shrink-0 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 w-6 h-6 rounded-full text-xs mr-2 mt-0.5">
                              A
                            </span>
                            <span>{qa.answer}</span>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
              {!selectedCompany && (
                <div className="text-center py-16">
                  <Building className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">Click on a company to view its questions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  )
}

export default StudentView
