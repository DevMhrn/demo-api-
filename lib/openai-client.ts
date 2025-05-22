import OpenAI from 'openai';
import { LearnerInfo } from '@/types';
import { summarizeTranscript } from './transcript-cleaner';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProgramFitResult {
  isFit: boolean;
  fitForOtherProgram: boolean;
  recommendedProgram: string | null;
  explanation: string;
  transcriptSummary?: string;
}

/**
 * Uses OpenAI to generate a summary of the transcript
 */
export async function summarizeWithOpenAI(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Using a smaller model for efficiency
      messages: [
        {
          role: 'system',
          content: 'You are an assistant that summarizes call transcripts. Create a brief, concise summary that captures the key points of the conversation.'
        },
        {
          role: 'user',
          content: `Summarize this call transcript in 2-3 sentences:\n\n${text}`
        }
      ],
      max_tokens: 150,  // Limit the response length
      temperature: 0.3  // Lower temperature for more focused output
    });

    return response.choices[0]?.message?.content || 'No summary generated';
  } catch (error) {
    console.error('Error summarizing with OpenAI:', error);
    // Return fallback truncated version on error
    return summarizeTranscript(text);
  }
}

/**
 * Async version that uses OpenAI for transcript summarization
 * Use this when you need a high-quality summary
 */
export async function summarizeTranscriptAsync(cleanedTranscript: string): Promise<string> {
  // For short transcripts, no need to summarize with OpenAI
  const maxLength = 500;
  if (!cleanedTranscript || cleanedTranscript.length <= maxLength) {
    return cleanedTranscript || '';
  }
  
  // For longer transcripts, use OpenAI to generate a summary
  return await summarizeWithOpenAI(cleanedTranscript);
}

/**
 * Analyzes learner fit for a program using OpenAI
 */
export async function analyzeWithOpenAI(
  learnerInfo: LearnerInfo, 
  transcripts: string[]
): Promise<ProgramFitResult> {
  try {
    // Process transcripts for the analysis - summarize long ones first
    const processedTranscripts = await Promise.all(
      transcripts.map(async (transcript, index) => {
        if (!transcript) return `### Transcript ${index + 1}\n[Empty transcript]`;
        
        // Use AI summarization for longer transcripts
        let processedText = transcript;
        if (transcript.length > 1000) {
          processedText = await summarizeTranscriptAsync(transcript);
        }
        return `### Transcript ${index + 1}\n${processedText}`;
      })
    );

    const transcriptSummaries = processedTranscripts.join('\n\n');

    // Define program evaluation criteria
    const evaluationCriteria = `
### Program Fit Evaluation Criteria:
1. Technical Background: Does the learner have the required technical knowledge for the program?
2. Experience Level: Is the learner's work experience appropriate for the program?
3. Career Goals: Do the learner's goals align with the program outcomes?
4. Learning Style: Is the program's teaching approach compatible with the learner?
5. Time Commitment: Can the learner commit the required time for the program?
6. Previous Performance: How has the learner performed in similar contexts?

Please evaluate each criterion separately before making your final determination.
`;

    // Create improved prompt with both learner info and transcripts
    const prompt = `
Analyze if this learner is a good fit for their current program based on the following information:

## Learner Information
- Full Name: ${learnerInfo.fullName || 'Not provided'}
- Email: ${learnerInfo.email}
- Current Program: ${learnerInfo.program || 'Not enrolled'}
- Academic Specialization: ${learnerInfo.academicSpecialisation || 'Not provided'}
- Current Job Role: ${learnerInfo.currentDesignation || 'Not provided'}
- Years of Experience: ${learnerInfo.yearsOfExperience !== null ? learnerInfo.yearsOfExperience : 'Not provided'}
- Programming Proficiency: ${learnerInfo.programmingProficiency || 'Not provided'}
- DSA/DevOps Proficiency: ${learnerInfo.dsaProficiency || 'Not provided'}
- SQL Proficiency: ${learnerInfo.sqlProficiency || 'Not provided'}

${evaluationCriteria}

## Call Transcripts
${transcriptSummaries}

Based on the above information, please follow this structured analysis:

1. Transcript Analysis: Summarize the key points from the transcripts that relate to program fit.
2. Technical Assessment: Evaluate the learner's technical skills relative to program requirements.
3. Experience Assessment: Analyze if the learner's experience level is appropriate for the program.
4. Career Alignment: Determine if the program aligns with the learner's career goals.
5. Concerns: Identify any concerns or potential misalignments.
6. Recommended Program: If not a good fit, suggest a more suitable program based on their profile.
7. Final Determination: Make a clear yes/no decision on program fit with clear reasoning.

Format your response as a JSON object with the following structure:
{
  "isFit": boolean,
  "fitForOtherProgram": boolean,
  "recommendedProgram": string or null,
  "explanation": string with detailed reasoning,
  "transcriptSummary": string with key points from transcripts
}  
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system', 
          content: 'You are an educational program advisor that makes objective, data-driven assessments about learner fit for programs based on their background and transcripts. You must be consistent in your evaluations using the same criteria across all assessments.'
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent outputs
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No response content from OpenAI');
    }
    
    // Parse and validate the JSON response
    let parsedResult: ProgramFitResult;
    try {
      parsedResult = JSON.parse(content) as ProgramFitResult;
      
      // Validate required fields
      if (typeof parsedResult.isFit !== 'boolean' || 
          typeof parsedResult.fitForOtherProgram !== 'boolean' ||
          typeof parsedResult.explanation !== 'string') {
        throw new Error('Invalid response format: missing or incorrect fields');
      }
      
      return parsedResult;
    } catch (error) {
      console.error('Error parsing OpenAI response:', error, content);
      // Return a fallback response
      return {
        isFit: false,
        fitForOtherProgram: false,
        recommendedProgram: null,
        explanation: "Error analyzing program fit. Unable to process the response.",
        transcriptSummary: "Failed to analyze transcripts."
      };
    }
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    throw new Error('Failed to analyze learner fit with OpenAI');
  }
}
