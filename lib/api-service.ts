import type { LearnerInfo, LearnerTranscript, ProgramFitAnalysis } from "@/types";
import { getLearnerInfoFromCSV, getTranscriptLinksFromCSV } from "./csv-parser";
import { getS3Content } from "./s3-client";
import { analyzeWithOpenAI, summarizeTranscriptAsync } from "./openai-client";
import { cleanTranscript } from "./transcript-cleaner";

// Fetch learner info from CSV
export async function fetchLearnerInfo(email: string): Promise<LearnerInfo> {
  try {
    // console.log("Fetching learner info for email:", email);
    const learnerInfo = await getLearnerInfoFromCSV(email);
    // console.log("Learner Info:", learnerInfo);
    
    if (!learnerInfo) {
      return {
        email,
        program: null,
        yearsOfExperience: null,
        currentCompany: null,
        currentCTC: null,
        currentDesignation: null,
      };
    }
    
    return learnerInfo;
  } catch (error) {
    console.error(`Error fetching learner info for ${email}:`, error);
    throw error;
  }
}

// Fetch transcripts from S3
export async function fetchLearnerTranscripts(email: string): Promise<LearnerTranscript> {
  try {
    // Get transcript links from CSV
    const transcriptLinkData = await getTranscriptLinksFromCSV(email);
    
    if (!transcriptLinkData || transcriptLinkData.length === 0) {
      return {
        email,
        transcripts: [],
      };
    }
    
    // Fetch transcript content from S3 in parallel
    const transcriptsPromises = transcriptLinkData.map(linkData => getS3Content(linkData));
    const transcriptResults = await Promise.all(transcriptsPromises);
    
    // Process each transcript - clean first, then summarize with OpenAI
    const processedTranscripts = await Promise.all(transcriptResults.map(async (result) => {
      // Step 1: Clean the transcript text
      const cleanedContent = cleanTranscript(result.content);
      
      // Step 2: Generate AI summary for longer transcripts
      const summary = await summarizeTranscriptAsync(cleanedContent);
      
      return {
        callDate: result.callDate,
        callId: result.callId,
        content: cleanedContent,     // Store cleaned content for display
        summary: summary,            // Store AI-generated summary
        rawContent: result.content   // Keep raw content for reference
      };
    }));
    
    return {
      email,
      transcripts: processedTranscripts,
    };
  } catch (error) {
    console.error(`Error fetching transcripts for ${email}:`, error);
    throw error;
  }
}

// Analyze program fit using OpenAI
export async function analyzeProgramFit(
  email: string,
  info: LearnerInfo,
  transcriptData: LearnerTranscript
): Promise<ProgramFitAnalysis> {
  try {
    // If not enrolled in any program, return early
    if (!info.program) {
      return {
        email,
        isFit: false,
        fitForOtherProgram: false,
        recommendedProgram: null,
        explanation: "Learner is not enrolled in any program.",
      };
    }
    
    // If no transcripts, return early with appropriate message
    if (!transcriptData.transcripts || transcriptData.transcripts.length === 0) {
      return {
        email,
        isFit: false,
        fitForOtherProgram: false,
        recommendedProgram: null,
        explanation: "No call transcripts available for analysis.",
      };
    }
    
    // Improved transcript processing - ensure we have quality data
    const transcriptContents = transcriptData.transcripts.map(t => {
      // Prioritize summary if available, but check if it's not empty or too short
      if (t.summary && t.summary.length > 50) {
        return t.summary;
      }
      
      // Fall back to cleaned content if summary is inadequate
      if (t.content && t.content.length > 0) {
        return t.content;
      }
      
      // Last resort - note the missing content
      return "Transcript content unavailable";
    }).filter(content => content !== "Transcript content unavailable");
    
    // If we have no usable transcripts after filtering, return early
    if (transcriptContents.length === 0) {
      return {
        email,
        isFit: false,
        fitForOtherProgram: false,
        recommendedProgram: null,
        explanation: "No usable transcript content available for analysis.",
      };
    }
    
    console.log(`Analyzing program fit for ${email} with ${transcriptContents.length} transcripts`);
    
    // Analyze with OpenAI
    const analysis = await analyzeWithOpenAI(info, transcriptContents);
    
    return {
      email,
      isFit: analysis.isFit,
      fitForOtherProgram: analysis.fitForOtherProgram,
      recommendedProgram: analysis.recommendedProgram,
      explanation: analysis.explanation,
      transcriptSummary: analysis.transcriptSummary
    };
  } catch (error) {
    console.error(`Error analyzing program fit for ${email}:`, error);
    throw error;
  }
}