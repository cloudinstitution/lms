"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore"
import { Edit2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Video {
  id: string
  title: string
  link: string
  serialNo: number
  sourceType: 'youtube' | 'gdrive'
}

export default function CourseDetails() {
  const { courseTitle } = useParams()
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [newVideo, setNewVideo] = useState({ 
    title: "", 
    link: "", 
    serialNo: 1,
    sourceType: 'youtube' as 'youtube' | 'gdrive'
  })
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
    if (!newVideo.title || !newVideo.link || !newVideo.serialNo || !newVideo.sourceType) {
      setError("Please fill in all fields.")
      return
    }

    // Validate link based on source type
    if (newVideo.sourceType === 'youtube' && !newVideo.link.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
      setError("Please enter a valid YouTube link.")
      return
    }
    
    if (newVideo.sourceType === 'gdrive' && !newVideo.link.match(/^https:\/\/drive\.google\.com\/(file\/d\/|open\?id=).+/)) {
      setError("Please enter a valid Google Drive link.")
      return
    }

    try {
      const videoRef = collection(db, "courses", courseTitle as string, "videos")
      await addDoc(videoRef, {
        title: newVideo.title,
        link: newVideo.link,
        serialNo: Number(newVideo.serialNo),
        sourceType: newVideo.sourceType
      })
      setNewVideo({ title: "", link: "", serialNo: videos.length + 1, sourceType: 'youtube' })
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
      // Validate link based on source type
      if (editVideo.sourceType === 'youtube' && !editVideo.link.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
        toast({
          title: "Error",
          description: "Please enter a valid YouTube link.",
          variant: "destructive",
        })
        return
      }
      
      if (editVideo.sourceType === 'gdrive' && !editVideo.link.match(/^https:\/\/drive\.google\.com\/(file\/d\/|open\?id=).+/)) {
        toast({
          title: "Error",
          description: "Please enter a valid Google Drive link.",
          variant: "destructive",
        })
        return
      }

      try {
        const videoDocRef = doc(db, "courses", courseTitle as string, "videos", editVideo.id)
        await updateDoc(videoDocRef, {
          title: editVideo.title,
          link: editVideo.link,
          serialNo: Number(editVideo.serialNo),
          sourceType: editVideo.sourceType
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
        return parsedUrl.pathname.slice(1);
      }
      if (parsedUrl.hostname.includes("youtube.com")) {
        return parsedUrl.searchParams.get("v") || "";
      }
      return "";
    } catch (error) {
      return "";
    }
  }

  const getVideoEmbedUrl = (video: Video) => {
    if (video.sourceType === 'youtube') {
      const videoId = extractVideoId(video.link);
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (video.sourceType === 'gdrive') {
      // Convert Google Drive viewing URL to embedding URL
      const gdriveUrl = video.link;
      const fileId = gdriveUrl.match(/\/d\/(.*?)(\/|$)/)?.[1] || "";
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return '';
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
                <Label>Video Source</Label>                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50"
                  value={newVideo.sourceType}
                  onChange={(e) => setNewVideo({ ...newVideo, sourceType: e.target.value as 'youtube' | 'gdrive' })}
                  required
                >
                  <option value="youtube" className="bg-white dark:bg-slate-950">YouTube</option>
                  <option value="gdrive" className="bg-white dark:bg-slate-950">Google Drive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{newVideo.sourceType === 'youtube' ? 'YouTube Link' : 'Google Drive Link'}</Label>
                <Input
                  value={newVideo.link}
                  onChange={(e) => setNewVideo({ ...newVideo, link: e.target.value })}
                  placeholder={newVideo.sourceType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://drive.google.com/file/d/...'}
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
                        src={getVideoEmbedUrl(video)}
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
                            <Label>Video Source</Label>                            <select 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50"
                              value={editVideo?.sourceType || 'youtube'}
                              onChange={(e) => setEditVideo({ ...editVideo!, sourceType: e.target.value as 'youtube' | 'gdrive' })}
                              required
                            >
                              <option value="youtube" className="bg-white dark:bg-slate-950">YouTube</option>
                              <option value="gdrive" className="bg-white dark:bg-slate-950">Google Drive</option>
                            </select>
                            <Label>{editVideo?.sourceType === 'gdrive' ? 'Google Drive Link' : 'YouTube Link'}</Label>
                            <Input
                              value={editVideo?.link || ""}
                              onChange={(e) => setEditVideo({ ...editVideo!, link: e.target.value })}
                              placeholder={editVideo?.sourceType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://drive.google.com/file/d...'}
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
