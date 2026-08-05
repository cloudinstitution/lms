"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function EditQuizPage() {
  const { courseId, quizId } = useParams()
  const [quiz, setQuiz] = useState<any>(null)
  const [newQuestion, setNewQuestion] = useState("")

  useEffect(() => {
    fetchQuiz()
  }, [])

  const fetchQuiz = async () => {
    const quizRef = doc(db, "quizzes", courseId as string, "topics", quizId as string)
    const snapshot = await getDoc(quizRef)
    if (snapshot.exists()) setQuiz({ id: snapshot.id, ...snapshot.data() })
  }

  const addQuestion = async () => {
    if (!newQuestion.trim()) return
    const quizRef = doc(db, "quizzes", courseId as string, "topics", quizId as string)
    const updatedQuestions = [...(quiz.questions || []), { text: newQuestion }]
    await updateDoc(quizRef, { questions: updatedQuestions })
    setQuiz({ ...quiz, questions: updatedQuestions })
    setNewQuestion("")
  }

  const deleteQuestion = async (index: number) => {
    const updatedQuestions = quiz.questions.filter((_: any, i: number) => i !== index)
    const quizRef = doc(db, "quizzes", courseId as string, "topics", quizId as string)
    await updateDoc(quizRef, { questions: updatedQuestions })
    setQuiz({ ...quiz, questions: updatedQuestions })
  }

  if (!quiz) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Quiz: {quiz.topic}</h1>

      {/* List Questions */}
      <ul className="space-y-2">
        {quiz.questions?.map((q: any, index: number) => (
          <li key={index} className="flex justify-between items-center border p-2 rounded">
            {q.text}
            <Button size="sm" variant="destructive" onClick={() => deleteQuestion(index)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {/* Add Question */}
      <div className="flex gap-2 mt-4">
        <Input 
          placeholder="Enter new question" 
          value={newQuestion} 
          onChange={(e) => setNewQuestion(e.target.value)} 
        />
        <Button onClick={addQuestion}>Add</Button>
      </div>
    </div>
  )
}
