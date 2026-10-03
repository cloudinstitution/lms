"use client"

import StudentLayout from "@/components/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import { arrayUnion, collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from "firebase/firestore"
import { Book, Play, Video, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface Student {
  id: string
  name: string
  username: string
  password: string
  phoneNumber: string
  coursesEnrolled: number
  studentId: string
  joinedDate: string
  // New data = array of course names. Old data = a single string (still supported).
  courseName: string[] | string
  status?: "Active" | "Inactive"
}

interface VideoType {
  id: string
  link: string
  serialNo: number
  title: string
  completedBy: string[] // Array of student IDs who completed this video
  sourceType: "youtube" | "gdrive"
}

// Share of a YouTube video that must be watched before it counts as completed
const COMPLETION_THRESHOLD = 0.8
// Google Drive videos can't be tracked, so they complete after this many ms
const GDRIVE_COMPLETE_DELAY = 10000

// Turns old (string) or new (array) course data into a clean array
const toCourseList = (value: string[] | string | undefined | null): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

export default function CoursesPage() {
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [videos, setVideos] = useState<VideoType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVideosLoading, setIsVideosLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null)
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([])

  const playerRef = useRef<any>(null)
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gdriveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videosRef = useRef<VideoType[]>([])
  const completedRef = useRef<string[]>([])

  const courses = useMemo(() => toCourseList(student?.courseName), [student])

  useEffect(() => {
    videosRef.current = videos
  }, [videos])

  useEffect(() => {
    completedRef.current = completedVideoIds
  }, [completedVideoIds])

  // Load the student session and pick the first course
  useEffect(() => {
    const studentData = getStudentSession()
    if (!studentData) {
      router.push("/login")
      setIsLoading(false)
      return
    }
    setStudent(studentData)
    const list = toCourseList(studentData.courseName)
    if (list.length > 0) setSelectedCourse(list[0])
    setIsLoading(false)
  }, [router])

  // Load the YouTube iframe API once
  useEffect(() => {
    if (typeof window === "undefined" || window.YT) return
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.body.appendChild(tag)
  }, [])

  const fetchVideos = useCallback(async (courseName: string, studentId: string) => {
    setIsVideosLoading(true)
    try {
      const videosCollection = collection(db, `courses/${encodeURIComponent(courseName)}/videos`)
      const q = query(videosCollection, orderBy("serialNo"))
      const querySnapshot = await getDocs(q)
      const videoList: VideoType[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        link: d.data().link,
        serialNo: d.data().serialNo,
        title: d.data().title,
        completedBy: d.data().completedBy || [],
        sourceType: d.data().sourceType,
      }))
      setVideos(videoList)
      setCompletedVideoIds(
        videoList.filter((v) => v.completedBy.includes(studentId)).map((v) => v.id)
      )
    } catch (error) {
      console.error("Error fetching videos:", error)
      setVideos([])
      setCompletedVideoIds([])
    } finally {
      setIsVideosLoading(false)
    }
  }, [])

  // Refetch videos whenever the selected course changes
  useEffect(() => {
    if (!student || !selectedCourse) return
    setSelectedVideo(null)
    fetchVideos(selectedCourse, student.id)
  }, [selectedCourse, student, fetchVideos])

  const getVideoEmbedUrl = (video: VideoType) => {
    if (video.sourceType === "gdrive") {
      const fileId = video.link.match(/\/d\/(.*?)(\/|$)/)?.[1] || ""
      return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return ""
  }

  const clearTimers = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }
    if (gdriveTimerRef.current) {
      clearTimeout(gdriveTimerRef.current)
      gdriveTimerRef.current = null
    }
  }

  const destroyPlayer = () => {
    clearTimers()
    if (playerRef.current) {
      try {
        playerRef.current.destroy()
      } catch (err) {
        console.error("Error destroying player:", err)
      }
      playerRef.current = null
    }
  }

  // Saves completion for a specific video in a specific course
  const markVideoAsCompleted = async (video: VideoType, course: string) => {
    if (!student?.id || !course) return
    if (completedRef.current.includes(video.id)) return

    try {
      const videoRef = doc(db, `courses/${encodeURIComponent(course)}/videos/${video.id}`)
      const videoDoc = await getDoc(videoRef)

      if (!videoDoc.exists()) {
        console.log("Video document not found:", video.id)
        return
      }

      const completedBy: string[] = videoDoc.data().completedBy || []
      if (!completedBy.includes(student.id)) {
        await updateDoc(videoRef, { completedBy: arrayUnion(student.id) })
      }
      setCompletedVideoIds((prev) => (prev.includes(video.id) ? prev : [...prev, video.id]))
    } catch (error) {
      console.error("Error marking video as completed:", error)
    }
  }

  const playNextVideo = (current: VideoType) => {
    const list = videosRef.current
    const currentIndex = list.findIndex((v) => v.id === current.id)
    setSelectedVideo(list[currentIndex + 1] ?? null)
  }

  const loadYouTubePlayer = (video: VideoType, course: string) => {
    const videoIdMatch = video.link.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/)([^?&]+)/)
    const videoId = videoIdMatch?.[1]

    if (!videoId || !window.YT || !window.YT.Player) return

    destroyPlayer()

    let hasMarkedAsCompleted = false

    playerRef.current = new window.YT.Player("yt-player", {
      videoId,
      playerVars: {
        enablejsapi: 1,
        origin: window.location.origin,
        widget_referrer: window.location.origin,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onError: (error: any) => {
          console.error("YouTube player error:", error)
        },
        onReady: (event: any) => {
          try {
            event.target.playVideo()
          } catch (err) {
            console.error("Error playing video:", err)
          }
        },
        onStateChange: (event: any) => {
          try {
            if (event.data === window.YT.PlayerState.PLAYING && !hasMarkedAsCompleted) {
              if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
              checkIntervalRef.current = setInterval(() => {
                const player = playerRef.current
                if (!player || typeof player.getCurrentTime !== "function") {
                  clearTimers()
                  return
                }
                const currentTime = player.getCurrentTime()
                const duration = player.getDuration?.() || 0
                const required = duration > 0 ? duration * COMPLETION_THRESHOLD : 10
                if (currentTime >= required && !hasMarkedAsCompleted) {
                  hasMarkedAsCompleted = true
                  clearTimers()
                  markVideoAsCompleted(video, course)
                }
              }, 1000)
            }

            if (event.data === window.YT.PlayerState.PAUSED && checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current)
              checkIntervalRef.current = null
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              clearTimers()
              if (!hasMarkedAsCompleted) {
                hasMarkedAsCompleted = true
                markVideoAsCompleted(video, course)
              }
              playNextVideo(video)
            }
          } catch (err) {
            console.error("Error in onStateChange:", err)
          }
        },
      },
    })
  }

  // Google Drive videos: complete after a delay. The timer is cleared if the video changes.
  const handleGdriveLoaded = (video: VideoType) => {
    if (completedRef.current.includes(video.id)) return
    if (gdriveTimerRef.current) clearTimeout(gdriveTimerRef.current)
    gdriveTimerRef.current = setTimeout(() => {
      markVideoAsCompleted(video, selectedCourse)
    }, GDRIVE_COMPLETE_DELAY)
  }

  // Start / stop playback when the selected video changes
  useEffect(() => {
    if (!selectedVideo) {
      destroyPlayer()
      return
    }

    if (selectedVideo.sourceType !== "youtube") {
      destroyPlayer()
      return
    }

    const course = selectedCourse
    const video = selectedVideo
    const poll = setInterval(() => {
      if (window.YT && window.YT.Player && document.getElementById("yt-player")) {
        clearInterval(poll)
        loadYouTubePlayer(video, course)
      }
    }, 300)

    return () => {
      clearInterval(poll)
      destroyPlayer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo])

  // Clean up everything when leaving the page
  useEffect(() => {
    return () => destroyPlayer()
  }, [])

  const closeVideo = () => {
    destroyPlayer()
    setSelectedVideo(null)
  }

  if (isLoading) return <div className="p-6">Loading...</div>
  if (!student) return <div className="p-6">No student data available. Redirecting to login...</div>

  return (
    <StudentLayout>
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center">
              <Book className="h-8 w-8 mr-3 text-purple-500" /> Welcome, {student.name}!
            </h1>
            <p className="text-muted-foreground mt-1">Your Course Videos</p>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900 rounded-t-lg">
            <CardTitle className="flex items-center text-slate-800 dark:text-slate-100">
              <Video className="h-5 w-5 text-purple-500 mr-2" /> My Courses
            </CardTitle>
            <CardDescription>Details of your enrolled courses and videos</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-100 dark:border-purple-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Enrolled Courses</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{courses.length}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Current Course</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {selectedCourse || "No course assigned"}
                </p>
              </div>
            </div>

            {courses.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {courses.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCourse(c)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      c === selectedCourse
                        ? "bg-purple-600 text-white dark:bg-purple-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {courses.length === 0 ? (
              <div className="mt-6 p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                <Book className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-muted-foreground">You are not enrolled in any course yet.</p>
              </div>
            ) : isVideosLoading ? (
              <div className="mt-6 p-8 text-center text-muted-foreground">Loading videos...</div>
            ) : videos.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                    <Play className="h-5 w-5 text-purple-500 mr-2" /> Course Videos
                  </h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {completedVideoIds.length} of {videos.length} completed
                  </span>
                </div>
                <div className="grid gap-4">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className={`border border-slate-200 dark:border-slate-800 p-5 rounded-lg hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-900 ${
                        completedVideoIds.includes(video.id) ? "border-l-4 border-l-green-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center">
                            <span className="flex items-center justify-center bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 w-8 h-8 rounded-full font-bold text-sm mr-3">
                              {video.serialNo}
                            </span>
                            <div>
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200">{video.title}</h4>
                              {completedVideoIds.includes(video.id) && (
                                <span className="inline-flex items-center text-sm text-green-600 dark:text-green-400 mt-1">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Video #{video.serialNo} in {selectedCourse}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedVideo(video)}
                          className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                        >
                          <Play className="h-4 w-4 mr-1" /> {completedVideoIds.includes(video.id) ? "Rewatch" : "Watch"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                <Video className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-muted-foreground">No videos available for this course.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg max-w-3xl w-full relative">
              <button
                onClick={closeVideo}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">{selectedVideo.title}</h2>
              <div className="aspect-w-16 aspect-h-9">
                {selectedVideo.sourceType === "youtube" ? (
                  <div id="yt-player" className="w-full h-[400px] rounded overflow-hidden" />
                ) : (
                  <iframe
                    key={selectedVideo.id}
                    src={getVideoEmbedUrl(selectedVideo)}
                    className="w-full h-[400px] rounded overflow-hidden"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => handleGdriveLoaded(selectedVideo)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
