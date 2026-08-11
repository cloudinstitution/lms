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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { Check, Edit2, Trash2, X as XIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Video {
  id: string
  title: string
  link: string
  serialNo: number
  sourceType: 'youtube' | 'gdrive'
}

interface PendingVideo {
  id: string
  videoId: string
  channelId: string
  courseId: string | null
  title: string
  thumbnailUrl: string
  link: string
  sourceType: 'youtube'
  status: string
  createdAt: string
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

  // Delete confirmation state
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // YouTube channel mapping state
  const [youtubeChannelId, setYoutubeChannelId] = useState("")
  const [savingChannelId, setSavingChannelId] = useState(false)

  // Pending videos (from WebSub sync) state
  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([])
  const [pendingSerialNos, setPendingSerialNos] = useState<Record<string, number>>({})
  const [processingPendingId, setProcessingPendingId] = useState<string | null>(null)

  useEffect(() => {
    fetchVideos()
    fetchCourseChannelId()
    fetchPendingVideos()
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
      // Default the next new-video serial number and pending-approval serial numbers
      // to continue after the current max
      setNewVideo((prev) => ({ ...prev, serialNo: videoList.length + 1 }))
    } catch (err) {
      console.error("Error fetching videos:", err)
      toast({
        title: "Error",
        description: "Failed to fetch videos.",
        variant: "destructive",
      })
    }
  }

  const fetchCourseChannelId = async () => {
    try {
      const courseDocRef = doc(db, "courses", courseTitle as string)
      const courseSnap = await getDoc(courseDocRef)
      if (courseSnap.exists()) {
        setYoutubeChannelId(courseSnap.data().youtubeChannelId || "")
      }
    } catch (err) {
      console.error("Error fetching course channel ID:", err)
    }
  }

  const fetchPendingVideos = async () => {
    try {
      const pendingRef = collection(db, "pendingVideos")
      const q = query(pendingRef, where("courseId", "==", courseTitle as string))
      const querySnapshot = await getDocs(q)
      const pendingList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PendingVideo[]
      setPendingVideos(pendingList)
    } catch (err) {
      console.error("Error fetching pending videos:", err)
      toast({
        title: "Error",
        description: "Failed to fetch pending videos.",
        variant: "destructive",
      })
    }
  }

  const handleSaveChannelId = async () => {
    setSavingChannelId(true)
    try {
      const courseDocRef = doc(db, "courses", courseTitle as string)
      // setDoc with merge so this works whether or not the course doc already has other fields
      await setDoc(courseDocRef, { youtubeChannelId: youtubeChannelId.trim() }, { merge: true })
      toast({
        title: "Success",
        description: "YouTube channel linked to this course.",
      })
    } catch (err) {
      console.error("Error saving channel ID:", err)
      toast({
        title: "Error",
        description: "Failed to save channel ID.",
        variant: "destructive",
      })
    } finally {
      setSavingChannelId(false)
    }
  }

  const handleApprovePending = async (pending: PendingVideo) => {
    const serialNo = pendingSerialNos[pending.id] ?? videos.length + 1
    setProcessingPendingId(pending.id)
    try {
      const videoRef = collection(db, "courses", courseTitle as string, "videos")
      await addDoc(videoRef, {
        title: pending.title,
        link: pending.link,
        serialNo: Number(serialNo),
        sourceType: pending.sourceType,
      })
      await deleteDoc(doc(db, "pendingVideos", pending.id))
      setPendingVideos((prev) => prev.filter((p) => p.id !== pending.id))
      fetchVideos()
      toast({
        title: "Success",
        description: "Video approved and published to the course.",
      })
    } catch (err) {
      console.error("Error approving pending video:", err)
      toast({
        title: "Error",
        description: "Failed to approve video.",
        variant: "destructive",
      })
    } finally {
      setProcessingPendingId(null)
    }
  }

  const handleRejectPending = async (pending: PendingVideo) => {
    setProcessingPendingId(pending.id)
    try {
      await deleteDoc(doc(db, "pendingVideos", pending.id))
      setPendingVideos((prev) => prev.filter((p) => p.id !== pending.id))
      toast({
        title: "Removed",
        description: "Pending video discarded.",
      })
    } catch (err) {
      console.error("Error rejecting pending video:", err)
      toast({
        title: "Error",
        description: "Failed to discard video.",
        variant: "destructive",
      })
    } finally {
      setProcessingPendingId(null)
    }
  }

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVideo.title || !newVideo.link || !newVideo.serialNo || !newVideo.sourceType) {
      setError("Please fill in all fields.")
      return
    }

    const normalizedLink = newVideo.sourceType === 'youtube'
      ? normalizeYoutubeLink(newVideo.link)
      : newVideo.link

    // Validate link based on source type
    if (newVideo.sourceType === 'youtube' && !normalizedLink.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
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
        link: newVideo.sourceType === 'youtube' ? normalizedLink : newVideo.link,
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
      const normalizedLink = editVideo.sourceType === 'youtube'
        ? normalizeYoutubeLink(editVideo.link)
        : editVideo.link

      if (editVideo.sourceType === 'youtube' && !normalizedLink.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
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
          link: editVideo.sourceType === 'youtube' ? normalizedLink : editVideo.link,
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

  // Delete handlers
  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return
    try {
      setDeleting(true)
      const videoDocRef = doc(db, "courses", courseTitle as string, "videos", videoToDelete.id)
      await deleteDoc(videoDocRef)
      setVideos((prev) => prev.filter((v) => v.id !== videoToDelete.id))
      toast({
        title: "Success",
        description: "Video deleted successfully!",
      })
    } catch (err) {
      console.error("Error deleting video:", err)
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setIsDeleteDialogOpen(false)
      setVideoToDelete(null)
    }
  }

  // Decodes HTML entities (in case a raw embed snippet's src ever got pasted)
  // and normalizes a pasted <iframe> embed code down to a plain URL
  const normalizeYoutubeLink = (input: string) => {
    let trimmed = input.trim()
    const iframeSrcMatch = trimmed.match(/src=["']([^"']+)["']/)
    let url = iframeSrcMatch ? iframeSrcMatch[1] : trimmed
    url = url
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    return url
  }

  // Extracts a video ID or playlist ID from any YouTube link shape:
  // watch, youtu.be, /embed/VIDEO_ID, /embed/videoseries?list=..., /shorts/
  const parseYoutubeSource = (rawUrl: string): { videoId?: string; playlistId?: string } => {
    try {
      const parsedUrl = new URL(rawUrl)

      if (parsedUrl.hostname === "youtu.be") {
        return { videoId: parsedUrl.pathname.slice(1) }
      }

      if (parsedUrl.hostname.includes("youtube.com")) {
        const listId = parsedUrl.searchParams.get("list")

        if (parsedUrl.pathname.startsWith("/embed/videoseries")) {
          return listId ? { playlistId: listId } : {}
        }

        const embedMatch = parsedUrl.pathname.match(/^\/embed\/([^/?]+)/)
        if (embedMatch) {
          return listId ? { videoId: embedMatch[1], playlistId: listId } : { videoId: embedMatch[1] }
        }

        const watchId = parsedUrl.searchParams.get("v")
        if (watchId) {
          return listId ? { videoId: watchId, playlistId: listId } : { videoId: watchId }
        }

        const shortsMatch = parsedUrl.pathname.match(/^\/shorts\/([^/?]+)/)
        if (shortsMatch) return { videoId: shortsMatch[1] }
      }

      return {}
    } catch (error) {
      return {}
    }
  }

  const getVideoEmbedUrl = (video: Video) => {
    if (video.sourceType === 'youtube') {
      const { videoId, playlistId } = parseYoutubeSource(video.link)
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
      if (playlistId) return `https://www.youtube.com/embed/videoseries?list=${playlistId}`
      return ''
    } else if (video.sourceType === 'gdrive') {
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

      {/* YouTube Channel Sync */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>YouTube Auto-Sync</CardTitle>
          <CardDescription>
            Link a YouTube channel to auto-detect new uploads for this course. Detected videos wait for your approval below before going live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>YouTube Channel ID</Label>
              <Input
                value={youtubeChannelId}
                onChange={(e) => setYoutubeChannelId(e.target.value)}
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <Button onClick={handleSaveChannelId} disabled={savingChannelId}>
              {savingChannelId ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Videos Review Queue */}
      {pendingVideos.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle>Pending Videos ({pendingVideos.length})</CardTitle>
            <CardDescription>New uploads detected from YouTube. Set a serial number and approve to publish.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingVideos.map((pending) => (
                <div key={pending.id} className="flex items-center gap-4 border rounded-md p-3">
                  {pending.thumbnailUrl && (
                    <img src={pending.thumbnailUrl} alt={pending.title} className="w-32 h-auto rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{pending.title}</p>
                    <p className="text-sm text-muted-foreground">Video ID: {pending.videoId}</p>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Serial No</Label>
                    <Input
                      type="number"
                      value={pendingSerialNos[pending.id] ?? videos.length + 1}
                      onChange={(e) =>
                        setPendingSerialNos((prev) => ({ ...prev, [pending.id]: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="default"
                    disabled={processingPendingId === pending.id}
                    onClick={() => handleApprovePending(pending)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={processingPendingId === pending.id}
                    onClick={() => handleRejectPending(pending)}
                  >
                    <XIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                <Label>Video Source</Label>
                <select 
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
                  placeholder={newVideo.sourceType === 'youtube' ? 'Paste a link, embed code, or playlist embed' : 'https://drive.google.com/file/d/...'}
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
                      <div className="flex items-center gap-1">
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
                              <Label>Video Source</Label>
                              <select 
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
                                placeholder={editVideo?.sourceType === 'youtube' ? 'Paste a link, embed code, or playlist embed' : 'https://drive.google.com/file/d...'}
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

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(video)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{videoToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}