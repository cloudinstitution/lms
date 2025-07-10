"use client";

import StudentLayout from "@/components/student-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuizService, type Quiz, type QuizResult } from "@/lib/quiz-service";
import { getStudentSession } from "@/lib/session-storage";
import { ArrowLeft, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DetailedQuizResult() {
  const { quizId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchQuizAndResult = async () => {
      const studentData = getStudentSession();
      if (!studentData || !quizId) {
        if (isMounted) {
          setError("Please log in or provide a valid quiz ID");
          setLoading(false);
          router.push('/login');
        }
        return;
      }      try {
        const studentId = studentData.id || studentData.studentId;
        const [quizData, resultData] = await Promise.all([
          QuizService.getQuizById(quizId as string),
          QuizService.getUserQuizResult(studentId, quizId as string),
        ]);

        if (!isMounted) return;

        if (!quizData || !resultData) {
          setError("Quiz or result not found");
          setLoading(false);
          return;
        }

        setQuiz(quizData);
        setResult(resultData);
      } catch (err) {
        console.error("Error fetching quiz or result:", err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(`Failed to load quiz results: ${errorMessage}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchQuizAndResult();    return () => {
      isMounted = false;
    };
  }, [quizId, router]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <div className="text-lg text-foreground">Loading results...</div>
      </div>
    );
  }

  if (error || !quiz || !result) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        
      <div className="p-4 bg-destructive/15 border border-destructive/20 rounded text-destructive">
          {error || "Quiz or result not found"}
        </div>
        <Button
          onClick={() => router.push("/student/assessments")}
          className="mt-4"
        >
          Back to Assessments
        </Button>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 max-w-4xl mx-auto">      <Button
        variant="outline"
        onClick={() => router.push("/student/assessments/result")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to All Results
      </Button>

      <div className="bg-card border border-border rounded-lg shadow-md mb-6 p-5">
        <h2 className="text-2xl font-semibold text-foreground">{quiz.topic}</h2>
        <p className="text-muted-foreground">Course: {quiz.course || "Uncategorized"}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {result.score}/{result.totalQuestions}
            </div>
            <div className="text-green-600 dark:text-green-300 mt-1">
              {Math.round((result.score / result.totalQuestions) * 100)}% Score
            </div>
            <div className="text-muted-foreground text-sm mt-2 flex items-center justify-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                Completed on:{" "}
                {result.submittedAt instanceof Date
                  ? result.submittedAt.toLocaleString()
                  : "Date unavailable"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <h3 className="text-xl font-medium mb-4">Detailed Results</h3>
      {quiz.questions.map((question, qIndex) => {
        const userAnswer = result.answers[qIndex];
        const isCorrect = userAnswer === question.correctAnswer;

        return (
          <Card key={qIndex} className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-medium text-lg">
                  {qIndex + 1}. {question.question}
                </span>
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <p>
                  <strong>Your Answer:</strong>{" "}
                  {userAnswer >= 0
                    ? question.options[userAnswer]
                    : "Not answered"}
                </p>
                <p>
                  <strong>Correct Answer:</strong>{" "}
                  {question.options[question.correctAnswer]}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
    </StudentLayout>
  );
}