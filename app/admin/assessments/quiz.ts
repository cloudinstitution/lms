import { deleteDoc, doc } from "firebase/firestore"

// Delete a quiz by courseID + quizID
const deleteQuiz = async (courseID: string, quizID: string) => {
  try {
    await deleteDoc(doc(db, "quizzes", courseID, "topics", quizID))
    // Update local state
    setQuizzesByCourse((prev) => {
      const updated = { ...prev }
      updated[courseID] = updated[courseID].filter((quiz) => quiz.id !== quizID)
      return updated
    })
  } catch (err) {
    console.error("Error deleting quiz:", err)
  }
}
