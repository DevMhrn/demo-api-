"use server"

import { fetchLearnerInfo, fetchLearnerTranscripts, analyzeProgramFit, findSimilarLearners, fetchMultipleLearnerTranscripts } from "@/lib/api-service"
import { generateSalesInsights } from "@/lib/openai-client"
import type { LearnerEvaluation, LoadingStage, InsightEvaluation, SimilarLearnerData } from "@/types"

import { downloadDatabaseCSVs } from "@/lib/server-utils";
/**
 * Evaluates a learner through a step-by-step process
 * Modified to avoid calling client callbacks from server
 */
export async function evaluateLearner(email: string): Promise<LearnerEvaluation> {
  try {
    // STEP 1: Fetch learner info
    const info = await fetchLearnerInfo(email);
    
    // If no program found, return early with completed state
    if (!info.program) {
      return {
        email,
        status: 'complete',
        info,
        analysis: {
          email,
          isFit: false,
          fitForOtherProgram: false,
          recommendedProgram: null,
          explanation: "Learner is not enrolled in any program.",
        },
      };
    }
    
    // STEP 2: Fetch transcripts
    const transcripts = await fetchLearnerTranscripts(email);
    
    // STEP 3: Analyze program fit
    const analysis = await analyzeProgramFit(email, info, transcripts);
    
    // Complete with all data
    return {
      email,
      status: 'complete',
      info,
      transcripts,
      analysis,
    };
    
  } catch (error) {
    console.error(`Error evaluating learner ${email}:`, error);
    return {
      email,
      status: 'error',
      error: error instanceof Error ? error.message : "An unknown error occurred"
    };
  }
}

/**
 * Gets learner info and returns it immediately
 */
export async function fetchLearnerInfoAction(email: string): Promise<LearnerEvaluation> {
  try {
    // Fetch the learner info
    const info = await fetchLearnerInfo(email);
    
    // Return a partial evaluation with the info
    return {
      email,
      status: 'loading',
      loadingStage: 'fetchingTranscripts',
      info,
    };
  } catch (error) {
    console.error(`Error fetching info for ${email}:`, error);
    return {
      email,
      status: 'error',
      error: error instanceof Error ? error.message : "Failed to fetch learner info"
    };
  }
}

/**
 * Gets learner transcripts and returns them immediately
 */
export async function fetchLearnerTranscriptsAction(email: string, info: any): Promise<LearnerEvaluation> {
  try {
    // Fetch the transcripts
    const transcripts = await fetchLearnerTranscripts(email);
    
    // Return a partial evaluation with info and transcripts
    return {
      email,
      status: 'loading',
      loadingStage: 'analyzing',
      info,
      transcripts,
    };
  } catch (error) {
    console.error(`Error fetching transcripts for ${email}:`, error);
    return {
      email,
      status: 'error',
      info,
      error: error instanceof Error ? error.message : "Failed to fetch transcripts"
    };
  }
}

/**
 * Completes the analysis and returns full results
 */
export async function analyzeAndCompleteAction(email: string, info: any, transcripts: any): Promise<LearnerEvaluation> {
  try {
    // Perform the analysis
    const analysis = await analyzeProgramFit(email, info, transcripts);
    
    // Return the complete evaluation
    return {
      email,
      status: 'complete',
      info,
      transcripts,
      analysis,
    };
  } catch (error) {
    console.error(`Error analyzing data for ${email}:`, error);
    return {
      email,
      status: 'error',
      info,
      transcripts,
      error: error instanceof Error ? error.message : "Failed to analyze program fit"
    };
  }
}

/**
 * Gets the current state of analysis for a specific stage
 * Client will call this separately to get progress updates
 */
export async function getEvaluationState(email: string, stage: LoadingStage): Promise<LearnerEvaluation> {
  // This creates a properly formatted loading state object for the given stage
  return {
    email,
    status: 'loading',
    loadingStage: stage
  };
}

export async function initializeDatabaseAction() {
  return await downloadDatabaseCSVs();
}

/**
 * Fetch target learner info for insights
 */
export async function fetchTargetLearnerAction(email: string): Promise<InsightEvaluation> {
  try {
    const targetInfo = await fetchLearnerInfo(email);
    
    return {
      targetEmail: email,
      status: 'loading',
      loadingStage: 'findingSimilar',
      targetInfo,
    };
  } catch (error) {
    console.error(`Error fetching target learner ${email}:`, error);
    return {
      targetEmail: email,
      status: 'error',
      error: error instanceof Error ? error.message : "Failed to fetch target learner info"
    };
  }
}

/**
 * Find similar learners and fetch their transcripts
 */
export async function fetchSimilarLearnersAction(
  email: string, 
  targetInfo: any, 
  maxCount: number = 10
): Promise<InsightEvaluation> {
  try {
    console.log(`Finding similar learners for ${email} with Academic: ${targetInfo.academicSpecialisation}, Job: ${targetInfo.currentDesignation}`);
    
    // Find similar learners using existing function
    const similarLearners = await findSimilarLearners(targetInfo, maxCount);
    
    console.log(`Found ${similarLearners.length} similar learners`);
    
    if (similarLearners.length === 0) {
      return {
        targetEmail: email,
        status: 'complete',
        targetInfo,
        similarLearners: [],
        analysis: {
          targetEmail: email,
          similarLearnersCount: 0,
          insights: `No similar learners found with matching Academic Specialization (${targetInfo.academicSpecialisation || 'N/A'}) or Job Role (${targetInfo.currentDesignation || 'N/A'}).`,
          keyPatterns: [],
          salesRecommendations: [],
          exampleResponses: []
        }
      };
    }
    
    return {
      targetEmail: email,
      status: 'loading',
      loadingStage: 'fetchingTranscripts',
      targetInfo,
      similarLearners: similarLearners.map(learner => ({
        email: learner.email,
        cleanedTranscription: '',
        info: learner
      }))
    };
  } catch (error) {
    console.error(`Error finding similar learners for ${email}:`, error);
    return {
      targetEmail: email,
      status: 'error',
      targetInfo,
      error: error instanceof Error ? error.message : "Failed to find similar learners"
    };
  }
}

/**
 * Fetch transcripts for similar learners and generate insights
 */
export async function generateInsightsAction(
  email: string,
  targetInfo: any,
  similarLearners: SimilarLearnerData[]
): Promise<InsightEvaluation> {
  try {
    console.log(`Fetching transcripts for ${similarLearners.length} similar learners`);
    
    // Fetch transcripts for all similar learners using existing function
    const transcriptMap = await fetchMultipleLearnerTranscripts(
      similarLearners.map(sl => sl.info)
    );
    
    console.log(`Retrieved transcripts for ${transcriptMap.size} learners`);
    
    // Update similar learners with their transcripts
    const similarLearnersWithTranscripts: SimilarLearnerData[] = similarLearners
      .map(learner => ({
        ...learner,
        cleanedTranscription: transcriptMap.get(learner.email) || ''
      }))
      .filter(learner => learner.cleanedTranscription.length > 50); // Only include learners with substantial transcripts
    
    console.log(`${similarLearnersWithTranscripts.length} learners have usable transcripts`);
    
    if (similarLearnersWithTranscripts.length === 0) {
      return {
        targetEmail: email,
        status: 'complete',
        targetInfo,
        similarLearners: [],
        analysis: {
          targetEmail: email,
          similarLearnersCount: 0,
          insights: "No transcripts found for similar learners to analyze. The similar learners found do not have call transcript data available.",
          keyPatterns: [],
          salesRecommendations: [],
          exampleResponses: []
        }
      };
    }
    
    // Generate sales insights using existing OpenAI function
    console.log(`Generating sales insights using ${similarLearnersWithTranscripts.length} learners' data`);
    const analysis = await generateSalesInsights(targetInfo, similarLearnersWithTranscripts);
    
    return {
      targetEmail: email,
      status: 'complete',
      targetInfo,
      similarLearners: similarLearnersWithTranscripts,
      analysis
    };
  } catch (error) {
    console.error(`Error generating insights for ${email}:`, error);
    return {
      targetEmail: email,
      status: 'error',
      targetInfo,
      similarLearners,
      error: error instanceof Error ? error.message : "Failed to generate sales insights"
    };
  }
}
