import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Extract bucket name and key from S3 URL
function parseS3Url(url: string): { bucket: string; key: string } {
  // First check if url is actually a string
  if (typeof url !== 'string') {
    throw new Error(`Invalid URL: Expected string but got ${typeof url}`);
  }
  
  // Handle various S3 URL formats
  let bucket, key;
  
  if (url.startsWith('s3://')) {
    // s3://bucket-name/key
    const parts = url.replace('s3://', '').split('/', 2);
    bucket = parts[0];
    key = url.replace(`s3://${bucket}/`, '');
  } else if (url.includes('.s3.amazonaws.com')) {
    // https://bucket-name.s3.amazonaws.com/key
    const matches = url.match(/https:\/\/([^.]+).s3.amazonaws.com\/(.*)/);
    if (matches) {
      bucket = matches[1];
      key = matches[2];
    }
  } else {
    // https://s3.amazonaws.com/bucket-name/key
    const matches = url.match(/https:\/\/s3.amazonaws.com\/([^\/]+)\/(.*)/);
    if (matches) {
      bucket = matches[1];
      key = matches[2];
    }
  }
  
  if (!bucket || !key) {
    throw new Error(`Invalid S3 URL format: ${url}`);
  }
  
  return { bucket, key };
}

// Updated to accept our transcript link object structure
export async function getS3Content(s3UrlData: { link: string; callId: string; callDate: string }): Promise<{
  callId: string;
  callDate: string;
  content: string;
}> {
  try {
    const { link, callId, callDate } = s3UrlData;
    
    // Now we're using link property which should be a string
    const { bucket, key } = parseS3Url(link);
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    const streamToString = (stream: any): Promise<string> =>
      new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
    
    const bodyContents = await streamToString(response.Body);
    
    return {
      callId,
      callDate,
      content: bodyContents
    };
  } catch (error: unknown) {
    console.error('Error fetching from S3:', error);
    // Return error in content rather than throwing to avoid breaking the flow
    return {
      callId: s3UrlData.callId,
      callDate: s3UrlData.callDate,
      content: `Error fetching transcript: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}