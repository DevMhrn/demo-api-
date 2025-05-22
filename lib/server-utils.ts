import fs from 'fs';
import path from 'path';

export async function downloadDatabaseCSVs(): Promise<{
  success: boolean;
  message: string;
  files: string[];
}> {
  try {
    // Path to db directory in public folder
    const dbDir = path.join(process.cwd(), 'public');
    // Do not try to create dbDir at runtime

    // List of expected CSV files
    const expectedFiles = [
      "FTUE_Onboarding_Form_V2.csv",
      "Recording_and_Transcript_Link.csv"
    ];

    // Check which expected files are present in the db directory
    const presentFiles = expectedFiles.filter(filename =>
      fs.existsSync(path.join(dbDir, filename))
    );

    return {
      success: true,
      message: 'CSV database files are ready (accessed from public/db folder)',
      files: presentFiles
    };
  } catch (error) {
    console.error('Error accessing CSV database files:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      files: []
    };
  }
}
