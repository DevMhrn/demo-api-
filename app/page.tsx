import { ProgramFitDashboard } from "@/components/program-fit-dashboard"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Program Fit Evaluator</h1>
      <ProgramFitDashboard />
    </main>
  )
}
