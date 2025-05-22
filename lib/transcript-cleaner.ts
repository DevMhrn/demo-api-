/**
 * Cleans transcript content by removing timestamps and line numbers
 * Converts from format like:
 * "1 00:00:00,000 --> 00:00:00,160 Hello? 2 00:00:01,199 --> 00:00:02,399 I have just a quick question."
 * to:
 * "Hello? I have just a quick question."
 */
export function cleanTranscript(rawTranscript: string): string {
  if (!rawTranscript) return '';
  
  // Handle the format: --> 00:00:02,100Hello with missing spaces
  let cleaned = rawTranscript.replace(/--> \d{2}:\d{2}:\d{2},\d{3}(\w)/g, (match, word) => ` ${word}`);
  
  // Replace timestamp patterns (e.g., "1 00:00:00,000 --> 00:00:00,160 ")
  cleaned = cleaned.replace(/\d+ \d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3} /g, ' ');
  
  // Handle the short timestamp format: --> 00:00:02,100
  cleaned = cleaned.replace(/--> \d{2}:\d{2}:\d{2},\d{3}/g, ' ');
  
  // Some transcripts might have timestamps without the arrow
  cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2},\d{3} /g, ' ');
  
  // Remove standalone line numbers
  cleaned = cleaned.replace(/^\d+ |\s\d+ /g, ' ');
  
  // Remove SRT format line numbers (standalone digits at line start)
  cleaned = cleaned.replace(/^\d+\s*$/gm, '');
  
  // Remove WebVTT headers
  cleaned = cleaned.replace(/WEBVTT\s*\n/g, '');
  
  // Fix common transcript errors - multiple adjacent punctuation
  cleaned = cleaned.replace(/([.!?])\s*\1+/g, '$1');
  
  // Fix spacing issues around punctuation
  cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');
  
  // Key new functionality: Fix words that have spaces between their characters
  // Handle patterns like "H e l l o" -> "Hello"
  
  // First pass - handle common 1-2 letter word fragments
  const commonFragments = {
    'yo u': 'you', 'th e': 'the', 'an d': 'and', 'i s': 'is', 'i t': 'it',
    'ca n': 'can', 'no w': 'now', 'ye s': 'yes', 'ye a': 'yea', 
    'fo r': 'for', 'wi th': 'with', 'th at': 'that', 'ri gh t': 'right',
    'ha ve': 'have', 'do n': 'don', 'y ou': 'you', 't he': 'the',
    'w as': 'was', 'o n': 'on', 'i n': 'in', 't o': 't o'
  };
  
  Object.entries(commonFragments).forEach(([fragment, word]) => {
    cleaned = cleaned.replace(new RegExp(`\\b${fragment}\\b`, 'g'), word);
  });
  
  // Second pass - general algorithm for joining fragmented words
  // Pattern: single letter + space + single letter (possibly repeated)
  // This converts patterns like "H e l l o" to "Hello" 
  // But avoids merging legitimate separate words
  
  // Function to determine if a character is likely part of the same word as the previous one
  const isSameWordChar = (prev: string, curr: string): boolean => {
    // Skip if either is not a letter
    if (!/[a-zA-Z]/.test(prev) || !/[a-zA-Z]/.test(curr)) return false;
    
    // Common consonant pairs that often appear together
    const commonPairs = ['th', 'ch', 'sh', 'wh', 'ph', 'gh', 'ck', 'ng', 'tr', 'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'st', 'sp', 'sk', 'sm', 'sn', 'sw', 'tw'];
    
    // If they form a common pair, it's likely one word
    if (commonPairs.includes(prev.toLowerCase() + curr.toLowerCase())) return true;
    
    // Vowel followed by consonant is likely same word
    const isVowel = (c: string) => /[aeiou]/i.test(c);
    if (isVowel(prev) && !isVowel(curr)) return true;
    if (!isVowel(prev) && isVowel(curr)) return true;
    
    return false;
  };
  
  // Split by spaces for processing
  let tokens = cleaned.split(' ');
  let result = [];
  let currentWord = '';
  
  // Process tokens to join fragmented words
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Skip empty tokens
    if (!token) continue;
    
    // If token is a single character and we have a current word building
    if (token.length === 1 && token.match(/[a-zA-Z]/)) {
      // If we don't have a current word or this character likely starts a new word
      if (!currentWord || !isSameWordChar(currentWord[currentWord.length - 1], token)) {
        // Add current word to results if we have one
        if (currentWord) {
          result.push(currentWord);
          currentWord = '';
        }
        currentWord = token;
      } else {
        // Add to current word
        currentWord += token;
      }
    } else {
      // Add current word to results if we have one
      if (currentWord) {
        result.push(currentWord);
        currentWord = '';
      }
      result.push(token);
    }
  }
  
  // Add any remaining word
  if (currentWord) {
    result.push(currentWord);
  }
  
  cleaned = result.join(' ');
  
  // Final phase - clean common patterns and formatting issues
  
  // Fix run-together words by adding spaces between camelCase words
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Fix common contractions
  const contractions = {
    'don t': 'don\'t', 'can t': 'can\'t', 'won t': 'won\'t',
    'isn t': 'isn\'t', 'didn t': 'didn\'t', 'wouldn t': 'wouldn\'t',
    'shouldn t': 'shouldn\'t', 'haven t': 'haven\'t', 'hadn t': 'hadn\'t',
    'i m': 'I\'m', 'i ll': 'I\'ll', 'i ve': 'I\'ve', 'i d': 'I\'d'
  };
  
  Object.entries(contractions).forEach(([fragment, word]) => {
    cleaned = cleaned.replace(new RegExp(`\\b${fragment}\\b`, 'gi'), word);
  });
  
  // Clean up extra spaces, newlines, etc.
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/\n+/g, ' ');
  
  return cleaned;
}

/**
 * Simple sync function to truncate long transcripts
 * No OpenAI calls - just basic truncation for display
 */
export function summarizeTranscript(cleanedTranscript: string): string {
  const maxLength = 500;
  if (!cleanedTranscript || cleanedTranscript.length <= maxLength) {
    return cleanedTranscript || '';
  }
  
  return cleanedTranscript.substring(0, maxLength) + '... [truncated]';
}

/**
 * Extracts speaker information from transcript if available
 * This handles formats where speakers are labeled like "Speaker 1:" or "[John]:"
 */
export function extractSpeakers(transcript: string): string[] {
  const speakerRegex = /(?:^|\s)(?:\[([^\]]+)\]|([A-Za-z\s]+)):(?=\s)/g;
  const speakers = new Set<string>();
  
  let match;
  while ((match = speakerRegex.exec(transcript)) !== null) {
    const speaker = match[1] || match[2];
    if (speaker && !speaker.match(/^\d+$/)) { // Avoid numbered speakers
      speakers.add(speaker.trim());
    }
  }
  
  return Array.from(speakers);
}

/**
 * Formats transcript with improved readability for humans
 * Makes it easier to review in the UI
 */
export function formatTranscriptForDisplay(transcript: string): string {
  if (!transcript) return '';
  
  // Clean first
  const cleaned = cleanTranscript(transcript);
  
  // Identify speakers and dialog turns - common patterns in transcripts
  // Look for dialog indicators like speaker changes and question-answer pairs
  const dialogPatterns = [
    // Question mark often indicates a speaker change
    { pattern: /\?\s+([A-Z])/g, replacement: '?\n\n$1' },
    
    // Common dialog markers
    { pattern: /(Okay|Right|Sure|Yes|Yeah|No|Hmm|Um)\.\s+([A-Z])/g, replacement: '$1.\n\n$2' },
    
    // Period followed by clearly different thought
    { pattern: /\.\s+(But|However|So|And then|Now|Actually|Basically)/g, replacement: '.\n\n$1' },
    
    // Identify potential speaker changes
    { pattern: /(?:^|\n)([A-Za-z\s]+):\s*/g, replacement: '\n\n**$1**:\n' },
    
    // Add breaks for quotes
    { pattern: /([.!?]")\s+/g, replacement: '$1\n\n' },
    
    // Add breaks for general sentence endings
    { pattern: /([.!?])\s+([A-Z])/g, replacement: '$1\n\n$2' }
  ];
  
  let formatted = cleaned;
  
  // Apply each pattern
  dialogPatterns.forEach(({ pattern, replacement }) => {
    formatted = formatted.replace(pattern, replacement);
  });
  
  // Fix any excessive line breaks
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted;
}

/**
 * Detects the main topics discussed in a transcript
 * Simple implementation that looks for repeated phrases and keywords
 */
export function detectTopics(transcript: string): string[] {
  if (!transcript || transcript.length < 20) return [];
  
  // Simple implementation - look for words that appear multiple times
  const words = transcript.toLowerCase().split(/\W+/);
  const wordCounts: Record<string, number> = {};
  const stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);
  
  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  
  // Return top 5 words
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);
}