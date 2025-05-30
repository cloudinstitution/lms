"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2 } from "lucide-react"

interface Video {
  id: string
  title: string
  link: string
  serialNo: number
}

export default function CourseDetails() {
  const { courseTitle } = useParams()
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [newVideo, setNewVideo] = useState({ title: "", link: "", serialNo: 1 })
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [editVideo, setEditVideo] = useState<Video | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchVideos()
  }, [courseTitle])

  const fetchVideos = async () => {
    try {
      const videoRef = collection(db, "courses", courseTitle as string, "videos")
      const q = query(videoRef, orderBy("serialNo"))
      const querySnapshot = await getDocs(q)
      const videoList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Video[]
      setVideos(videoList)
    } catch (err) {
      console.error("Error fetching videos:", err)
      toast({
        title: "Error",
        description: "Failed to fetch videos.",
        variant: "destructive",
      })
    }
  }

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVideo.title || !newVideo.link || !newVideo.serialNo) {
      setError("Please fill in all fields.")
      return
    }

    try {
      const videoRef = collection(db, "courses", courseTitle as string, "videos")
      await addDoc(videoRef, {
        title: newVideo.title,
        link: newVideo.link,
        serialNo: Number(newVideo.serialNo),
      })
      setNewVideo({ title: "", link: "", serialNo: videos.length + 1 })
      setError("")
      fetchVideos()
      toast({
        title: "Success",
        description: "Video uploaded successfully!",
      })
    } catch (err) {
      console.error("Firestore upload error:", err)
      setError("Failed to upload video. Please try again.")
    }
  }

  const handleEditClick = (video: Video) => {
    setEditVideo(video)
    setEditingVideoId(video.id)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editVideo && editVideo.id) {
      try {
        const videoDocRef = doc(db, "courses", courseTitle as string, "videos", editVideo.id)
        await updateDoc(videoDocRef, {
          title: editVideo.title,
          link: editVideo.link,
          serialNo: Number(editVideo.serialNo),
        })
        setEditingVideoId(null)
        fetchVideos()
        toast({
          title: "Success",
          description: "Video updated successfully!",
        })
      } catch (err) {
        console.error("Error updating video:", err)
        toast({
          title: "Error",
          description: "Failed to update video.",
          variant: "destructive",
        })
      }
    }
  }

  // Updated function to handle YouTube links correctly
  const extractVideoId = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === "youtu.be") {
        return parsedUrl.pathname.slice(1); // returns the part after youtu.be/
      }
      if (parsedUrl.hostname.includes("youtube.com")) {
        return parsedUrl.searchParams.get("v") || "";
      }
      return "";
    } catch (error) {
      return "";
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Button variant="outline" className="mb-4" onClick={() => router.push("/admin/courses")}>
        ← Back to Courses
      </Button>

      <h1 className="text-3xl font-bold tracking-tight mb-6">{decodeURIComponent(courseTitle as string)}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Video Form */}
        <Card>
          <CardHeader>
            <CardTitle>Upload New Video</CardTitle>
            <CardDescription>Add a new video to this course.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUploadVideo} className="space-y-4">
              {error && (
                <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Video Title</Label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Video Link (YouTube)</Label>
                <Input
                  value={newVideo.link}
                  onChange={(e) => setNewVideo({ ...newVideo, link: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  type="number"
                  value={newVideo.serialNo}
                  onChange={(e) => setNewVideo({ ...newVideo, serialNo: Number(e.target.value) })}
                  required
                />
              </div>
              <Button type="submit">Upload</Button>
            </form>
          </CardContent>
        </Card>

        {/* Video List */}
        <Card>
          <CardHeader>
            <CardTitle>Video List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <iframe
                        width="200"
                        height="113"
                        src={`https://www.youtube.com/embed/${extractVideoId(video.link)}`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </TableCell>
                    <TableCell>{video.serialNo}</TableCell>
                    <TableCell>
                      <Dialog open={editingVideoId === video.id} onOpenChange={(open) => {
                        if (open) {
                          handleEditClick(video)
                        } else {
                          setEditingVideoId(null)
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Video</DialogTitle>
                            <DialogDescription>Update video details.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={editVideo?.title || ""}
                              onChange={(e) => setEditVideo({ ...editVideo!, title: e.target.value })}
                            />
                            <Label>Link</Label>
                            <Input
                              value={editVideo?.link || ""}
                              onChange={(e) => setEditVideo({ ...editVideo!, link: e.target.value })}
                            />
                            <Label>Serial No</Label>
                            <Input
                              type="number"
                              value={editVideo?.serialNo || 0}
                              onChange={(e) => setEditVideo({ ...editVideo!, serialNo: Number(e.target.value) })}
                            />
                          </div>
                          <DialogFooter>
                            <Button onClick={handleEditSubmit}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
