export interface LearnerInfo {
  email: string;
  program: string | null;
  yearsOfExperience: number | null;
  currentCompany: string | null;
  currentCTC: string | null;
  currentDesignation: string | null;
  fullName?: string | null;
  academicSpecialisation?: string | null;
  programmingProficiency?: string | null;
  dsaProficiency?: string | null;
  sqlProficiency?: string | null;
}

export interface LearnerTranscript {
  email: string;
  transcripts: {
    callDate: string;
    callId: string;
    content: string;      // Cleaned transcript
    summary?: string;     // AI-generated summary
    rawContent?: string;  // Original raw transcript
  }[];
}

export interface ProgramFitAnalysis {
  email: string;
  isFit: boolean;
  fitForOtherProgram: boolean;
  recommendedProgram: string | null;
  explanation: string;
  transcriptSummary?: string;
}

// Loading stages for the processing flow
export type LoadingStage = "fetchingInfo" | "fetchingTranscripts" | "analyzing" | "initializing";

export interface LearnerEvaluation {
  email: string;
  status: "pending" | "loading" | "complete" | "error";
  info?: LearnerInfo;
  transcripts?: LearnerTranscript;
  analysis?: ProgramFitAnalysis;
  error?: string;
  loadingStage?: LoadingStage; // New field to track current loading stage
}

export interface SalesInsightAnalysis {
  targetEmail: string;
  similarLearnersCount: number;
  insights: string;
  keyPatterns: string[];
  salesRecommendations: string[];
  exampleResponses: {
    email: string;
    response: string;
    context: string;
  }[];
  // Structured sections for practical insights
  executiveSummary?: string;
  prospectPsychology?: string;
  winningStrategies?: string;
  objections?: string;
  conversationExamples?: string;
  learnerSpecificExamples?: string;
  competitiveInsights?: string;
  redFlags?: string;
  timingStrategies?: string;
  // Enhanced comprehensive analysis fields
  datasetOverview?: {
    totalConversations: number;
    averageConversationLength: string;
    conversationQualityDistribution: string;
    learnerProfileDistribution: string;
  };
  universalPsychologicalProfile?: {
    dominantPersonalityTypes: string[];
    universalDecisionTriggers: string[];
    commonEmotionalJourney: string;
    universalFearFactors: string[];
    trustBuildingElements: string[];
  };
  conversationIntelligenceMasterClass?: {
    mostSuccessfulOpenings: Array<{
      approach: string;
      examples: string[];
      successRate: string;
    }>;
    universalPainPoints: Array<{
      painPoint: string;
      frequency: string;
      exactQuotes: string[];
      effectiveResponses: string[];
    }>;
    winningValuePropositions: Array<{
      valueRrop: string;
      conversationExamples: string[];
      learnerTypes: string;
    }>;
    objectionMasterMap: Array<{
      objection: string;
      frequency: string;
      exactPhrasing: string[];
      successfulRebuttals: string[];
      failedApproaches: string[];
    }>;
  };
  behavioralSegmentationInsights?: Array<{
    segmentName: string;
    characteristics: string[];
    conversationPatterns: string[];
    conversionStrategy: string;
    exampleLearners: string[];
    successQuotes: string[];
  }>;
  competitiveIntelligenceBombshell?: {
    competitorsDiscussed: string[];
    whyProspectsChooseCompetitors: string[];
    whyProspectsChooseUs: string[];
    competitiveDifferentiators: string[];
    priceComparisonInsights: string[];
  };
  conversionOptimizationBlueprint?: {
    highestConvertingStrategies: Array<{
      strategy: string;
      conversationExamples: string[];
      timingOptimal: string;
      learnerTypesResponsive: string;
    }>;
    optimalConversationFlow: string;
    followUpSequenceThatWorks: string[];
    urgencyTacticsThatConvert: string[];
  };
  goldmineInsights?: Array<{
    insight: string;
    supportingEvidence: string[];
    competitiveAdvantage: string;
    implementationStrategy: string;
    potentialImpact: string;
  }>;
  conversationTemplateLibrary?: Array<{
    scenario: string;
    provenScript: string;
    conversationEvidence: string[];
    adaptationRules: string;
    successMetrics: string;
  }>;
  dataBasedPredictions?: {
    conversionProbabilityIndicators: string[];
    redFlagPatterns: string[];
    accelerationOpportunities: string[];
    optimalFollowUpTiming: string;
  };
}

export interface SimilarLearnerData {
  email: string;
  cleanedTranscription: string;
  info: LearnerInfo;
}

export interface InsightEvaluation {
  targetEmail: string;
  status: "pending" | "loading" | "complete" | "error";
  targetInfo?: LearnerInfo;
  similarLearners?: SimilarLearnerData[];
  analysis?: SalesInsightAnalysis;
  error?: string;
  loadingStage?: "fetchingTarget" | "findingSimilar" | "fetchingTranscripts" | "analyzing";
}