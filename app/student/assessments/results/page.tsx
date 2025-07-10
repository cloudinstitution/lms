"use client";

import StudentLayout from "@/components/student-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuizService, type QuizResult } from "@/lib/quiz-service";
import { getStudentSession } from "@/lib/session-storage";
import { AlertCircle, Clock, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function QuizResults() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const fetchResults = async () => {
      const studentData = getStudentSession();
      if (!studentData) {
        if (isMounted) {
          setError("Please log in to view your results");
          setLoading(false);
          router.push("/login");
        }
        return;
      }
      try {
        const resultsData = await QuizService.getUserQuizResults(
          studentData.id || studentData.studentId
        );
        if (isMounted) {
          setResults(resultsData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching quiz results:", err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes("index")) {
            setError(
              "The database requires an index for this query. Please ask youradministrator to check the console for the index creation link."
            );
          } else {
            setError("Failed to load quiz results. Please try again.");
          }
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className=" sédu/flex flex-col justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <div className="text-lg">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="p-4 bg-destructive/15 border border-destructive/20 rounded text-destructive flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
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

  if (results.length === 0) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-2">No Quiz Results Yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't completed any quizzes yet.
              </p>
              <Button onClick={() => router.push("/student/assessments")}>
                Go to Assessments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resultsByCategory = results.reduce(
    (acc: Record<string, QuizResult[]>, result) => {
      const course = result.course || "Uncategorized";
      if (!acc[course]) {
        acc[course] = [];
      }
      acc[course].push(result);
      return acc;
    },
    {}
  );

  return (
    <StudentLayout>
      <div className="p-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Your Quiz Results</h2>

        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => router.push("/student/assessments")}
          >
            Back to Assessments
          </Button>
        </div>

        {Object.entries(resultsByCategory).map(([course, courseResults]) => (
          <div key={course} className="mb-8">
            <h3 className="text-xl font-medium mb-4">Course: {course}</h3>
            <div className="space-y-4">
              {courseResults.map((result) => (
                <Card key={result.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div>
                        <h4 className="font-semibold text-lg">{result.topic}</h4>
                        <div className="flex items-center text-muted-foreground text-sm mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            {result.submittedAt instanceof Date
                              ? result.submittedAt.toLocaleString()
                              : "Date unavailable"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-lg font-bold ${
                            result.score / result.totalQuestions >= 0.7
                              ? "text-green-600"
                              : result.score / result.totalQuestions >= 0.4
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {result.score}/{result.totalQuestions}
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.score / result.totalQuestions >= 0.7
                              ? "bg-green-100 text-green-800"
                              : result.score / result.totalQuestions >= 0.4
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {Math.round(
                            (result.score / result.totalQuestions) * 100
                          )}
                          %
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/student/assessments/results/${result.quizId}`
                            )
                          }
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}