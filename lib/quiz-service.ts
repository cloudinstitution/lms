import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export interface Quiz {
  id: string;
  topic: string;
  course: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

export interface QuizResult {
  id: string;
  userId: string;
  userName: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  submittedAt: Date;
  course: string;
  topic: string;
}

export const QuizService = {
  async getQuizById(quizId: string): Promise<Quiz | null> {
    try {
      const quizDoc = await getDoc(doc(db, "quizzes", quizId));
      if (!quizDoc.exists()) return null;
      return { id: quizDoc.id, ...quizDoc.data() } as Quiz;
    } catch (error) {
      console.error("Error fetching quiz:", error);
      throw new Error("Failed to fetch quiz");
    }
  },

  async getUserQuizResult(userId: string, quizId: string): Promise<QuizResult | null> {
    try {
      const resultQuery = query(
        collection(db, "quizResults"),
        where("userId", "==", userId),
        where("quizId", "==", quizId)
      );
      const snapshot = await getDocs(resultQuery);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt.toDate(),
      } as QuizResult;
    } catch (error) {
      console.error("Error fetching quiz result:", error);
      throw new Error("Failed to fetch quiz result");
    }
  },

  async getUserQuizResults(userId: string): Promise<QuizResult[]> {
    try {
      const resultsQuery = query(
        collection(db, "quizResults"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(resultsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt.toDate(),
      })) as QuizResult[];
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      throw new Error("Failed to fetch quiz results");
    }
  },

  async submitQuizResult(
    userId: string,
    userName: string,
    quizId: string,
    quiz: Quiz,
    answers: number[]
  ): Promise<QuizResult> {
    try {
      const score = quiz.questions.reduce((acc, q, idx) => {
        return acc + (q.correctAnswer === answers[idx] ? 1 : 0);
      }, 0);

      const resultId = `${userId}_${quizId}`;
      const result: QuizResult = {
        id: resultId,
        userId,
        userName,
        quizId,
        score,
        totalQuestions: quiz.questions.length,
        answers,
        submittedAt: new Date(),
        course: quiz.course,
        topic: quiz.topic,
      };

      await setDoc(doc(db, "quizResults", resultId), {
        ...result,
        submittedAt: serverTimestamp(),
      });

      return result;
    } catch (error) {
      console.error("Error submitting quiz result:", error);
      throw new Error("Failed to submit quiz result");
    }
  },
};