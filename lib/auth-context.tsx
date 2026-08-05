"use client"

import { db } from "@/lib/firebase"
import { getUserCustomClaims } from "@/lib/firebase-admin-client"
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    type User,
} from "firebase/auth"
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, batch: string) => Promise<void>
  signOut: () => Promise<void>
  userProfile: any | null
  userClaims: any | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [userClaims, setUserClaims] = useState<any | null>(null)
  const auth = getAuth()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        try {
          // Fetch user profile from students collection
          const userDoc = await getDoc(doc(db, "students", user.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data())
          } else {
            // If not in students collection, search admin collection by email
            const adminQuery = query(collection(db, "admin"), where("username", "==", user.email))
            const adminSnapshot = await getDocs(adminQuery)
              if (!adminSnapshot.empty) {
              const adminDoc = adminSnapshot.docs[0]
              const adminData = adminDoc.data()
              // Include the Firestore document ID
              setUserProfile({
                ...adminData,
                firestoreId: adminDoc.id // Store the actual Firestore document ID
              })
            } else {
              // No admin profile found - this is expected for student users
            }
          }
          
          // Fetch user custom claims
          const claims = await getUserCustomClaims(user)
          setUserClaims(claims)
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUserProfile(null)
        setUserClaims(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string, batch: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Generate a customStudentId (e.g., incremental or random)
      const customStudentId = `STU${Date.now().toString().slice(-6)}` // Example: STU123456

      // Create user profile in Firestore
      await setDoc(doc(db, "students", user.uid), {
        name,
        email,
        batch,
        customStudentId,
        createdAt: new Date(),
      })
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, userProfile, userClaims }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}