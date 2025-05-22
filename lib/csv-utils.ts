import type { LearnerEvaluation } from "@/types"

export function generateCSV(evaluations: LearnerEvaluation[]): string {
  if (!evaluations || evaluations.length === 0) {
    return ""
  }

  const headers = [
    "Email",
    "Status",
    "Program",
    "Years of Experience",
    "Current Company",
    "Current Designation",
    "Current CTC",
    "Is Fit",
    "Fit For Other Program",
    "Recommended Program",
    "Explanation",
    "Transcript Summary", // Added AI-generated transcript summary
    "Call Dates",
    // Removed "Call Contents" header as we don't want to include transcripts
  ]

  const rows = evaluations.map((evaluation) => {
    const { email, status, info, analysis, transcripts } = evaluation

    const callDates = transcripts?.transcripts.map((t) => t.callDate).join(";") || ""
    // Removed call contents variable as we're excluding it from the export

    return [
      email,
      status,
      info?.program || "",
      info?.yearsOfExperience?.toString() || "",
      info?.currentCompany || "",
      info?.currentDesignation || "",
      info?.currentCTC || "",
      analysis?.isFit?.toString() || "",
      analysis?.fitForOtherProgram?.toString() || "",
      analysis?.recommendedProgram || "",
      analysis?.explanation || "",
      analysis?.transcriptSummary || "", // Include the AI-generated summary
      callDates,
      // Removed call contents from the row data
    ]
  })

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  return csv
}

export function downloadCSV(csvContent: string, filename = "program-fit-evaluations.csv"): void {
  // Add timestamp to filename if not provided
  if (filename === "program-fit-evaluations.csv") {
    const date = new Date()
    const timestamp = date.toISOString().replace(/[:.]/g, "-").substring(0, 19)
    filename = `program-fit-evaluations-${timestamp}.csv`
  }

  // Create a blob with the CSV data
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  // Create a download link
  const link = document.createElement("a")

  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Set link properties
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  // Add to document, click to download, then remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL
  URL.revokeObjectURL(url)
}