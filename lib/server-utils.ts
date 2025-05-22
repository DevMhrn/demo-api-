import fs from 'fs';
import path from 'path';

export async function downloadDatabaseCSVs(): Promise<{
  success: boolean;
  message: string;
  files: string[];
}> {
  try {
    // Path to public directory where CSV files are stored
    const publicDir = path.join(process.cwd(), 'public');

    // List of expected CSV files
    const expectedFiles = [
      "FTUE_Onboarding_Form_V2.csv",
      "Recording_and_Transcript_Link.csv"
    ];

    // Check which expected files are present in the public directory
    const presentFiles = expectedFiles.filter(filename =>
      fs.existsSync(path.join(publicDir, filename))
    );

    return {
      success: true,
      message: 'CSV database files are ready (accessed from public folder)',
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
