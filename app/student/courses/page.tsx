"use client"

import StudentLayout from "@/components/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import { arrayUnion, collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from "firebase/firestore"
import { Book, Play, Video, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

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
  courseName: string
  status?: "Active" | "Inactive"
}

interface VideoType {
  id: string
  link: string
  serialNo: number
  title: string
  completedBy: string[] // Array of student IDs who completed this video
  sourceType: 'youtube' | 'gdrive' // Add support for both video types
}

export default function CoursesPage() {
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [videos, setVideos] = useState<VideoType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([])
  const playerRef = useRef<any>(null)

  useEffect(() => {
    const studentData = getStudentSession()
    if (studentData) {
      setStudent(studentData)
      
      // Fetch videos and completed lessons count
      const fetchInitialData = async () => {
        const videos = await fetchVideos(studentData.courseName)
        
        // Get completed videos from completedBy arrays
        const completedIds = videos
          .filter(video => video.completedBy?.includes(studentData.id))
          .map(video => video.id)
        
        setCompletedVideoIds(completedIds)
        setCompletedLessons(completedIds.length)
      }
      
      fetchInitialData()
    } else {
      router.push("/login")
    }
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      console.log("Initializing YouTube API...");
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      tag.onload = () => console.log("YouTube API script loaded");
      document.body.appendChild(tag)

      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube API Ready");
        if (selectedVideo) {
          loadYouTubePlayer(selectedVideo.link);
        }
      }
    }
  }, [])

  const fetchVideos = async (courseName: string) => {
    try {
      const videosCollection = collection(db, `courses/${encodeURIComponent(courseName)}/videos`)
      const q = query(videosCollection, orderBy("serialNo"))
      const querySnapshot = await getDocs(q)
      const videoList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        link: doc.data().link,
        serialNo: doc.data().serialNo,
        title: doc.data().title,
        completedBy: doc.data().completedBy || [],
        sourceType: doc.data().sourceType // Get sourceType from Firestore
      }))
      setVideos(videoList)

      // Update completedVideoIds based on completedBy arrays
      if (student) {
        const completedIds = videoList
          .filter(video => video.completedBy?.includes(student.id))
          .map(video => video.id)
        setCompletedVideoIds(completedIds)
        setCompletedLessons(completedIds.length)
      }
      
      return videoList
    } catch (error) {
      console.error("Error fetching videos:", error)
      setVideos([])
      return []
    }
  }

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
  const getVideoEmbedUrl = (video: VideoType) => {
    if (video.sourceType === 'youtube') {
      const videoId = extractVideoId(video.link);
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (video.sourceType === 'gdrive') {
      const gdriveUrl = video.link;
      const fileId = gdriveUrl.match(/\/d\/(.*?)(\/|$)/)?.[1] || "";
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return '';
  }

  const loadYouTubePlayer = (url: string) => {
    console.log("Loading YouTube player for URL:", url);
    // Updated video ID extraction to handle query parameters
    const videoIdMatch = url.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/)([^?&]+)/)
    const videoId = videoIdMatch?.[1]

    if (!videoId || !window.YT) {
      console.log("Invalid video ID or YouTube API not ready:", { videoId, apiReady: !!window.YT });
      return;
    }

    if (playerRef.current) {
      console.log("Destroying existing player");
      playerRef.current.destroy()
    }

    let hasMarkedAsCompleted = false
    console.log("Creating new player with video ID:", videoId);

    playerRef.current = new window.YT.Player("yt-player", {
      videoId,
      playerVars: {
        enablejsapi: 1,
        origin: window.location.origin,
        widget_referrer: window.location.origin,
        rel: 0,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onError: (error: any) => {
          console.error("YouTube player error:", error);
        },
        onReady: (event: any) => {
          console.log("Player ready");
          try {
            event.target.playVideo()
          } catch (err) {
            console.error("Error playing video:", err)
          }
        },
        onStateChange: (event: any) => {
          console.log("Player state changed:", event.data);
          try {
            // Check if video is playing (state 1)
            if (event.data === window.YT.PlayerState.PLAYING) {
              console.log("Video started playing");
              if (!hasMarkedAsCompleted) {
                // Check completion every second instead of waiting 10 seconds
                const checkInterval = setInterval(() => {
                  if (!playerRef.current) {
                    clearInterval(checkInterval);
                    return;
                  }
                  const currentTime = playerRef.current.getCurrentTime();
                  console.log("Current time:", currentTime);
                  if (currentTime >= 10) {
                    clearInterval(checkInterval);
                    if (!hasMarkedAsCompleted) {
                      hasMarkedAsCompleted = true;
                      console.log("Marking as completed at time:", currentTime);
                      markVideoAsCompleted();
                    }
                  }
                }, 1000);
              }
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log("Video ended, playing next");
              if (!hasMarkedAsCompleted) {
                hasMarkedAsCompleted = true;
                markVideoAsCompleted();
              }
              playNextVideo();
            }
          } catch (err) {
            console.error("Error in onStateChange:", err)
          }
        },
      },
    })
  }

  const markVideoAsCompleted = async () => {
    if (!selectedVideo || !student?.id) {
      console.log("Missing video or student ID:", { videoId: selectedVideo?.id, studentId: student?.id });
      return;
    }

    try {
      const videoRef = doc(db, `courses/${encodeURIComponent(student.courseName)}/videos/${selectedVideo.id}`)
      const videoDoc = await getDoc(videoRef)
      
      if (videoDoc.exists()) {
        const videoData = videoDoc.data();
        console.log("Current video data:", videoData);
        const completedBy = videoData.completedBy || []
        if (!completedBy.includes(student.id)) {
          console.log("Marking video as completed for student:", student.id);
          // Add student ID to completedBy array
          await updateDoc(videoRef, {
            completedBy: arrayUnion(student.id)
          })
          // Update local states
          setCompletedLessons((prev) => prev + 1)
          setCompletedVideoIds(prev => [...prev, selectedVideo.id])
          console.log("Successfully marked video as completed");
        } else {
          console.log("Video already marked as completed for student:", student.id);
        }
      } else {
        console.log("Video document not found:", selectedVideo.id);
      }
    } catch (error) {
      console.error("Error marking video as completed:", error)
    }
  }

  const playNextVideo = () => {
    if (!selectedVideo || videos.length === 0) return
    
    const currentIndex = videos.findIndex((v) => v.id === selectedVideo.id)
    const nextVideo = videos[currentIndex + 1]
    if (nextVideo) {
      setSelectedVideo(nextVideo)
    } else {
      setSelectedVideo(null)
    }
  }

  // Add progress tracking for Google Drive videos
  const handleVideoProgress = (video: VideoType) => {
    if (!video || completedVideoIds.includes(video.id)) return;
    
    // Mark as complete after 10 seconds
    setTimeout(() => {
      markVideoAsCompleted();
    }, 10000);
  }

  useEffect(() => {
    if (selectedVideo && selectedVideo.sourceType === 'youtube') {
      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          loadYouTubePlayer(selectedVideo.link)
          clearInterval(interval)
        }
      }, 500)
      return () => clearInterval(interval)
    }
  }, [selectedVideo])

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
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{student.coursesEnrolled}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Current Course</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{student.courseName}</p>
              </div>
            </div>

            {videos.length > 0 ? (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                  <Play className="h-5 w-5 text-purple-500 mr-2" /> Course Videos
                </h3>
                <div className="grid gap-4">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className={`border border-slate-200 dark:border-slate-800 p-5 rounded-lg hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-900 ${
                        completedVideoIds.includes(video.id) ? 'border-l-4 border-l-green-500' : ''
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
                            Video #{video.serialNo} in your learning path
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedVideo(video)}
                          className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                        >
                          <Play className="h-4 w-4 mr-1" /> {completedVideoIds.includes(video.id) ? 'Rewatch' : 'Watch'}
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
        </Card>        {selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg max-w-3xl w-full relative">
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">{selectedVideo.title}</h2>
              <div className="aspect-w-16 aspect-h-9">
                {selectedVideo.sourceType === 'youtube' ? (
                  <div id="yt-player" className="w-full h-[400px] rounded overflow-hidden" />
                ) : (
                  <iframe
                    src={getVideoEmbedUrl(selectedVideo)}
                    className="w-full h-[400px] rounded overflow-hidden"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => handleVideoProgress(selectedVideo)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>    </StudentLayout>
  )
}
