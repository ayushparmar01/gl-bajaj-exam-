/**
 * Polyfill browser canvas / matrix globals for serverless Node.js (AWS Lambda / Vercel)
 * required by modern pdfjs-dist / pdf-parse v2
 */
function ensurePdfEnvironment() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
      constructor() {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
        this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
        this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
        this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
        this.is2D = true;
        this.isIdentity = true;
      }
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      transformPoint(p) { return p; }
    };
  }
  if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {};
  }
  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {};
  }
}

/**
 * Extract raw text from PDF buffer using pdf-parse v2 (lazy loaded to prevent boot crashes)
 */
async function extractTextFromPdf(pdfBuffer) {
  ensurePdfEnvironment();
  const { PDFParse } = require('pdf-parse');

  let parser = null;
  try {
    parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    return result?.text || '';
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error(`Failed to parse PDF text: ${error.message}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (e) {
        // ignore cleanup error
      }
    }
  }
}

/**
 * Heuristic/Regex Question Parser
 * Extracts question text, options (A, B, C, D / 1, 2, 3, 4), and any detected answers.
 */
function parseQuestionsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // 1. Normalize line endings and whitespace
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove common PDF page markers e.g. "-- 1 of 5 --" or "Page 1 of 3"
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/Page\s+\d+\s+(?:of|\/)\s+\d+/gi, '');

  // 2. Identify question boundaries
  // Matches questions like: Q1. / Q.1 / Question 1: / Question 1 / 1. What... / 1) What...
  const questionPattern = /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*(\d+)[:\.]?|(\d+)\.(?!\d)|(\d+)\)\s*(?=[A-Z0-9"']{2,}))\s+/gi;

  const matches = [];
  let match;
  let expectedQNum = 1;

  while ((match = questionPattern.exec(text)) !== null) {
    const num = parseInt(match[1] || match[2] || match[3], 10);
    // Prefer sequential questions or questions with Q/Question prefix or dot
    if (!isNaN(num)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        qNum: num
      });
    }
  }

  if (matches.length === 0) {
    // Fallback: try splitting by empty lines or numbered lines
    return fallbackQuestionSplit(text);
  }

  const rawBlocks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].length;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const block = text.slice(start, end).trim();
    if (block) {
      rawBlocks.push(block);
    }
  }

  const parsedQuestions = [];

  for (const block of rawBlocks) {
    const parsed = parseSingleQuestionBlock(block);
    if (parsed && parsed.options.length >= 2) {
      parsedQuestions.push(parsed);
    }
  }

  return parsedQuestions;
}

/**
 * Parse an individual question block into questionText, options, and suggestedAnswer
 */
function parseSingleQuestionBlock(block) {
  // Check if answer is explicitly stated in the block (e.g. "Ans: B" or "Answer: (C)")
  let suggestedLetter = null;
  const ansMatch = block.match(/(?:Ans(?:wer)?|Correct\s*Answer|Key)\s*[:=-]?\s*\(?([A-Da-d1-4])\)?/i);
  if (ansMatch) {
    suggestedLetter = ansMatch[1].toUpperCase();
  }

  // Remove the answer line from the block before parsing options
  let cleanBlock = block.replace(/(?:Ans(?:wer)?|Correct\s*Answer|Key)\s*[:=-]?\s*\(?[A-Da-d1-4]\)?.*$/im, '').trim();

  // Pattern for options:
  // (A), (B), (C), (D) OR A., B., C., D. OR A), B), C), D) OR [A], [B], [C], [D] OR 1), 2), 3), 4) OR (1), (2), (3), (4)
  const optionRegex = /(?:(?:\(([A-Da-d1-4])\))|(?:^|\s+)([A-Da-d1-4])[\.\)]|(?:\[([A-Da-d1-4])\])|(?:\(([1-4])\)))\s+/g;

  const optMatches = [];
  let optMatch;
  while ((optMatch = optionRegex.exec(cleanBlock)) !== null) {
    const label = (optMatch[1] || optMatch[2] || optMatch[3] || optMatch[4]).toUpperCase();
    optMatches.push({
      index: optMatch.index,
      length: optMatch[0].length,
      label
    });
  }

  if (optMatches.length < 2) {
    // If not detected via regex, check if options are line-by-line starting with letters/numbers
    const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
      // First line(s) question, following lines options
      const questionText = lines[0];
      const options = lines.slice(1, 5).map(l => l.replace(/^[A-Da-d1-4][\.\)]\s*/, '').trim());
      if (options.length >= 2) {
        return {
          questionText,
          options,
          marks: 1,
          explanation: '',
          suggestedAnswer: null
        };
      }
    }
    return null;
  }

  // Question text is everything before the first option
  const firstOptIndex = optMatches[0].index;
  const questionText = cleanBlock.slice(0, firstOptIndex).replace(/\n+/g, ' ').trim();

  const options = [];
  const labelMap = {};

  for (let i = 0; i < optMatches.length; i++) {
    const start = optMatches[i].index + optMatches[i].length;
    const end = i < optMatches.length - 1 ? optMatches[i + 1].index : cleanBlock.length;
    let optText = cleanBlock.slice(start, end).replace(/\n+/g, ' ').trim();
    
    // Clean trailing punctuation
    optText = optText.replace(/[,;]+$/, '').trim();

    if (optText) {
      options.push(optText);
      const label = optMatches[i].label;
      labelMap[label] = optText;
    }
  }

  // Resolve suggestedAnswer if any
  let suggestedAnswer = null;
  if (suggestedLetter) {
    // Map '1'->'A', '2'->'B', etc.
    const numToLetter = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    const normalizedKey = numToLetter[suggestedLetter] || suggestedLetter;
    
    if (labelMap[normalizedKey]) {
      suggestedAnswer = labelMap[normalizedKey];
    } else {
      const idx = ['A', 'B', 'C', 'D'].indexOf(normalizedKey);
      if (idx >= 0 && idx < options.length) {
        suggestedAnswer = options[idx];
      }
    }
  }

  return {
    questionText: questionText || 'Untitled Question',
    options,
    marks: 1,
    explanation: '',
    suggestedAnswer
  };
}

/**
 * Fallback line-based splitting when standard numbering isn't explicit
 */
function fallbackQuestionSplit(text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const results = [];

  for (const para of paragraphs) {
    const parsed = parseSingleQuestionBlock(para);
    if (parsed && parsed.options.length >= 2) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * AI-powered Question Extraction with Google Gemini
 */
async function extractQuestionsWithGemini(pdfText, apiKey) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is required for AI extraction');
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const prompt = `You are an expert exam question extractor.
Analyze the following exam paper text and extract all multiple choice questions.

Text:
"""
${pdfText.slice(0, 50000)}
"""

Requirements:
1. Extract every multiple choice question.
2. For each question, extract the question text and all its choices/options as clean strings (remove the "A.", "B.", "(A)" prefixes).
3. If the paper contains an answer key or explicitly indicates the correct answer, set "suggestedAnswer" to the exact matching option string. If no answer is indicated, set "suggestedAnswer" to null.
4. Set default "marks" to 1.
5. Return ONLY a valid JSON array of objects with this schema:
[
  {
    "questionText": "string",
    "options": ["string", "string", ...],
    "marks": 1,
    "explanation": "string or empty",
    "suggestedAnswer": "matching option string or null"
  }
]
Do not wrap in markdown or backticks. Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleanJson);

    if (Array.isArray(questions)) {
      return questions.filter(q => q.questionText && Array.isArray(q.options) && q.options.length >= 2);
    }
    return [];
  } catch (err) {
    console.warn('Gemini extraction failed, will fallback to regex:', err.message);
    throw err;
  }
}

module.exports = {
  extractTextFromPdf,
  parseQuestionsFromText,
  extractQuestionsWithGemini
};
