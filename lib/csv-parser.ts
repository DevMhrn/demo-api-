import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import Papa from 'papaparse';
import { LearnerInfo } from '@/types';

// Paths to CSV files - both using the same public/db directory
const LEARNER_CSV_PATH = path.join(process.cwd(), 'public', 'FTUE_Onboarding_Form_V2.csv');
const TRANSCRIPT_CSV_PATH = path.join(process.cwd(), 'public', 'Recording_and_Transcript_Link.csv');

// Get learner info from CSV based on email (streaming version)
export async function getLearnerInfoFromCSV(email: string): Promise<LearnerInfo | null> {
  return new Promise((resolve, reject) => {
    let found = false;
    let result: LearnerInfo | null = null;
    const emailLower = email.toLowerCase();
    console.log('Searching for email:', emailLower);
    console.log('CSV Path:', LEARNER_CSV_PATH);
    console.log("Transcript CSV Path:", TRANSCRIPT_CSV_PATH);
    const csvStream = createReadStream(LEARNER_CSV_PATH, { encoding: 'utf8' });

    Papa.parse(csvStream, {
      header: true,
      step: function(row) {
        const learnerData = row.data;
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
          found = true;
          // Stop parsing by returning false instead of using this.abort()
          return false;
        }
      },
      complete: function() {
        resolve(result);
      },
      error: function(error) {
        console.error('Error streaming learner CSV:', error);
        reject(new Error('Failed to process learner data'));
      }
    });
  });
}

// Get transcript links from CSV based on email
export async function getTranscriptLinksFromCSV(email: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const emailLower = email.toLowerCase();
    
    // Create read stream instead of loading entire file
    const csvStream = createReadStream(TRANSCRIPT_CSV_PATH, { encoding: 'utf8' });
    
    Papa.parse(csvStream, {
      header: true,
      step: function(row) {
        // Process one row at a time
        if (
          row.data.learner_email?.toLowerCase() === emailLower && 
          row.data.transcript_s3_link && 
          row.data.transcript_s3_link.trim() !== ''
        ) {
          results.push({
            link: row.data.transcript_s3_link,
            callId: row.data.call_log_id || 'unknown',
            callDate: row.data.call_done_at || new Date().toISOString()
          });
        }
      },
      complete: function() {
        resolve(results);
      },
      error: function(error) {
        console.error('Error streaming transcript CSV:', error);
        reject(new Error('Failed to process transcript data'));
      }
    });
  });
}

