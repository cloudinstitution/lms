import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

export interface Quiz {
  id: string;
  topic: string;
  course?: string;
  courseID?: string;
  courseName?: string; // Add this field for compatibility
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
      // Check if quizId is in the new format: courseID_topicName
      if (quizId.includes('_')) {
        const [courseID, encodedTopicName] = quizId.split('_', 2);
        // Decode the topic name in case it's URL encoded
        const topicName = decodeURIComponent(encodedTopicName);
        
        console.log(`🔍 QuizService: Fetching quiz with courseID="${courseID}", topicName="${topicName}"`);
        
        const quizDoc = await getDoc(doc(db, "quizzes", courseID, "topics", topicName));
        if (!quizDoc.exists()) {
          console.log(`❌ QuizService: Quiz not found at path: quizzes/${courseID}/topics/${topicName}`);
          return null;
        }
        
        const quizData = quizDoc.data();
        console.log(`✅ QuizService: Quiz found successfully. Available fields:`, Object.keys(quizData));
        console.log(`🔍 QuizService: Quiz data course fields - course: "${quizData.course}", courseName: "${quizData.courseName}"`);
        
        return { id: quizId, ...quizData } as Quiz;
      }
      
      // Fallback: try old structure for backward compatibility
      const quizDoc = await getDoc(doc(db, "quizzes", quizId));
      if (!quizDoc.exists()) return null;
      return { id: quizDoc.id, ...quizDoc.data() } as Quiz;
    } catch (error) {
      console.error("Error fetching quiz:", error);
      throw new Error("Failed to fetch quiz");
    }
  },

  async getQuizByCourseAndTopic(courseID: string, topicName: string): Promise<Quiz | null> {
    try {
      const quizDoc = await getDoc(doc(db, "quizzes", courseID, "topics", topicName));
      if (!quizDoc.exists()) return null;
      return { 
        id: `${courseID}_${topicName}`, 
        topic: topicName,
        courseID,
        ...quizDoc.data() 
      } as Quiz;
    } catch (error) {
      console.error("Error fetching quiz by course and topic:", error);
      throw new Error("Failed to fetch quiz");
    }
  },

  async getUserQuizResult(userId: string, quizId: string): Promise<QuizResult | null> {
    try {
      console.log(`🔍 QuizService: Getting quiz result for user="${userId}", quizId="${quizId}"`);
      
      const resultQuery = query(
        collection(db, "quizResults"),
        where("userId", "==", userId),
        where("quizId", "==", quizId)
      );
      const snapshot = await getDocs(resultQuery);
      if (snapshot.empty) {
        console.log(`❌ QuizService: No result found for user="${userId}", quizId="${quizId}"`);
        return null;
      }
      const doc = snapshot.docs[0];
      console.log(`✅ QuizService: Found result for user="${userId}", quizId="${quizId}"`);
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

      // Ensure all required fields have valid values
      const courseName = quiz.courseName || quiz.course || "Unknown Course";
      const topicName = quiz.topic || "Unknown Topic";

      console.log(`🔍 QuizService: Submitting quiz result with course="${courseName}", topic="${topicName}"`);
      console.log(`🔍 QuizService: Original quiz data - course: "${quiz.course}", courseName: "${quiz.courseName}"`);

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
        course: courseName,
        topic: topicName,
      };

      await setDoc(doc(db, "quizResults", resultId), {
        ...result,
        submittedAt: serverTimestamp(),
      });

      console.log(`✅ QuizService: Quiz result submitted successfully`);
      return result;
    } catch (error) {
      console.error("Error submitting quiz result:", error);
      throw new Error("Failed to submit quiz result");
    }
  },
};