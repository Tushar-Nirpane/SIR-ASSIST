/**
 * Tesseract OCR Engine & Parser for SIR-Assist
 * Performs on-device Web Worker OCR and regex-based field parsing for Indian Voter Cards (EPIC).
 */

export interface ParsedOCRFields {
  rawText: string;
  confidence: number;
  extractedEpic?: string;
  extractedName?: string;
  extractedRelative?: string;
  extractedAge?: number;
  extractedGender?: 'MALE' | 'FEMALE' | 'OTHER';
  isRealExtraction: boolean;
  warnings?: string[];
}

export interface OCRProgressEvent {
  status: string;
  progress: number; // 0 to 100
}

/**
 * Clean and normalize text extracted from OCR
 */
function cleanField(text: string): string {
  return text
    .replace(/[|\\_~*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse structured voter card fields from raw OCR text
 */
export function parseVoterCardText(rawText: string, confidence: number): ParsedOCRFields {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullCleanText = lines.join(' ');
  const warnings: string[] = [];

  let extractedEpic: string | undefined;
  let extractedName: string | undefined;
  let extractedRelative: string | undefined;
  let extractedAge: number | undefined;
  let extractedGender: 'MALE' | 'FEMALE' | 'OTHER' | undefined;

  // 1. EPIC Extraction: Standard format is 3 uppercase letters followed by 7 digits (e.g. XYZ1029384, ABC9988771)
  const epicRegex = /\b([A-Z]{3}[0-9]{7})\b/i;
  const looseEpicRegex = /\b([A-Z]{2,4}[0-9]{6,8})\b/i;
  const epicMatch = fullCleanText.match(epicRegex) || fullCleanText.match(looseEpicRegex);
  if (epicMatch) {
    extractedEpic = epicMatch[1].toUpperCase().replace(/\s/g, '');
  }

  // 2. Elector Name extraction
  for (const line of lines) {
    const nameMatch = line.match(/(?:Elector'?s?\s*Name|Elector\s*Name|Name)\s*[:;-]?\s*([A-Za-z\s.]{2,40})/i);
    if (nameMatch && !nameMatch[1].toLowerCase().includes('father') && !nameMatch[1].toLowerCase().includes('husband')) {
      const candidate = cleanField(nameMatch[1]);
      if (candidate.length >= 2 && !/^(of|is|the|card|election|india)$/i.test(candidate)) {
        extractedName = candidate;
        break;
      }
    }
  }

  // Fallback: If no explicit prefix, look for line near top that contains 2-4 capitalized words
  if (!extractedName) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      if (
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(line) &&
        !/Election|Commission|India|Identity|Card|Voter|National/i.test(line)
      ) {
        extractedName = line;
        break;
      }
    }
  }

  // 3. Father's / Husband's / Relative's Name extraction
  for (const line of lines) {
    const relativeMatch = line.match(
      /(?:Father'?s?|Husband'?s?|Mother'?s?|Relation'?s?)\s*Name\s*[:;-]?\s*([A-Za-z\s.]{2,40})/i
    );
    if (relativeMatch) {
      const candidate = cleanField(relativeMatch[1]);
      if (candidate.length >= 2) {
        extractedRelative = candidate;
        break;
      }
    }
  }

  // 4. Gender extraction
  if (/\b(?:Sex|Gender)\s*[:;-]?\s*Male\b/i.test(fullCleanText) || /\bMALE\b/.test(fullCleanText)) {
    extractedGender = 'MALE';
  } else if (/\b(?:Sex|Gender)\s*[:;-]?\s*Female\b/i.test(fullCleanText) || /\bFEMALE\b/.test(fullCleanText)) {
    extractedGender = 'FEMALE';
  } else if (/\b(?:Third Gender|Transgender|Other)\b/i.test(fullCleanText)) {
    extractedGender = 'OTHER';
  }

  // 5. Age extraction
  const ageMatch = fullCleanText.match(/\bAge\s*[:;-]?\s*(\d{2})\b/i);
  if (ageMatch) {
    const parsedAge = parseInt(ageMatch[1], 10);
    if (parsedAge >= 18 && parsedAge <= 120) {
      extractedAge = parsedAge;
    }
  }

  if (!extractedEpic) {
    warnings.push('EPIC number could not be automatically detected.');
  }
  if (!extractedName) {
    warnings.push('Elector name could not be automatically parsed.');
  }

  return {
    rawText,
    confidence: Math.round(confidence),
    extractedEpic,
    extractedName,
    extractedRelative,
    extractedAge,
    extractedGender,
    isRealExtraction: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Execute real Tesseract.js recognition on an image data URI
 */
export async function runTesseractOCR(
  imageUri: string,
  onProgress?: (progress: OCRProgressEvent) => void
): Promise<ParsedOCRFields> {
  onProgress?.({ status: 'Initializing Tesseract worker sandbox...', progress: 10 });

  try {
    // Dynamic import to keep initial bundle size light and allow Next.js client-side execution
    const Tesseract = await import('tesseract.js');

    const result = await Tesseract.recognize(imageUri, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(15 + (m.progress || 0) * 80);
          onProgress?.({
            status: `Recognizing text (${Math.round((m.progress || 0) * 100)}%)...`,
            progress: Math.min(pct, 95),
          });
        } else if (m.status) {
          onProgress?.({
            status: `${m.status}...`,
            progress: 25,
          });
        }
      },
    });

    onProgress?.({ status: 'Parsing extracted text matrix...', progress: 100 });

    const rawText = result.data.text || '';
    const confidence = result.data.confidence || 0;

    return parseVoterCardText(rawText, confidence);
  } catch (err: any) {
    console.warn('Tesseract execution notice (running in browser sandbox):', err);
    // If worker fails (e.g. offline with un-cached language models or blocked scripts)
    return {
      rawText: '',
      confidence: 0,
      isRealExtraction: false,
      warnings: [
        'Tesseract engine could not process the image (offline worker / low contrast). Please verify fields manually.',
      ],
    };
  }
}
