"use client"

import type { LearnerEvaluation } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, AlertCircle } from "lucide-react"
import { generateCSV, downloadCSV } from "@/lib/csv-utils"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatTranscriptForDisplay } from "@/lib/transcript-cleaner"
import { User, Briefcase, GraduationCap, Code } from 'lucide-react'

interface EvaluationResultsProps {
  evaluations: LearnerEvaluation[]
}

export function EvaluationResults({ evaluations }: EvaluationResultsProps) {
  if (evaluations.length === 0) return null

  const handleDownloadCSV = () => {
    const csvContent = generateCSV(evaluations)
    downloadCSV(csvContent)
  }

  const completedEvaluations = evaluations.filter((e) => e.status === "complete" || e.status === "error").length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Evaluation Results</h2>

        {completedEvaluations > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Download CSV</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export all evaluation results as CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-4">
        {evaluations.map((evaluation) => (
          <EvaluationCard key={evaluation.email} evaluation={evaluation} />
        ))}
      </div>
    </div>
  )
}

function EvaluationCard({ evaluation }: { evaluation: LearnerEvaluation }) {
  const { email, status, info, transcripts, analysis, error, loadingStage } = evaluation

  // Render loading state with specific messages based on the current stage
  const renderLoadingState = () => {
    if (status !== "loading") return null;

    let message = "Processing...";
    let detail = "";

    switch (loadingStage) {
      case "fetchingInfo":
        message = "Fetching candidate data...";
        detail = "Retrieving learner information from CSV";
        break;
      case "fetchingTranscripts":
        message = "Fetching transcripts...";
        detail = "Downloading and processing call transcripts";
        break;
      case "analyzing":
        message = "Analyzing data & calculating fit...";
        detail = "Using AI to evaluate program fit";
        break;
      default:
        // Use default message
        break;
    }

    return (
      <div className="py-4 flex flex-col items-center justify-center text-muted-foreground">
        <div className="flex items-center mb-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>{message}</span>
        </div>
        {detail && <p className="text-xs text-center text-muted-foreground mb-4">{detail}</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{email}</CardTitle>
            <CardDescription>
              {info?.program && `Enrolled in: ${info.program}`}
              {info && !info?.program && "Not enrolled in any program"}
            </CardDescription>
          </div>
          <StatusBadge status={status} analysis={analysis} />
        </div>
      </CardHeader>

      <CardContent>
        {status === "pending" && <div className="py-4 text-center text-muted-foreground">Waiting to process...</div>}

        {status === "loading" && renderLoadingState()}

        {status === "error" && (
          <div className="py-4 text-center text-destructive">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            Error: {error || "An unknown error occurred"}
          </div>
        )}

        <div className="space-y-4">
          {/* Enhanced Learner Information Display */}
          {info && (
            <div>
              {loadingStage === "fetchingInfo" && (
                <div className="text-sm text-muted-foreground mb-2">Learner information retrieved!</div>
              )}
              
              <div className="bg-slate-50 rounded-lg border p-4">
                {/* Personal Information Section */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2 text-slate-700">
                    <User className="h-4 w-4" /> 
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                    <InfoItem label="Full Name" value={info.fullName || "N/A"} />
                    <InfoItem label="Email" value={info.email} />
                  </div>
                </div>
                
                {/* Program Information */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2 text-slate-700">
                    <GraduationCap className="h-4 w-4" /> 
                    Program Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                    <InfoItem label="Current Program" 
                      value={info.program || "Not enrolled"}
                      highlight={!!info.program} />
                    <InfoItem label="Academic Specialization" 
                      value={info.academicSpecialisation || "N/A"} />
                  </div>
                </div>
                
                {/* Professional Information */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2 text-slate-700">
                    <Briefcase className="h-4 w-4" /> 
                    Professional Background
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                    <InfoItem label="Years of Experience" 
                      value={info.yearsOfExperience?.toString() || "N/A"} />
                    <InfoItem label="Current Designation" 
                      value={info.currentDesignation || "N/A"} />
                    <InfoItem label="Current Company" 
                      value={info.currentCompany || "N/A"} />
                    <InfoItem label="Current CTC" 
                      value={info.currentCTC || "N/A"} />
                  </div>
                </div>
                
                {/* Technical Skills */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2 text-slate-700">
                    <Code className="h-4 w-4" /> 
                    Technical Skills
                  </h3>
                  <div className="grid grid-cols-1 gap-3 pl-6">
                    <InfoItem 
                      label="Programming Proficiency" 
                      value={info.programmingProficiency || "N/A"} 
                      fullWidth 
                    />
                    <InfoItem 
                      label="DSA Proficiency" 
                      value={info.dsaProficiency || "N/A"} 
                      fullWidth 
                    />
                    <InfoItem 
                      label="SQL Proficiency" 
                      value={info.sqlProficiency || "N/A"} 
                      fullWidth 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transcripts - Show when available even if still analyzing */}
          {transcripts && transcripts.transcripts.length > 0 && (
            <>
              {loadingStage === "fetchingTranscripts" && (
                <div className="text-sm text-muted-foreground mb-2">Transcripts retrieved successfully!</div>
              )}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="transcripts">
                  <AccordionTrigger>Call Transcripts ({transcripts.transcripts.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <Accordion type="multiple" className="w-full">
                        {transcripts.transcripts.map((transcript, index) => (
                          <AccordionItem key={index} value={`transcript-${index}`}>
                            <AccordionTrigger className="text-sm font-medium">
                              Call Date: {transcript.callDate}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="bg-slate-50 border rounded-md p-4 my-2 text-sm text-muted-foreground whitespace-pre-wrap">
                                {formatTranscriptForDisplay(transcript.content)}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}

          {/* Analysis - Only shown when complete */}
          {analysis && (
            <div className="mt-4 space-y-3">
              <h3 className="font-medium">Program Fit Analysis</h3>

              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Fit for current program:</span>
                  {analysis.isFit ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      No
                    </Badge>
                  )}
                </div>

                {!analysis.isFit && (
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Fit for other program:</span>
                    {analysis.fitForOtherProgram ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {analysis.recommendedProgram}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        No
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-muted p-3 rounded-md text-sm">
                <h4 className="font-medium mb-1">Explanation:</h4>
                <p>{analysis.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({
  status,
  analysis,
}: { status: LearnerEvaluation["status"]; analysis?: LearnerEvaluation["analysis"] }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        Pending
      </Badge>
    )
  }

  if (status === "loading") {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Processing
      </Badge>
    )
  }

  if (status === "error") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Error
      </Badge>
    )
  }

  if (status === "complete" && analysis) {
    if (analysis.isFit) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Good Fit
        </Badge>
      )
    } else if (analysis.fitForOtherProgram) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Alternative Fit
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Not a Fit
        </Badge>
      )
    }
  }

  return null
}

// Enhanced InfoItem component
function InfoItem({ 
  label, 
  value, 
  highlight = false, 
  fullWidth = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <span className="text-xs font-medium text-muted-foreground block mb-1">{label}</span>
      <span className={`text-sm block ${highlight ? "font-medium text-primary" : ""}`}>
        {value}
      </span>
    </div>
  )
}
