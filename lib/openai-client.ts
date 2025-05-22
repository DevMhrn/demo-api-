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
1. Learning Need: Does the learner lack knowledge in this field and would genuinely benefit from the program? Higher need = better fit.
2. Knowledge Gaps: Does the learner have significant gaps in technical knowledge that this program addresses? More gaps = better fit.
3. Career Transition Potential: Is the learner trying to enter or transition within this field? Stronger transition goals = better fit.
4. Growth Opportunity: Will the program significantly accelerate the learner's career growth? Higher potential impact = better fit.
5. Time Commitment Ability: Can the learner commit the required time for the program?
6. Motivation: Does the learner show genuine interest and motivation to learn the program content?

IMPORTANT: A learner is considered a GOOD FIT if they NEED the program the most, not if they are already qualified.
`;

    // Create improved prompt with both learner info and transcripts
    const prompt = `
Analyze if this learner NEEDS this program and would benefit significantly from it based on the following information:

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

1. Transcript Analysis: Identify key points showing the learner's knowledge gaps and learning needs.
2. Skills Assessment: Evaluate the learner's current skills and identify what they're missing that the program provides.
3. Career Transition Analysis: Assess if the learner is trying to enter a new field or significantly advance in their current one.
4. Learning Impact: Determine how much the program would impact the learner's career trajectory.
5. Potential Challenges: Identify any potential barriers to the learner's success in the program.
6. Recommended Program: If a different program would better address their specific needs, suggest it.
7. Final Determination: Make a clear yes/no decision on program fit based on how much they NEED the program, not how qualified they already are.

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
          content: 'You are an educational program advisor that assesses how much a learner NEEDS and would BENEFIT from a program. A perfect candidate is someone who has GAPS in their knowledge that the program can fill, NOT someone who is already skilled in the area. Someone with little to no experience in the field who is motivated to learn is an IDEAL FIT. Someone who already has significant experience or skills in the program\'s focus area is NOT a good fit as they don\'t need the program. Be consistent in prioritizing candidates who would be transformed the most by the program.'
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
