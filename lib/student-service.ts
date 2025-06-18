import { collection, getDocs, getDoc, doc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "./firebase"
import { Student } from "@/types/student"

export const SERVICE_ID = "service_0wpennn"
export const TEMPLATE_ID = "template_zly25zz"
export const PUBLIC_KEY = "f_2D0VC3LQZjhZDMC"

export async function fetchStudents() {
  const studentsCollection = collection(db, "students")
  const studentsSnapshot = await getDocs(studentsCollection)  
  return studentsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      status: data.status || "Active", // Use existing status or "Active" as default
    };
  }) as Student[]
}

export async function fetchStudentById(studentId: string): Promise<Student | null> {
  try {
    const studentRef = doc(db, "students", studentId);
    const studentSnapshot = await getDoc(studentRef);
    
    if (!studentSnapshot.exists()) {
      return null;
    }
    
    const data = studentSnapshot.data();
    return {
      id: studentSnapshot.id,
      ...data,
      status: data.status || "Active", // Use existing status or "Active" as default
    } as Student;
  } catch (error) {
    console.error("Error fetching student by ID:", error);
    return null;
  }
}

export async function deleteStudent(studentId: string) {
  await deleteDoc(doc(db, "students", studentId))
}

export async function updateStudent(studentId: string, data: Partial<Student>) {
  const studentRef = doc(db, "students", studentId)
  await updateDoc(studentRef, data)
}

export async function bulkUpdateStudentStatus(studentIds: string[], status: "Active" | "Inactive") {
  const batch = writeBatch(db)
  studentIds.forEach(id => {
    const ref = doc(db, "students", id)
    batch.update(ref, { status })
  })
  await batch.commit()
}

export async function bulkDeleteStudents(studentIds: string[]) {
  const batch = writeBatch(db)
  studentIds.forEach(id => {
    const ref = doc(db, "students", id)
    batch.delete(ref)
  })
  await batch.commit()
}
