"use server"

import { fetchLearnerInfo, fetchLearnerTranscripts, analyzeProgramFit } from "@/lib/api-service"
import type { LearnerEvaluation, LoadingStage } from "@/types"

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
