"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs, limit, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

// This is a utility component you can add to your project to help debug Firebase issues
export default function FirebaseDebug() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { user } = useAuth()

  const checkFirebaseCollections = async () => {
    if (!user) {
      alert("You must be logged in to use this tool")
      return
    }

    setLoading(true)
    try {
      const collections = ["attendance", "studentAttendance", "attendanceRecords", "batches", "students", "users"]
      const results: Record<string, any> = {}

      for (const collectionName of collections) {
        try {
          const q = query(collection(db, collectionName), limit(5))
          const snapshot = await getDocs(q)

          results[collectionName] = {
            exists: !snapshot.empty,
            count: snapshot.size,
            sample: snapshot.empty ? null : snapshot.docs[0].data(),
          }
        } catch (error: any) {
          results[collectionName] = {
            exists: false,
            error: error.message,
          }
        }
      }

      setResults(results)
      console.log("Firebase Collections:", results)
    } catch (error) {
      console.error("Error checking Firebase:", error)
      alert("Error checking Firebase. See console for details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firebase Debug Tool</CardTitle>
        <CardDescription>Check your Firebase collections and data structure</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          This tool will check your Firebase collections and show sample data to help debug issues. Results will be
          displayed below and in the browser console.
        </p>

        <Button onClick={checkFirebaseCollections} disabled={loading || !user}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Check Firebase Collections
        </Button>

        {results && (
          <div className="mt-4 space-y-4">
            <h3 className="font-medium">Collections Found:</h3>
            <div className="space-y-2">
              {Object.entries(results).map(([collection, data]: [string, any]) => (
                <div key={collection} className="border p-2 rounded-md">
                  <p className="font-medium">
                    {collection}: {data.exists ? "✅" : "❌"}
                  </p>
                  {data.exists && <p className="text-sm text-muted-foreground">Found {data.count} documents</p>}
                  {data.error && <p className="text-sm text-destructive">{data.error}</p>}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Full details including sample data have been logged to the console.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">This tool is only visible in development mode.</CardFooter>
    </Card>
  )
}
