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