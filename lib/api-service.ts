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

// Find similar learners based on Academic Specialization and Job Role
export async function findSimilarLearners(
  targetInfo: LearnerInfo, 
  maxCount: number = 10
): Promise<LearnerInfo[]> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const Papa = await import('papaparse');
    
    const LEARNER_CSV_PATH = path.join(process.cwd(), 'public', 'FTUE_Onboarding_Form_V2.csv');
    
    return new Promise((resolve, reject) => {
      const similarLearners: LearnerInfo[] = [];
      const targetAcademic = targetInfo.academicSpecialisation?.toLowerCase().trim() || '';
      const targetJobRole = targetInfo.currentDesignation?.toLowerCase().trim() || '';
      
      console.log(`Finding similar learners for: Academic="${targetAcademic}", JobRole="${targetJobRole}"`);
      
      if (!targetAcademic && !targetJobRole) {
        console.log('No Academic Specialization or Job Role provided for matching');
        resolve([]);
        return;
      }
      
      const csvStream = fs.createReadStream(LEARNER_CSV_PATH, { encoding: 'utf8' });
      
      Papa.parse(csvStream, {
        header: true,
        step: function(row) {
          const learnerData = row.data as any;
          const email = learnerData.email || learnerData.learner_email;
          
          if (!email || email.toLowerCase() === targetInfo.email.toLowerCase()) {
            return; // Skip target email or empty emails
          }
          
          const academic = (learnerData['Academic Specialisation'] || '').toLowerCase().trim();
          const jobRole = (learnerData['Current Job Role'] || '').toLowerCase().trim();
          
          // Exact match or contains match for both fields
          let academicMatch = false;
          let jobRoleMatch = false;
          
          if (targetAcademic && academic) {
            academicMatch = academic === targetAcademic || 
                           academic.includes(targetAcademic) || 
                           targetAcademic.includes(academic);
          }
          
          if (targetJobRole && jobRole) {
            jobRoleMatch = jobRole === targetJobRole || 
                          jobRole.includes(targetJobRole) || 
                          targetJobRole.includes(jobRole);
          }
          
          // Both should match for better similarity
          if ((academicMatch && jobRoleMatch) || 
              (academicMatch && !targetJobRole) || 
              (jobRoleMatch && !targetAcademic)) {
            
            if (similarLearners.length < maxCount) {
              const currentCTC = learnerData['Current CTC'] || 
                               learnerData.Current_CTC || 
                               learnerData.CurrentCTC || 
                               learnerData.current_ctc || null;
              
              const learnerInfo: LearnerInfo = {
                email: email,
                program: learnerData.batch_name || null,
                yearsOfExperience: learnerData['Total Experience in months']
                  ? Math.floor(parseInt(learnerData['Total Experience in months']) / 12)
                  : null,
                currentCompany: learnerData.Current_Company || null,
                currentCTC: currentCTC,
                currentDesignation: learnerData['Current Job Role'] || null,
                fullName: learnerData['Full Name'] || null,
                academicSpecialisation: learnerData['Academic Specialisation'] || null,
                programmingProficiency: learnerData['Programming/Shell Scripting Proficiency'] || null,
                dsaProficiency: learnerData['DSA/Devops Proficiency'] || null,
                sqlProficiency: learnerData['SQL Proficiency'] || null,
              };
              
              similarLearners.push(learnerInfo);
              console.log(`Found similar learner: ${email} (Academic: ${academic}, Job: ${jobRole})`);
            }
          }
        },
        complete: function() {
          console.log(`Found ${similarLearners.length} similar learners`);
          resolve(similarLearners);
        },
        error: function(error) {
          console.error('Error finding similar learners:', error);
          reject(new Error('Failed to find similar learners'));
        }
      });
    });
  } catch (error) {
    console.error('Error in findSimilarLearners:', error);
    throw error;
  }
}

// Fetch transcripts for multiple learners and return map
export async function fetchMultipleLearnerTranscripts(
  learners: LearnerInfo[]
): Promise<Map<string, string>> {
  try {
    const transcriptMap = new Map<string, string>();
    
    // Process all learners in parallel
    const transcriptPromises = learners.map(async (learner) => {
      try {
        const transcriptData = await fetchLearnerTranscripts(learner.email);
        
        // Combine all transcripts for this learner
        const combinedTranscript = transcriptData.transcripts
          .map(t => t.content)
          .filter(content => content && content.length > 0)
          .join('\n\n--- Next Call ---\n\n');
        
        if (combinedTranscript) {
          transcriptMap.set(learner.email, combinedTranscript);
        }
        
        return { email: learner.email, success: true };
      } catch (error) {
        console.error(`Failed to fetch transcripts for ${learner.email}:`, error);
        return { email: learner.email, success: false };
      }
    });
    
    await Promise.all(transcriptPromises);
    return transcriptMap;
  } catch (error) {
    console.error('Error fetching multiple transcripts:', error);
    throw error;
  }
}