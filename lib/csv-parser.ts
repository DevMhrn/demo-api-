import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import Papa from 'papaparse';
import { LearnerInfo } from '@/types';

// In serverless environments, we need to use a different approach
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Helper function to read CSV files that works in both environments
async function readCSV(filename: string): Promise<string> {
  if (isServerless) {
    // For serverless: fetch the file using node-fetch
    const fetch = (await import('node-fetch')).default;
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      process.env.BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
    }
    return await response.text();
  } else {
    // For local development: read from filesystem
    const filePath = path.join(process.cwd(), 'public', filename);
    return fs.readFileSync(filePath, 'utf8');
  }
}

// Get learner info from CSV based on email
export async function getLearnerInfoFromCSV(email: string): Promise<LearnerInfo | null> {
  try {
    const emailLower = email.toLowerCase();
    console.log('Searching for email:', emailLower);
    
    const csvContent = await readCSV('FTUE_Onboarding_Form_V2.csv');
    let result: LearnerInfo | null = null;
    
    // Parse the CSV content
    Papa.parse(csvContent, {
      header: true,
      complete: function(results) {
        for (const row of results.data) {
          const learnerData = row;
          if (
            learnerData.email?.toLowerCase() === emailLower ||
            learnerData.learner_email?.toLowerCase() === emailLower
          ) {
            // Handle different column name variations for Current CTC
            const currentCTC =
              learnerData['Current CTC'] ||
              learnerData.Current_CTC ||
              learnerData.CurrentCTC ||
              learnerData.current_ctc ||
              null;

            result = {
              email,
              program: learnerData.batch_name || null,
              yearsOfExperience: learnerData['Total Experience in months']
                ? Math.floor(parseInt(learnerData['Total Experience in months']) / 12)
                : null,
              currentCompany: learnerData.Current_Company || learnerData['Current Job Role'] || null,
              currentCTC: currentCTC,
              currentDesignation: learnerData['Current Job Role'] || null,
              fullName: learnerData['Full Name'] || null,
              academicSpecialisation: learnerData['Academic Specialisation'] || null,
              programmingProficiency: learnerData['Programming/Shell Scripting Proficiency'] || null,
              dsaProficiency: learnerData['DSA/Devops Proficiency'] || null,
              sqlProficiency: learnerData['SQL Proficiency'] || null,
            };
            break;
          }
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error processing learner CSV:', error);
    throw new Error('Failed to process learner data');
  }
}

// Get transcript links from CSV based on email
export async function getTranscriptLinksFromCSV(email: string): Promise<any[]> {
  try {
    const emailLower = email.toLowerCase();
    const csvContent = await readCSV('Recording_and_Transcript_Link.csv');
    const results: any[] = [];
    
    // Parse the CSV content
    Papa.parse(csvContent, {
      header: true,
      complete: function(parseResults) {
        for (const row of parseResults.data) {
          if (
            row.learner_email?.toLowerCase() === emailLower && 
            row.transcript_s3_link && 
            row.transcript_s3_link.trim() !== ''
          ) {
            results.push({
              link: row.transcript_s3_link,
              callId: row.call_log_id || 'unknown',
              callDate: row.call_done_at || new Date().toISOString()
            });
          }
        }
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error processing transcript CSV:', error);
    throw new Error('Failed to process transcript data');
  }
}

