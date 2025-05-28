import { ProgramFitDashboard } from "@/components/program-fit-dashboard"

export default function ProgramFitPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Program Fit Evaluator</h1>
        <p className="text-gray-600">
          Analyze learner profiles and call transcripts to determine program suitability
        </p>
      </div>
      <ProgramFitDashboard />
    </main>
  )
}
