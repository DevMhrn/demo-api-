import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface LoadingIndicatorProps {
  progress: number
  context?: "program-fit" | "insights"
}

export function LoadingIndicator({ progress, context = "program-fit" }: LoadingIndicatorProps) {
  // Round to nearest integer
  const roundedProgress = Math.round(progress)
  
  // Determine stage based on progress and context
  const getStageInfo = () => {
    if (context === "insights") {
      if (roundedProgress < 25) {
        return {
          message: "Fetching target learner data...",
          detail: "Retrieving learner profile information"
        }
      } else if (roundedProgress < 50) {
        return {
          message: "Finding similar learners...",
          detail: "Searching for learners with matching profiles"
        }
      } else if (roundedProgress < 90) {
        return {
          message: "Downloading call transcripts...",
          detail: "Retrieving conversation data from similar learners"
        }
      } else {
        return {
          message: "Generating sales insights...",
          detail: "Using AI to analyze patterns and create strategies"
        }
      }
    } else {
      // Original program-fit logic
      if (roundedProgress < 33) {
        return {
          message: "Fetching learner information...",
          detail: "Reading profiles and academic background"
        }
      } else if (roundedProgress < 66) {
        return {
          message: "Retrieving call transcripts...",
          detail: "Processing conversation data from interview calls"
        }
      } else {
        return {
          message: "Analyzing program fit...",
          detail: "Using AI to evaluate alignment with program requirements"
        }
      }
    }
  }
  
  const stageInfo = getStageInfo()

  return (
    <div className="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <h3 className="text-sm font-medium text-primary">{stageInfo.message}</h3>
        </div>
        <span className="text-sm font-medium text-primary">{roundedProgress}%</span>
      </div>
      
      <Progress value={roundedProgress} className="h-2" />
      
      <p className="text-xs text-muted-foreground">
        {stageInfo.detail}
      </p>
    </div>
  )
}
