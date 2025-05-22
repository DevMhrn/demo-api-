"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { 
  fetchLearnerInfoAction, 
  fetchLearnerTranscriptsAction, 
  analyzeAndCompleteAction,
  initializeDatabaseAction 
} from "@/app/actions"
import type { LearnerEvaluation, LoadingStage } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { EvaluationResults } from "./evaluation-results"
import { LoadingIndicator } from "./loading-indicator"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DialogTitle } from "@/components/ui/dialog"

export function ProgramFitDashboard() {
  const [emailsInput, setEmailsInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [evaluations, setEvaluations] = useState<LearnerEvaluation[]>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [isDbReady, setIsDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([])
  const hasNotifiedDbReady = useRef(false)
  const hasNotifiedEvalComplete = useRef(false)
  const notificationAudio = useRef<HTMLAudioElement | null>(null)
  
  // Initialize notification audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      notificationAudio.current = new Audio('/notification-sound.mp3')
      
      // Create a fallback sound if the file doesn't exist
      notificationAudio.current.onerror = () => {
        const fallbackAudio = new Audio()
        fallbackAudio.src = 'data:audio/wav;base64,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'
        notificationAudio.current = fallbackAudio
      }
    }
  }, [])

  // Function to play notification sound with fallback
  const playNotificationSound = () => {
    try {
      if (notificationAudio.current) {
        // Reset to start and play
        notificationAudio.current.currentTime = 0
        notificationAudio.current.play().catch(err => {
          console.log("Audio playback error (expected on first interaction):", err)
        })
      }
    } catch (error) {
      console.error("Failed to play notification sound:", error)
    }
  }

  // Show a toast notification with fallback for when Notifications API is blocked
  const showNotification = (title: string, message: string) => {
    // Try browser notifications first
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico"
        })
        playNotificationSound()
        return true
      } catch (error) {
        console.log("Notification API error:", error)
      }
    }
    
    // Add a visual notification as fallback
    // We'll use an alert for simplicity, but in production you'd use a toast system
    playNotificationSound()
    setTimeout(() => alert(`${title}: ${message}`), 500)
    return false
  }

  // Request notification permission when user interacts with the page
  const requestNotificationPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission()
    }
  }

  // Add click listener to request notification permission
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleClick = () => requestNotificationPermission()
      window.addEventListener('click', handleClick, { once: true })
      return () => window.removeEventListener('click', handleClick)
    }
  }, [])

  // Notify when DB is ready
  useEffect(() => {
    if (isDbReady && !hasNotifiedDbReady.current) {
      showNotification(
        "Database Ready 🎧", 
        "The learner and transcript database is ready. You can start your analysis now!"
      )
      hasNotifiedDbReady.current = true
    }
  }, [isDbReady])

  // Notify when all evaluations are complete
  useEffect(() => {
    if (
      evaluations.length > 0 &&
      !isSubmitting &&
      evaluations.every(e => e.status === "complete" || e.status === "error") &&
      !hasNotifiedEvalComplete.current
    ) {
      showNotification(
        "Analysis Complete ✅", 
        `All ${evaluations.length} learner program fit evaluations are complete!`
      )
      hasNotifiedEvalComplete.current = true
    }
    // Reset notification flag if new evaluations are started
    if (isSubmitting) {
      hasNotifiedEvalComplete.current = false
    }
  }, [evaluations, isSubmitting])

  // Download CSV files when the component mounts
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const result = await initializeDatabaseAction()
        
        if (result.success) {
          setIsDbReady(true)
          setDownloadedFiles(result.files)
        } else {
          setDbError(result.message)
        }
      } catch (error) {
        console.error("Failed to download CSV files:", error)
        setDbError(error instanceof Error ? error.message : "An unknown error occurred")
      }
    }
    
    initializeDatabase()
  }, [])

  // Helper function to update a specific evaluation in the state
  const updateEvaluation = (email: string, updatedEval: Partial<LearnerEvaluation>) => {
    setEvaluations((prev) =>
      prev.map((item) =>
        item.email === email
          ? { ...item, ...updatedEval }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Don't proceed if database isn't ready
    if (!isDbReady) {
      setDbError("Database files are not ready yet. Please wait or refresh the page.")
      return
    }

    if (!emailsInput.trim()) return

    // Parse emails (split by newline and filter empty lines)
    const emails = emailsInput
      .split("\n")
      .map((email) => email.trim())
      .filter((email) => email.length > 0)

    if (emails.length === 0) return

    setIsSubmitting(true)
    setOverallProgress(0)

    // Initialize evaluations
    const initialEvaluations = emails.map((email) => ({
      email,
      status: "pending" as const,
    }))

    setEvaluations(initialEvaluations)

    // Process each email
    const promises = emails.map(async (email, index) => {
      try {
        // Step 1: Initial loading state
        updateEvaluation(email, { 
          status: "loading", 
          loadingStage: "fetchingInfo" 
        })
        
        // Step 2: Fetch learner info and show it immediately
        const infoResult = await fetchLearnerInfoAction(email)
        updateEvaluation(email, infoResult)
        
        // If error occurred during info fetching, stop here
        if (infoResult.status === 'error') {
          setOverallProgress((prev) => prev + 100 / emails.length)
          return null
        }
        
        // Step 3: Fetch transcripts and show them immediately
        const transcriptsResult = await fetchLearnerTranscriptsAction(email, infoResult.info)
        updateEvaluation(email, transcriptsResult)
        
        // If error occurred during transcript fetching, stop here
        if (transcriptsResult.status === 'error') {
          setOverallProgress((prev) => prev + 100 / emails.length)
          return null
        }
        
        // Step 4: Complete the analysis
        const finalResult = await analyzeAndCompleteAction(
          email, 
          transcriptsResult.info, 
          transcriptsResult.transcripts
        )
        
        // Update with final complete result
        updateEvaluation(email, finalResult)
        
        // Update overall progress
        setOverallProgress((prev) => prev + 100 / emails.length)
        
        return finalResult
      } catch (error) {
        // Handle errors
        updateEvaluation(email, {
          status: "error" as const,
          error: error instanceof Error ? error.message : "An unknown error occurred",
        })

        // Still update progress even on error
        setOverallProgress((prev) => prev + 100 / emails.length)

        return null
      }
    })

    await Promise.all(promises)
    setIsSubmitting(false)
  }

  // Modal for database loading
  const showDbLoadingModal = !isDbReady && !dbError

  return (
    <>

      {/* Modal shown while DB is downloading */}
      <Dialog open={showDbLoadingModal}>
        <DialogContent className="max-w-md text-center">
          <DialogTitle asChild>
            <h2 className="text-lg font-semibold mb-2">🎧 Preparing Database...</h2>
          </DialogTitle>
          <p className="mb-2">
            We are downloading the latest learner and transcript data. This may take a few moments depending on file size and network speed.
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Please do not close or refresh the page until this process is complete.
          </p>
          <p className="text-sm text-blue-700 mb-1">
            Meanwhile, you can pick up your earpods or headset and listen to your favourite music! 🎶🕺
          </p>
          <p className="text-sm text-green-700">
            Once done, we will notify you! ✅
          </p>
        </DialogContent>
      </Dialog>

      {/* Dashboard content only shown after DB is ready */}
      {isDbReady && (
        <div className="space-y-8">
          {dbError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-600">Error loading database: {dbError}</p>
            </Card>
          )}

          {!isDbReady && !dbError && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p>Loading database files...</p>
            </Card>
          )}
          
          {isDbReady && downloadedFiles.length > 0 && (
            <Card className="p-4 bg-green-50 border-green-200">
              <p className="text-green-600">
                Database ready! Downloaded files: {downloadedFiles.join(", ")}
              </p>
            </Card>
          )}

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="emails" className="block text-sm font-medium mb-2">
                  Enter email addresses (one per line)
                </label>
                <Textarea
                  id="emails"
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  placeholder="john.doe@example.com&#10;jane.smith@example.com"
                  rows={5}
                  className="w-full"
                  disabled={isSubmitting || !isDbReady}
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting || !emailsInput.trim() || !isDbReady} 
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Processing..." : "Evaluate Program Fit"}
              </Button>
            </form>
          </Card>

          {evaluations.length > 0 && (
            <div className="space-y-6">
              {isSubmitting && <LoadingIndicator progress={overallProgress} />}
              <EvaluationResults evaluations={evaluations} />
            </div>
          )}
        </div>
      )}
    </>
  )
}