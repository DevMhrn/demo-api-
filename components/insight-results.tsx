"use client"

import type { InsightEvaluation } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, AlertCircle, Users, Target, Lightbulb, MessageSquare, TrendingUp, Brain, Shield, Zap, Trophy, Users2, BarChart3 } from "lucide-react"

interface InsightResultsProps {
  evaluation: InsightEvaluation
}

export function InsightResults({ evaluation }: InsightResultsProps) {
  const { targetEmail, status, targetInfo, similarLearners, analysis, error, loadingStage } = evaluation

  // Render loading state with specific messages
  const renderLoadingState = () => {
    if (status !== "loading") return null;

    let message = "Processing...";
    let detail = "";

    switch (loadingStage) {
      case "fetchingTarget":
        message = "Fetching target learner data...";
        detail = "Retrieving learner profile information from database";
        break;
      case "findingSimilar":
        message = "Finding similar learners...";
        detail = "Searching for learners with matching Academic Specialization and Job Role";
        break;
      case "fetchingTranscripts":
        message = "Downloading call transcripts...";
        detail = "Retrieving and processing conversation data from similar learners";
        break;
      case "analyzing":
        message = "Analyzing data and generating insights...";
        detail = "Using AI to analyze patterns and create sales strategies";
        break;
      default:
        message = "Processing request...";
        detail = "Please wait while we process your request";
        break;
    }

    return (
      <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
        <div className="flex items-center mb-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-lg">{message}</span>
        </div>
        {detail && <p className="text-sm text-center text-muted-foreground mb-4">{detail}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Target className="h-5 w-5" />
                Sales Intelligence for {targetEmail}
              </CardTitle>
              <CardDescription>
                {targetInfo && (
                  <>
                    {targetInfo.academicSpecialisation && `Academic: ${targetInfo.academicSpecialisation}`}
                    {targetInfo.academicSpecialisation && targetInfo.currentDesignation && " • "}
                    {targetInfo.currentDesignation && `Role: ${targetInfo.currentDesignation}`}
                  </>
                )}
              </CardDescription>
            </div>
            <StatusBadge status={status} similarCount={similarLearners?.length || 0} />
          </div>
        </CardHeader>

        <CardContent>
          {status === "pending" && (
            <div className="py-4 text-center text-muted-foreground">Waiting to process...</div>
          )}

          {status === "loading" && renderLoadingState()}

          {status === "error" && (
            <div className="py-4 text-center text-destructive">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              Error: {error || "An unknown error occurred"}
            </div>
          )}

          {/* Target Learner Info */}
          {targetInfo && (
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Prospect Profile
              </h3>
              <div className="bg-slate-50 rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoItem label="Full Name" value={targetInfo.fullName || "N/A"} />
                  <InfoItem label="Email" value={targetInfo.email} />
                  <InfoItem label="Academic Specialization" value={targetInfo.academicSpecialisation || "N/A"} />
                  <InfoItem label="Current Job Role" value={targetInfo.currentDesignation || "N/A"} />
                  <InfoItem label="Years of Experience" value={targetInfo.yearsOfExperience?.toString() || "N/A"} />
                  <InfoItem label="Current Company" value={targetInfo.currentCompany || "N/A"} />
                </div>
              </div>
            </div>
          )}

          {/* Similar Learners Count */}
          {similarLearners && similarLearners.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dataset Analysis ({similarLearners.length} Similar Learners with Transcripts)
              </h3>
              <div className="bg-blue-50 rounded-lg border p-4 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Total Conversations:</span>
                    <span className="ml-2 text-blue-700">{similarLearners.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Academic Match:</span>
                    <span className="ml-2 text-blue-700">{targetInfo?.academicSpecialisation || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Role Match:</span>
                    <span className="ml-2 text-blue-700">{targetInfo?.currentDesignation || 'N/A'}</span>
                  </div>
                </div>
                {similarLearners.length > 20 && (
                  <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                    <p className="text-sm text-yellow-800">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Large dataset detected. Analysis may use a representative sample for optimal performance.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {similarLearners.slice(0, 5).map((learner, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {learner.email}
                  </Badge>
                ))}
                {similarLearners.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{similarLearners.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Practical Analysis Results */}
          {analysis && status === "complete" && (
            <div className="space-y-6">
              {/* Executive Summary */}
              {analysis.executiveSummary && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {analysis.executiveSummary.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                        <p key={idx} className="text-sm leading-relaxed mb-3 text-gray-700">{paragraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prospect Psychology */}
              {analysis.prospectPsychology && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Prospect Psychology
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {analysis.prospectPsychology.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                        <p key={idx} className="text-sm leading-relaxed mb-3 text-gray-700">{paragraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Winning Sales Strategies */}
              {analysis.winningStrategies && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Winning Sales Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {parseStrategies(analysis.winningStrategies).map((strategy, idx) => (
                        <div key={idx} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h4 className="font-semibold text-base text-blue-800 mb-3 flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            {strategy.name}
                          </h4>
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">How to Execute</h5>
                              <p className="text-sm text-gray-700">{strategy.execution}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                              <h5 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Why It Works</h5>
                              <p className="text-sm text-green-800 italic">{strategy.reasoning}</p>
                            </div>
                            {strategy.example && (
                              <div className="bg-amber-50 p-3 rounded border-l-4 border-amber-400">
                                <h5 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Conversation Example</h5>
                                <blockquote className="text-sm italic text-amber-800">"{strategy.example}"</blockquote>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Common Objections & Responses */}
              {analysis.objections && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Common Objections & Responses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {parseObjections(analysis.objections).map((objection, idx) => (
                        <div key={idx} className="border rounded-lg p-4 bg-gradient-to-r from-red-50 to-orange-50">
                          <div className="space-y-3">
                            <div className="bg-red-100 p-3 rounded border-l-4 border-red-400">
                              <h5 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Prospect Says
                              </h5>
                              <blockquote className="text-sm italic text-red-800">"{objection.prospect}"</blockquote>
                            </div>
                            <div className="bg-green-100 p-3 rounded border-l-4 border-green-400">
                              <h5 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                Your Response
                              </h5>
                              <p className="text-sm text-green-800">"{objection.response}"</p>
                            </div>
                            {objection.followUp && (
                              <div className="bg-blue-100 p-3 rounded border-l-4 border-blue-400">
                                <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Follow-up Strategy
                                </h5>
                                <p className="text-sm text-blue-800">"{objection.followUp}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Learner Specific Examples - New Section */}
              {analysis.learnerSpecificExamples && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users2 className="h-5 w-5 text-purple-600" />
                      Specific Learner Examples & Responses
                    </CardTitle>
                    <CardDescription>
                      Actual quotes from each learner's transcript with personalized response recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {parseLearnerSpecificExamples(analysis.learnerSpecificExamples).map((example, idx) => (
                        <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="mb-3">
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                              {example.email}
                            </Badge>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                              <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                What This Learner Said
                              </h5>
                              <blockquote className="text-sm italic text-red-800 leading-relaxed">
                                "{example.quote}"
                              </blockquote>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                              <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Your Personalized Response
                              </h5>
                              <p className="text-sm text-green-800 leading-relaxed">"{example.response}"</p>
                            </div>
                            {example.context && (
                              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                <h5 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                  <Brain className="h-4 w-4" />
                                  Why This Works for This Learner
                                </h5>
                                <p className="text-sm text-blue-800 leading-relaxed">{example.context}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation Examples */}
              {analysis.conversationExamples && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      General Conversation Examples
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {parseConversationExamples(analysis.conversationExamples).map((example, idx) => (
                        <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                              <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                What the Prospect Said
                              </h5>
                              <blockquote className="text-sm italic text-red-800 leading-relaxed">"{example.prospect}"</blockquote>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                              <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Recommended Response
                              </h5>
                              <p className="text-sm text-green-800 leading-relaxed">"{example.response}"</p>
                            </div>
                            {example.reasoning && (
                              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                <h5 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                  <Brain className="h-4 w-4" />
                                  Why This Works
                                </h5>
                                <p className="text-sm text-blue-800 italic leading-relaxed">{example.reasoning}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Competitive Insights */}
              {analysis.competitiveInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Competitive Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {analysis.competitiveInsights.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                        <p key={idx} className="text-sm leading-relaxed mb-3 text-gray-700">{paragraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Red Flags */}
              {analysis.redFlags && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Red Flags to Watch For
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {parseRedFlags(analysis.redFlags).map((flag, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="bg-red-100 p-2 rounded-full">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-sm text-red-800 mb-1">{flag.title}</h5>
                              <p className="text-sm text-red-700">{flag.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timing & Follow-up Strategies */}
              {analysis.timingStrategies && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Timing & Follow-up Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {analysis.timingStrategies.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                        <p key={idx} className="text-sm leading-relaxed mb-3 text-gray-700">{paragraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({
  status,
  similarCount,
}: { 
  status: InsightEvaluation["status"];
  similarCount: number;
}) {
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

  if (status === "complete") {
    if (similarCount > 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Insights Generated ({similarCount} learners)
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          No Similar Learners Found
        </Badge>
      )
    }
  }

  return null
}

function InfoItem({ 
  label, 
  value 
}: { 
  label: string; 
  value: string; 
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground block mb-1">{label}</span>
      <span className="text-sm block">{value}</span>
    </div>
  )
}

// Helper functions for parsing structured content
function parseStrategies(strategiesText: string) {
  const strategies: Array<{name: string, execution: string, reasoning: string, example?: string}> = [];
  const lines = strategiesText.split('\n').filter(line => line.trim());
  
  let currentStrategy: Partial<{name: string, execution: string, reasoning: string, example: string}> = {};
  
  for (const line of lines) {
    if (line.includes('**Strategy Name:')) {
      if (currentStrategy.name) {
        strategies.push(currentStrategy as any);
      }
      currentStrategy = { name: line.replace(/.*Strategy Name:\s*/, '').replace(/\*\*/g, '').trim() };
    } else if (line.includes('**How to Execute:')) {
      currentStrategy.execution = line.replace(/.*How to Execute:\s*/, '').replace(/\*\*/g, '').trim();
    } else if (line.includes('**Why It Works:')) {
      currentStrategy.reasoning = line.replace(/.*Why It Works:\s*/, '').replace(/\*\*/g, '').trim();
    } else if (line.includes('**Conversation Example:')) {
      currentStrategy.example = line.replace(/.*Conversation Example:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim();
    }
  }
  
  if (currentStrategy.name) {
    strategies.push(currentStrategy as any);
  }
  
  return strategies;
}

function parseObjections(objectionsText: string) {
  const objections: Array<{prospect: string, response: string, followUp?: string}> = [];
  const lines = objectionsText.split('\n').filter(line => line.trim());
  
  let currentObjection: Partial<{prospect: string, response: string, followUp: string}> = {};
  
  for (const line of lines) {
    if (line.includes('**What They Say:')) {
      if (currentObjection.prospect) {
        objections.push(currentObjection as any);
      }
      currentObjection = { prospect: line.replace(/.*What They Say:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim() };
    } else if (line.includes('**How to Respond:')) {
      currentObjection.response = line.replace(/.*How to Respond:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim();
    } else if (line.includes('**Follow-up Strategy:')) {
      currentObjection.followUp = line.replace(/.*Follow-up Strategy:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim();
    }
  }
  
  if (currentObjection.prospect) {
    objections.push(currentObjection as any);
  }
  
  return objections;
}

function parseConversationExamples(examplesText: string) {
  const examples: Array<{prospect: string, response: string, reasoning?: string}> = [];
  const lines = examplesText.split('\n').filter(line => line.trim());
  
  let currentExample: Partial<{prospect: string, response: string, reasoning: string}> = {};
  
  for (const line of lines) {
    if (line.includes('**What the Prospect Said:')) {
      if (currentExample.prospect) {
        examples.push(currentExample as any);
      }
      currentExample = { prospect: line.replace(/.*What the Prospect Said:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim() };
    } else if (line.includes('**Recommended Response:')) {
      currentExample.response = line.replace(/.*Recommended Response:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim();
    } else if (line.includes('**Why This Works:')) {
      currentExample.reasoning = line.replace(/.*Why This Works:\s*/, '').replace(/\*\*/g, '').trim();
    }
  }
  
  if (currentExample.prospect) {
    examples.push(currentExample as any);
  }
  
  return examples;
}

// Helper function to parse learner-specific examples
function parseLearnerSpecificExamples(examplesText: string) {
  const examples: Array<{email: string, quote: string, response: string, context?: string}> = [];
  const lines = examplesText.split('\n').filter(line => line.trim());
  
  let currentExample: Partial<{email: string, quote: string, response: string, context: string}> = {};
  
  for (const line of lines) {
    if (line.includes('Learner Email:')) {
      // Save previous example if complete
      if (currentExample.email && currentExample.quote && currentExample.response) {
        examples.push(currentExample as any);
      }
      // Start new example
      currentExample = { 
        email: line.replace(/.*Learner Email:\s*/, '').replace(/\*\*/g, '').trim() 
      };
    } else if (line.includes('What They Said:')) {
      currentExample.quote = line.replace(/.*What They Said:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim();
    } else if (line.includes('Recommended Response:')) {
      currentExample.response = line.replace(/.*Recommended Response:\s*/, '').replace(/\*\*/g, '').replace(/"/g, '').trim();
    } else if (line.includes('Context:')) {
      currentExample.context = line.replace(/.*Context:\s*/, '').replace(/\*\*/g, '').trim();
    }
  }
  
  // Add the last example if complete
  if (currentExample.email && currentExample.quote && currentExample.response) {
    examples.push(currentExample as any);
  }
  
  return examples;
}

function parseRedFlags(redFlagsText: string) {
  const flags: Array<{title: string, description: string}> = [];
  const lines = redFlagsText.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Look for numbered lists or bullet points
    if (line.match(/^\d+\./) || line.match(/^[-•*]/) || line.includes('**') || line.includes(':')) {
      // Extract title and description
      let title = '';
      let description = '';
      
      if (line.includes(':')) {
        const parts = line.split(':');
        title = parts[0].replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
        description = parts.slice(1).join(':').trim();
      } else {
        // If no colon, use the whole line as title
        title = line.replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
        description = '';
      }
      
      if (title) {
        flags.push({ title, description });
      }
    }
  }
  
  // If no structured flags found, create generic ones from paragraphs
  if (flags.length === 0) {
    const paragraphs = redFlagsText.split('\n').filter(p => p.trim() && p.length > 10);
    paragraphs.forEach((paragraph, idx) => {
      flags.push({
        title: `Red Flag ${idx + 1}`,
        description: paragraph.trim()
      });
    });
  }
  
  return flags;
}
