"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { db } from "@/lib/firebase"
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { AlertCircle, ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface QuestionOption {
  id: string
  text: string
}

interface Question {
  id: string
  questionText: string
  options: QuestionOption[]
  correctOptionId: string
}

let idCounter = 0
const generateId = () => {
  idCounter += 1
  return `q_${Date.now()}_${idCounter}`
}

export default function EditAssessmentPage() {
  const router = useRouter()
  const params = useParams<{ courseId: string; quizId: string }>()
  const courseId = params?.courseId as string
  const quizId = params?.quizId as string

  const [topic, setTopic] = useState("")
  const [status, setStatus] = useState("active")
  const [questions, setQuestions] = useState<Question[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!courseId || !quizId) return

    const fetchQuiz = async () => {
      try {
        setLoading(true)
        setError(null)

        const quizRef = doc(db, "quizzes", courseId, "topics", quizId)
        const quizSnap = await getDoc(quizRef)

        if (!quizSnap.exists()) {
          setError("Assessment not found. It may have been deleted.")
          return
        }

        const data = quizSnap.data()
        setTopic(data.topic || quizId)
        setStatus(data.status || "active")

        // Normalize whatever question shape is stored into our editable shape.
        // Handles either { options: [{id, text}], correctOptionId } already,
        // or a simpler { options: string[], correctAnswer: number } shape.
        const rawQuestions = Array.isArray(data.questions) ? data.questions : []
        const normalized: Question[] = rawQuestions.map((q: any, qIndex: number) => {
          let options: QuestionOption[] = []

          if (Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === "object") {
            options = q.options.map((opt: any, i: number) => ({
              id: opt.id || `opt_${qIndex}_${i}`,
              text: opt.text ?? "",
            }))
          } else if (Array.isArray(q.options)) {
            options = q.options.map((optText: string, i: number) => ({
              id: `opt_${qIndex}_${i}`,
              text: optText ?? "",
            }))
          }

          let correctOptionId = q.correctOptionId
          if (!correctOptionId && typeof q.correctAnswer === "number" && options[q.correctAnswer]) {
            correctOptionId = options[q.correctAnswer].id
          }

          return {
            id: q.id || generateId(),
            questionText: q.questionText || q.question || "",
            options: options.length > 0 ? options : [
              { id: `opt_${qIndex}_0`, text: "" },
              { id: `opt_${qIndex}_1`, text: "" },
            ],
            correctOptionId: correctOptionId || "",
          }
        })

        setQuestions(normalized)
      } catch (err) {
        console.error("Error fetching quiz:", err)
        setError("Failed to load assessment. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [courseId, quizId])

  const handleQuestionTextChange = (questionId: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, questionText: value } : q))
    )
  }

  const handleOptionTextChange = (questionId: string, optionId: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) =>
                opt.id === optionId ? { ...opt, text: value } : opt
              ),
            }
          : q
      )
    )
  }

  const handleCorrectOptionChange = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, correctOptionId: optionId } : q))
    )
  }

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, { id: generateId(), text: "" }] }
          : q
      )
    )
  }

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        if (q.options.length <= 2) return q // keep at least 2 options
        const updatedOptions = q.options.filter((opt) => opt.id !== optionId)
        return {
          ...q,
          options: updatedOptions,
          correctOptionId: q.correctOptionId === optionId ? "" : q.correctOptionId,
        }
      })
    )
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      questionText: "",
      options: [
        { id: generateId(), text: "" },
        { id: generateId(), text: "" },
      ],
      correctOptionId: "",
    }
    setQuestions((prev) => [...prev, newQuestion])
  }

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }

  const validate = (): string | null => {
    if (!topic.trim()) return "Topic name is required."
    if (questions.length === 0) return "Add at least one question."

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText.trim()) return `Question ${i + 1} is missing question text.`
      if (q.options.some((opt) => !opt.text.trim())) {
        return `Question ${i + 1} has an empty option.`
      }
      if (!q.correctOptionId) return `Question ${i + 1} needs a correct answer selected.`
    }
    return null
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)

    const validationError = validate()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    try {
      const quizRef = doc(db, "quizzes", courseId, "topics", quizId)
      await updateDoc(quizRef, {
        topic: topic.trim(),
        status,
        questions: questions.map((q) => ({
          id: q.id,
          questionText: q.questionText.trim(),
          options: q.options.map((opt) => ({ id: opt.id, text: opt.text.trim() })),
          correctOptionId: q.correctOptionId,
        })),
        updatedAt: serverTimestamp(),
      })
      setSaveSuccess(true)
    } catch (err) {
      console.error("Error saving assessment:", err)
      setSaveError("Failed to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="p-4 bg-destructive/15 border border-destructive/20 rounded text-destructive flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Edit Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Course ID: {courseId} <Badge variant="secondary" className="ml-2">{quizId}</Badge>
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {saveError && (
        <div className="p-3 bg-destructive/15 border border-destructive/20 rounded text-destructive flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-700">
          Changes saved successfully.
        </div>
      )}

      {/* Topic details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assessment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic Name *</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Introduction to React"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {questions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No questions yet. Click &quot;Add Question&quot; to get started.
          </div>
        )}

        {questions.map((question, qIndex) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeQuestion(question.id)}
                  aria-label={`Remove question ${qIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`question-${question.id}`}>Question Text *</Label>
                <Textarea
                  id={`question-${question.id}`}
                  value={question.questionText}
                  onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                  placeholder="Enter the question..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Options — select the correct answer *</Label>
                <RadioGroup
                  value={question.correctOptionId}
                  onValueChange={(value) => handleCorrectOptionChange(question.id, value)}
                  className="space-y-2"
                >
                  {question.options.map((option, optIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem value={option.id} id={`opt-${option.id}`} />
                      <Input
                        value={option.text}
                        onChange={(e) =>
                          handleOptionTextChange(question.id, option.id, e.target.value)
                        }
                        placeholder={`Option ${optIndex + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={() => removeOption(question.id, option.id)}
                        disabled={question.options.length <= 2}
                        aria-label={`Remove option ${optIndex + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(question.id)}
                  className="mt-1"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Option
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  )
}
