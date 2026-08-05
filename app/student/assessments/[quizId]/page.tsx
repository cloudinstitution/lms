"use client";

import StudentLayout from "@/components/student-layout";
import { Button } from "@/components/ui/button";
import { QuizService, type Quiz, type QuizResult } from "@/lib/quiz-service";
import { getStudentSession } from "@/lib/session-storage";
import { ArrowLeft, CheckCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AttemptQuizPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchQuizAndCheckAttempt = async () => {
      // Get student data from session storage
      const studentData = getStudentSession();
      
      if (!quizId || !studentData) {
        if (isMounted) {
          setError("Quiz ID is missing or you are not logged in");
          setLoading(false);
          router.push('/login');
        }
        return;
      }      try {
        const studentId = studentData.id || studentData.studentId;
        
        console.log(`🔍 AttemptQuiz: Fetching quiz with ID: "${quizId}"`);
        console.log(`🔍 AttemptQuiz: Student ID: "${studentId}"`);
        
        const [quizData, resultData] = await Promise.all([
          QuizService.getQuizById(quizId as string),
          QuizService.getUserQuizResult(studentId, quizId as string),
        ]);

        if (!isMounted) return;

        if (resultData) {
          console.log(`✅ AttemptQuiz: Found existing result for quiz`);
          setResult(resultData);
          setSubmitted(true);
        }

        if (!quizData) {
          console.log(`❌ AttemptQuiz: Quiz not found for ID: "${quizId}"`);
          setError("Quiz not found");
          setLoading(false);
          return;
        }

        console.log(`✅ AttemptQuiz: Quiz loaded successfully:`, quizData);

        if (
          studentData.coursesEnrolled?.length > 0 &&
          !studentData.coursesEnrolled.includes(quizData.course)
        ) {
          setError("You are not enrolled in this course");
          setLoading(false);
          return;
        }

        setQuiz(quizData);
        setAnswers(Array(quizData.questions.length).fill(-1));
      } catch (err) {
        console.error("Error fetching quiz:", err);
        if (isMounted) {
          setError("Failed to load quiz. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };    fetchQuizAndCheckAttempt();

    return () => {
      isMounted = false;
    };
  }, [quizId, router]);

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = optionIndex;
      return newAnswers;
    });
  };
  const handleSubmit = async () => {
    const studentData = getStudentSession();
    if (!studentData || !quiz) {
      setError("Unable to submit quiz");
      return;
    }

    try {
      setLoading(true);
      const result = await QuizService.submitQuizResult(
        studentData.id || studentData.studentId,
        studentData.name,
        quizId as string,
        quiz,
        answers
      );
      setResult(result);
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Failed to submit quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <div className="text-lg text-foreground">Loading quiz...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-destructive/15 border border-destructive/20 rounded text-destructive">
          {error}
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

  if (!quiz) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-destructive/15 border border-destructive/20 rounded text-destructive">
          Quiz not found
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

  if (submitted || result) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link
          href="/student/assessments"
          className="flex items-center text-muted-foreground mb-6 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Link>

        <div className="bg-card border border-border rounded-lg shadow-md mb-6 p-5">
          <h2 className="text-2xl font-semibold text-foreground">{quiz.topic}</h2>
          <p className="text-muted-foreground">Course: {quiz.courseName || quiz.course || "Unknown Course"}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-lg mb-4">
            <CheckCircle className="h-6 w-6" />
            <span>Quiz Completed!</span>
          </div>
          {result ? (
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {result.score}/{result.totalQuestions}
              </div>
              <div className="text-green-600 dark:text-green-300 mt-1">
                {Math.round((result.score / result.totalQuestions) * 100)}% Score
              </div>
              <div className="text-muted-foreground text-sm mt-2 flex items-center justify-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Completed on: {result.submittedAt.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="text-xl font-medium text-green-700 dark:text-green-400">
                Your quiz has been submitted successfully!
              </div>
              <div className="text-muted-foreground text-sm mt-2">
                View your results below.
              </div>
            </div>
          )}
          <div className="flex justify-center gap-4">
            <Link href="/student/assessments">
              <Button variant="outline">Back to Assessments</Button>
            </Link>
            <Link href={`/student/assessments/results/${quizId}`}>
              <Button>View Detailed Results</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/student/assessments"
          className="flex items-center text-muted-foreground mb-6 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Link>

        <div className="bg-card border border-border rounded-lg shadow-md mb-6 p-5">
          <h2 className="text-2xl font-semibold text-foreground">{quiz.topic}</h2>
          <p className="text-muted-foreground">Course: {quiz.courseName || quiz.course || "Unknown Course"}</p>
        </div>

        {quiz.questions.map((question, qIndex) => (
          <div
            key={qIndex}
            className="bg-card border border-border rounded-lg shadow-md mb-4 overflow-hidden"
          >
            <div className="p-5">
              <div className="font-medium text-lg mb-4 text-foreground">
                {qIndex + 1}. {question.question}
              </div>
              <div className="space-y-3">
                {question.options.map((option, oIndex) => (
                  <div
                    key={oIndex}
                    className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${
                      answers[qIndex] === oIndex
                        ? "bg-primary/10 border-primary/20 text-foreground"
                        : "border-border hover:bg-muted/50 text-foreground"
                    }`}
                    onClick={() => handleAnswerChange(qIndex, oIndex)}
                  >
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      checked={answers[qIndex] === oIndex}
                      onChange={() => {}}
                      className="h-4 w-4 text-primary"
                    />
                    <label className="flex-grow cursor-pointer">{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-center mt-6 mb-12">
          <Button
            onClick={handleSubmit}
            className="px-8 py-2 text-lg"
            disabled={answers.includes(-1) || loading}
          >
            {loading ? "Submitting..." : "Submit Quiz"}
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
}