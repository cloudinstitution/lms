"use client";

import StudentLayout from "@/components/student-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { type Quiz, QuizService } from "@/lib/quiz-service";
import { getStudentSession } from "@/lib/session-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Student {
  id: string
  name: string
  username: string
  password: string
  phoneNumber: string
  coursesEnrolled: number
  studentId: string
  joinedDate: string
  courseName: string
  status?: "Active" | "Inactive"
}

export default function AssessmentsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [quizzesBycourse, setQuizzesBycourse] = useState<Record<string, Quiz[]>>({});
  const [completedQuizIds, setCompletedQuizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);  
  useEffect(() => {
    const studentData = getStudentSession();
    if (studentData) {
      setStudent(studentData as Student);
      
      const fetchQuizzes = async () => {
        try {
          // Get quizzes only for enrolled course
          const quizzesRef = query(
            collection(db, "quizzes"),
            where("course", "==", studentData.courseName)
          );
          const quizSnapshot = await getDocs(quizzesRef);
          const courseQuizzes = quizSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Quiz));

          // Get completed quizzes for the student
          const results = await QuizService.getUserQuizResults(studentData.id);
          setCompletedQuizIds(results.map((result) => result.quizId));

          // Set quizzes for the enrolled course
          const quizzesByCat: Record<string, Quiz[]> = {
            [studentData.courseName]: courseQuizzes
          };

          setQuizzesBycourse(quizzesByCat);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching quizzes:", err);
          setError("Failed to load assessments");
          setLoading(false);
        }
      };

      fetchQuizzes();
    } else {
      router.push("/login");
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-pulse text-lg">Loading assessments...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>Please log in to view assessments</span>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="p-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Available Assessments</h2>        <div className="flex justify-between mb-4">
          <div className="text-lg font-semibold text-foreground">
            Course: {student.courseName}
          </div>
          <Link href="/student/assessments/results">
            <Button 
              variant="outline"
              className="border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-violet-800 dark:hover:bg-violet-950 dark:hover:text-violet-300"
            >
              View Results
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {Object.keys(quizzesBycourse).length > 0 ? (
          Object.entries(quizzesBycourse)
            .filter(([course]) => !selectedCourse || course === selectedCourse)
            .map(([course, quizzes]) => (
              <div key={course} className="mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Course: {course}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {quizzes.map((quiz) => {
                        const hasCompleted = completedQuizIds.includes(quiz.id);

                        return (
                          <Card
                            key={quiz.id}
                            className={`overflow-hidden border-border dark:border-border ${
                              hasCompleted ? "bg-muted/50" : ""
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-lg text-foreground">
                                  Topic: {quiz.topic}
                                </h4>
                                {hasCompleted && (
                                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    <span>Completed</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm mb-4 text-muted-foreground">
                                {quiz.questions?.length || 0} questions
                              </p>

                              {hasCompleted ? (
                                <div className="flex justify-between">
                                  <Button
                                    variant="outline"
                                    disabled
                                    className="w-full opacity-70"
                                  >
                                    Already Completed
                                  </Button>                                  <Link
                                    href={`/student/assessments/results/${quiz.id}`}
                                    className="ml-2"
                                  >
                                    <Button 
                                      variant="secondary"
                                      className="w-full bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700"
                                    >
                                      View Results
                                    </Button>
                                  </Link>
                                </div>
                              ) : (
                                <Link href={`/student/assessments/${quiz.id}`}>
                                  <Button 
                                    className="w-full bg-violet-500 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700"
                                  >
                                    Attempt Quiz
                                  </Button>
                                </Link>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-600" />
            <p className="text-yellow-800">
              {student.coursesEnrolled > 0
                ? "No quizzes are available for your enrolled courses at this time."
                : "No quizzes are available at this time. Please check back later."}
            </p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}