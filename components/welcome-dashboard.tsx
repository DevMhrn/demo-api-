"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Users, BarChart3, Settings } from "lucide-react"

export function WelcomeDashboard() {
  const router = useRouter()

  const navigationCards = [
    {
      title: "Evaluate Program Fit",
      description: "Analyze learner profiles and call transcripts to determine program suitability",
      icon: GraduationCap,
      route: "/program-fit",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      disabled: false,
    },
    {
      title: "Analytics & Reports",
      description: "View sales analytics and generate reports",
      icon: BarChart3,
      route: "/insights",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      disabled: false,
    },

  ]

  const handleNavigation = (route: string, disabled?: boolean) => {
    if (!disabled) {
      router.push(route)
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome to V0 Tools 🎓
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Analyze learner profiles and call transcripts to determine the best program fit using AI-powered insights
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {navigationCards.map((card) => {
          const IconComponent = card.icon
          return (
            <Card 
              key={card.route}
              className={`cursor-pointer transition-all duration-200 ${card.color} ${
                card.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-1'
              }`}
              onClick={() => handleNavigation(card.route, card.disabled)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    card.disabled ? 'bg-gray-200' : 'bg-white shadow-sm'
                  }`}>
                    <IconComponent className={`h-6 w-6 ${
                      card.disabled ? 'text-gray-400' : 'text-gray-700'
                    }`} />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  {card.disabled && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-600 mb-4">
                  {card.description}
                </CardDescription>
                <Button 
                  variant={card.disabled ? "secondary" : "default"}
                  disabled={card.disabled}
                  className="w-full"
                >
                  {card.disabled ? "Coming Soon" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Stats or Additional Info */}
      <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold mb-3 text-center">🚀 Ready to Get Started?</h3>
        <p className="text-gray-600 text-center">
          Click on specific cards to determine the best program matches for the candidates using our AI-powered evaluation system.
        </p>
      </div>
    </div>
  )
}
