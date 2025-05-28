"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { 
  fetchTargetLearnerAction,
  fetchSimilarLearnersAction,
  generateInsightsAction,
  initializeDatabaseAction 
} from "@/app/actions"
import type { InsightEvaluation } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { InsightResults } from "./insight-results"
import { LoadingIndicator } from "./loading-indicator"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function SalesInsightsDashboard() {
  const [targetEmail, setTargetEmail] = useState("")
  const [maxSimilarLearners, setMaxSimilarLearners] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [evaluation, setEvaluation] = useState<InsightEvaluation | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDbReady, setIsDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  // Initialize database
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const result = await initializeDatabaseAction()
        
        if (result.success) {
          setIsDbReady(true)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isDbReady) {
      setDbError("Database files are not ready yet. Please wait or refresh the page.")
      return
    }

    if (!targetEmail.trim()) return

    setIsSubmitting(true)
    setProgress(0)
    setEvaluation(null)

    try {
      // Step 1: Fetch target learner info (25% progress)
      setProgress(25)
      setEvaluation({
        targetEmail,
        status: 'loading',
        loadingStage: 'fetchingTarget'
      })
      
      const targetResult = await fetchTargetLearnerAction(targetEmail)
      setEvaluation(targetResult)
      
      if (targetResult.status === 'error') {
        setIsSubmitting(false)
        setProgress(100)
        return
      }

      // Step 2: Find similar learners (50% progress)
      setProgress(50)
      setEvaluation(prev => prev ? {
        ...prev,
        status: 'loading',
        loadingStage: 'findingSimilar'
      } : targetResult)
      
      const similarResult = await fetchSimilarLearnersAction(
        targetEmail, 
        targetResult.targetInfo, 
        maxSimilarLearners
      )
      setEvaluation(similarResult)
      
      if (similarResult.status === 'error' || similarResult.status === 'complete') {
        setIsSubmitting(false)
        setProgress(100)
        return
      }

      // Step 3: Fetch transcripts and generate insights (75% progress)
      setProgress(75)
      setEvaluation(prev => prev ? {
        ...prev,
        status: 'loading',
        loadingStage: 'fetchingTranscripts'
      } : similarResult)
      
      // Small delay to show the transcript fetching stage
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update to analyzing stage (90% progress)
      setProgress(90)
      setEvaluation(prev => prev ? {
        ...prev,
        status: 'loading',
        loadingStage: 'analyzing'
      } : similarResult)
      
      const finalResult = await generateInsightsAction(
        targetEmail,
        similarResult.targetInfo,
        similarResult.similarLearners || []
      )
      
      setEvaluation(finalResult)
      setProgress(100)
      
    } catch (error) {
      setEvaluation({
        targetEmail,
        status: "error",
        error: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showDbLoadingModal = !isDbReady && !dbError

  return (
    <>
      {/* Database loading modal */}
      <Dialog open={showDbLoadingModal}>
        <DialogContent className="max-w-md text-center">
          <DialogTitle asChild>
            <h2 className="text-lg font-semibold mb-2">🎧 Preparing Database...</h2>
          </DialogTitle>
          <p className="mb-2">
            We are downloading the latest learner and transcript data. This may take a few moments.
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Please do not close or refresh the page until this process is complete.
          </p>
        </DialogContent>
      </Dialog>

      {/* Main dashboard */}
      {isDbReady && (
        <div className="space-y-8">
          {dbError && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-600">Error loading database: {dbError}</p>
            </Card>
          )}

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="target-email" className="block text-sm font-medium mb-2">
                  Target Prospect Email
                </Label>
                <Input
                  id="target-email"
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="prospect@example.com"
                  className="w-full"
                  disabled={isSubmitting || !isDbReady}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="max-learners" className="block text-sm font-medium mb-2">
                  Maximum Similar Learners to Analyze
                </Label>
                <Input
                  id="max-learners"
                  type="number"
                  min="1"
                  max="50"
                  value={maxSimilarLearners}
                  onChange={(e) => setMaxSimilarLearners(parseInt(e.target.value) || 10)}
                  className="w-full"
                  disabled={isSubmitting || !isDbReady}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !targetEmail.trim() || !isDbReady} 
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Generating Insights..." : "Generate Sales Insights"}
              </Button>
            </form>
          </Card>

          {evaluation && (
            <div className="space-y-6">
              {isSubmitting && <LoadingIndicator progress={progress} context="insights" />}
              <InsightResults evaluation={evaluation} />
            </div>
          )}
        </div>
      )}
    </>
  )
}
