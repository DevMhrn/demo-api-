import OpenAI from 'openai';
import { LearnerInfo, SimilarLearnerData, SalesInsightAnalysis } from '@/types';
import { summarizeTranscript, cleanTranscript } from './transcript-cleaner';

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

/**
 * Estimates token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncates transcript to fit within token limits while preserving key information
 */
function truncateTranscript(transcript: string, maxLength: number = 2000): string {
  if (transcript.length <= maxLength) return transcript;
  
  // Take first 40% and last 40% of transcript, skip middle
  const firstPart = transcript.substring(0, Math.floor(maxLength * 0.4));
  const lastPart = transcript.substring(transcript.length - Math.floor(maxLength * 0.4));
  
  return `${firstPart}\n\n[... middle section truncated for length ...]\n\n${lastPart}`;
}

/**
 * Processes learner data to fit within token constraints
 */
async function preprocessLearnerData(
  similarLearnersData: SimilarLearnerData[], 
  maxTokensPerLearner: number = 1500
): Promise<string> {
  const processedLearners = await Promise.all(
    similarLearnersData.map(async (learner, index) => {
      let processedTranscript = learner.cleanedTranscription || '';
      
      // Clean and truncate if needed
      if (processedTranscript.length > maxTokensPerLearner * 4) {
        // For very long transcripts, use AI summarization first
        if (processedTranscript.length > 4000) {
          try {
            processedTranscript = await summarizeWithOpenAI(processedTranscript);
          } catch (error) {
            console.warn(`Failed to summarize transcript for ${learner.email}, using truncation`);
            processedTranscript = truncateTranscript(processedTranscript, maxTokensPerLearner * 4);
          }
        } else {
          processedTranscript = truncateTranscript(processedTranscript, maxTokensPerLearner * 4);
        }
      }

      return `
CONVERSATION ${index + 1} - EMAIL: ${learner.email}
Profile: ${learner.info.academicSpecialisation || 'Unknown'} | ${learner.info.currentDesignation || 'Unknown'} | ${learner.info.yearsOfExperience || 'Unknown'} years exp

TRANSCRIPT:
${processedTranscript}
---`;
    })
  );

  return processedLearners.join('\n\n');
}

/**
 * Analyzes ALL learner transcripts collectively to provide comprehensive sales insights
 */
export async function generateSalesInsights(
  targetLearner: LearnerInfo,
  similarLearnersData: SimilarLearnerData[]
): Promise<SalesInsightAnalysis> {
  try {

    // ENHANCED: Clean all transcripts before analysis
    const cleanedSimilarLearnersData = similarLearnersData.map(learner => ({
      ...learner,
      cleanedTranscription: cleanTranscript(learner.cleanedTranscription || '')
    }));

    // Check if we need to chunk the data
    const maxContextTokens = 120000; // Leave buffer for response
    const maxInputTokens = 100000; // Conservative limit for input
    
    // Estimate total tokens needed
    let totalEstimatedTokens = 0;
    for (const learner of cleanedSimilarLearnersData) {
      totalEstimatedTokens += estimateTokenCount(learner.cleanedTranscription);
    }

    let comprehensiveAnalysis: string;
    
    if (totalEstimatedTokens > maxInputTokens) {
      console.log(`Large dataset detected (${totalEstimatedTokens} estimated tokens). Using preprocessing...`);
      
      // For large datasets, process in chunks or use summarization
      if (cleanedSimilarLearnersData.length > 20) {
        // If too many learners, take a representative sample
        const sampleSize = 15;
        const sampledLearners = cleanedSimilarLearnersData
          .sort(() => 0.5 - Math.random())
          .slice(0, sampleSize);
        
        comprehensiveAnalysis = await preprocessLearnerData(sampledLearners, 1000);
        console.log(`Using sample of ${sampleSize} learners from ${cleanedSimilarLearnersData.length} total`);
      } else {
        // Process all learners but with heavy summarization
        comprehensiveAnalysis = await preprocessLearnerData(cleanedSimilarLearnersData, 800);
      }
    } else {
      // Small dataset, process normally but with light preprocessing
      comprehensiveAnalysis = await preprocessLearnerData(cleanedSimilarLearnersData, 2000);
    }

    // Verify final token count
    const finalTokenCount = estimateTokenCount(comprehensiveAnalysis);
    console.log(`Final analysis token count: ${finalTokenCount}`);
    
    if (finalTokenCount > maxInputTokens) {
      throw new Error(`Content still too large after preprocessing: ${finalTokenCount} tokens`);
    }

    const prompt = `
You are analyzing ${cleanedSimilarLearnersData.length} sales conversations from prospects with similar profiles to help create a winning sales strategy.

CONVERSATION DATA:
${comprehensiveAnalysis}

Provide practical sales insights in this exact format:

## EXECUTIVE SUMMARY
Write 2-3 paragraphs explaining the key insights discovered from analyzing all these conversations. Focus on what makes these prospects tick and how to approach them effectively.

## PROSPECT PSYCHOLOGY 
Write 2-3 short paragraphs explaining the common mindset, fears, and motivations you found across these conversations. Include specific behavioral patterns.

## WINNING SALES STRATEGIES
Provide 5-7 specific strategies that work with this type of prospect. For each strategy, write:
**Strategy Name:** [Clear strategy name]
**How to Execute:** [2-3 sentences explaining exactly how to do this]
**Why It Works:** [1-2 sentences explaining the psychology behind it]
**Conversation Example:** [A specific quote from the transcripts that shows this strategy in action]

## COMMON OBJECTIONS & RESPONSES
List 4-6 common objections found in the conversations. For each objection:
**What They Say:** [Exact quote from transcript showing how prospects phrase this objection]
**How to Respond:** [Specific recommended response that addresses their concern]
**Follow-up Strategy:** [What to say next to keep the conversation moving forward]

## CONVERSATION EXAMPLES
Provide 3-4 specific examples from the transcripts showing:
**What the Prospect Said:** [Direct quote from conversation]
**Recommended Response:** [Exactly what a salesperson should say in response]
**Why This Works:** [Brief explanation of the psychology]

## LEARNER SPECIFIC EXAMPLES
For each learner email, provide specific examples in this exact format:
**Learner Email:** [exact email from the conversation data]
**What They Said:** [Direct quote from their specific transcript]
**Recommended Response:** [Exactly what you should say to this specific learner]
**Context:** [Brief explanation of why this response works for this learner]

## COMPETITIVE INSIGHTS
Write 2-3 paragraphs about:
- What alternatives prospects mentioned and why
- What made them choose us vs competitors
- How to position against competition based on actual conversations

## RED FLAGS TO WATCH FOR
List 3-5 warning signs found in conversations that indicate a prospect won't convert, with specific examples from transcripts.

## TIMING & FOLLOW-UP STRATEGIES
Write 2-3 paragraphs about optimal timing for different conversation elements and follow-up strategies based on the conversation patterns you observed.

IMPORTANT: 
- Use actual quotes from the transcripts throughout
- Keep explanations practical and actionable
- Focus on psychology and human behavior
- Provide word-for-word response recommendations
- Base everything on patterns found across multiple conversations
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a master sales strategist analyzing real prospect conversations. Provide practical, actionable insights with specific examples from transcripts. Focus on psychology, proven strategies, and exact conversation techniques that work. Pay special attention to mapping specific learner emails to their exact quotes and personalized responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    console.log('OpenAI sales insights response:', content);
    
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse the structured response into sections
    const sections = {
      executiveSummary: extractSection(content, 'EXECUTIVE SUMMARY'),
      prospectPsychology: extractSection(content, 'PROSPECT PSYCHOLOGY'),
      winningStrategies: extractSection(content, 'WINNING SALES STRATEGIES'),
      objections: extractSection(content, 'COMMON OBJECTIONS & RESPONSES'),
      conversationExamples: extractSection(content, 'CONVERSATION EXAMPLES'),
      learnerSpecificExamples: extractSection(content, 'LEARNER SPECIFIC EXAMPLES'),
      competitiveInsights: extractSection(content, 'COMPETITIVE INSIGHTS'),
      redFlags: extractSection(content, 'RED FLAGS TO WATCH FOR'),
      timingStrategies: extractSection(content, 'TIMING & FOLLOW-UP STRATEGIES')
    };

    // Extract key patterns and recommendations from the structured response
    const keyPatterns = extractListItems(sections.prospectPsychology || '');
    const salesRecommendations = extractListItems(sections.winningStrategies || '');
    const exampleResponses = extractLearnerSpecificExamples(sections.learnerSpecificExamples || '');

    return {
      targetEmail: `Dataset Analysis (${similarLearnersData.length} conversations)`,
      similarLearnersCount: similarLearnersData.length,
      insights: content, // Full structured response
      keyPatterns,
      salesRecommendations,
      exampleResponses,
      // Structured sections for better UI rendering
      executiveSummary: sections.executiveSummary,
      prospectPsychology: sections.prospectPsychology,
      winningStrategies: sections.winningStrategies,
      objections: sections.objections,
      conversationExamples: sections.conversationExamples,
      learnerSpecificExamples: sections.learnerSpecificExamples,
      competitiveInsights: sections.competitiveInsights,
      redFlags: sections.redFlags,
      timingStrategies: sections.timingStrategies
    };

  } catch (error) {
    console.error('Error generating sales insights with OpenAI:', error);
    
    // Enhanced error handling
    if (error instanceof Error && error.message.includes('context_length_exceeded')) {
      throw new Error(`Dataset too large for analysis. Please try with fewer learners or contact support. (${similarLearnersData.length} learners processed)`);
    }
    
    throw new Error('Failed to generate sales insights with OpenAI');
  }
}

// Helper function to extract sections from the response
function extractSection(content: string, sectionTitle: string): string {
  const regex = new RegExp(`## ${sectionTitle}\\s*([\\s\\S]*?)(?=## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

// Helper function to extract list items from text
function extractListItems(text: string): string[] {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.slice(0, 5); // Return first 5 key points
}

// Helper function to extract learner-specific examples
function extractLearnerSpecificExamples(text: string): Array<{email: string, response: string, context: string}> {
  const examples: Array<{email: string, response: string, context: string}> = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentExample: Partial<{email: string, quote: string, response: string, context: string}> = {};
  
  for (const line of lines) {
    if (line.includes('Learner Email:')) {
      // If we have a complete example, save it
      if (currentExample.email && currentExample.quote && currentExample.response) {
        examples.push({
          email: currentExample.email,
          response: currentExample.response,
          context: `Quote: "${currentExample.quote}" | Context: ${currentExample.context || 'No context provided'}`
        });
      }
      // Start new example
      currentExample = { 
        email: line.replace(/.*Learner Email:\s*/, '').trim() 
      };
    } else if (line.includes('What They Said:')) {
      currentExample.quote = line.replace(/.*What They Said:\s*/, '').replace(/"/g, '').trim();
    } else if (line.includes('Recommended Response:')) {
      currentExample.response = line.replace(/.*Recommended Response:\s*/, '').replace(/"/g, '').trim();
    } else if (line.includes('Context:')) {
      currentExample.context = line.replace(/.*Context:\s*/, '').trim();
    }
  }
  
  // Add the last example if complete
  if (currentExample.email && currentExample.quote && currentExample.response) {
    examples.push({
      email: currentExample.email,
      response: currentExample.response,
      context: `Quote: "${currentExample.quote}" | Context: ${currentExample.context || 'No context provided'}`
    });
  }
  
  return examples;
}
