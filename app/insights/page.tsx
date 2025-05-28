import { SalesInsightsDashboard } from "@/components/sales-insights-dashboard";

export default function SalesInsightsPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sales Insights Generator</h1>
        <p className="text-gray-600">
          Analyze similar learners to generate powerful sales insights and conversion strategies
        </p>
      </div>
      <SalesInsightsDashboard />
    </main>
  )
}
