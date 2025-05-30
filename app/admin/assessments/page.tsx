"use client"

import type React from "react"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Question {
  question: string
  options: string[]
  correctAnswer: number
}

export default function UploadQuizForm() {
  const [course, setCourse] = useState("")
  const [topic, setTopic] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 },
  ])

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index].question = value
    setQuestions(newQuestions)
  }

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options[optionIndex] = value
    setQuestions(newQuestions)
  }

  const handleCorrectAnswerChange = (questionIndex: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].correctAnswer = Number.parseInt(value)
    setQuestions(newQuestions)
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }])
  }

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = [...questions]
      newQuestions.splice(index, 1)
      setQuestions(newQuestions)
    }
  }

  const validateForm = () => {
    if (!course.trim()) {
      toast({
        title: "Error",
        description: "Course name is required",
        variant: "destructive",
      })
      return false
    }

    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Topic is required",
        variant: "destructive",
      })
      return false
    }

    // Check if all questions and options are filled
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        toast({
          title: "Error",
          description: `Question ${i + 1} is empty`,
          variant: "destructive",
        })
        return false
      }

      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) {
          toast({
            title: "Error",
            description: `Option ${j + 1} for Question ${i + 1} is empty`,
            variant: "destructive",
          })
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await addDoc(collection(db, "quizzes"), {
        course,
        topic,
        questions,
        createdAt: serverTimestamp(),
      })

      toast({
        title: "Success",
        description: "Quiz uploaded successfully!",
      })

      // Reset form
      setCourse("")
      setTopic("")
      setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }])
    } catch (error) {
      console.error("Error uploading quiz:", error)
      toast({
        title: "Error",
        description: "Failed to upload quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Quiz</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course Name</Label>
              <Input
                id="course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Enter course name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic name"
                required
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Questions</h3>
            </div>

            {questions.map((question, qIndex) => (
              <div key={qIndex} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Question {qIndex + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`question-${qIndex}`}>Question Text</Label>
                  <Input
                    id={`question-${qIndex}`}
                    value={question.question}
                    onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                    placeholder="Enter question text"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Options</Label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <Input
                        type="radio"
                        className="h-4 w-4"
                        name={`correct-${qIndex}`}
                        checked={question.correctAnswer === oIndex}
                        onChange={() => handleCorrectAnswerChange(qIndex, oIndex.toString())}
                      />
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        required
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <div className="text-xs text-slate-500">Select the radio button next to the correct answer</div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddQuestion} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Uploading..." : "Upload Quiz"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
