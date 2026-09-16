import JSZip from 'jszip';
import type { QuestionOption, QuestionType } from '../types';

export interface ParsedImportItem {
  id: string;
  prompt: string;
  type: QuestionType;
  points: number;
  options: QuestionOption[];
  correctOptionIds: string[];
}

/**
 * Extracts plain text from a Word (.docx) file directly in the browser.
 * A .docx file is a ZIP archive containing word/document.xml.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const docXml = await zip.file('word/document.xml')?.async('text');
  if (!docXml) {
    throw new Error('No se pudo leer el contenido del documento Word (word/document.xml no encontrado).');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, 'text/xml');
  const paragraphs = xmlDoc.getElementsByTagName('w:p');

  const lines: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textNodes = p.getElementsByTagName('w:t');
    let pText = '';
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent || '';
    }
    const trimmed = pText.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  return lines.join('\n');
}

/**
 * Parses raw text formatted in standard Testportal / Word test format into structured questions.
 * Supports:
 * - Numbered questions (1. , 1) , Pregunta 1: )
 * - Options (A), B), C), D) / a., b., c., d. / - / •)
 * - Correct answers marked with asterisk (*A) ... or A) ... *)
 * - Explicit answer line (Respuesta: C, Answer: C, Solución: B, etc.)
 * - True/False detection
 * - Multiple choice detection
 */
export function parseQuestionsFromText(rawText: string): ParsedImportItem[] {
  if (!rawText || !rawText.trim()) return [];

  const rawLines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const parsedQuestions: ParsedImportItem[] = [];

  interface RawQuestionBlock {
    promptLines: string[];
    optionLines: { isAsteriskMarked: boolean; letterKey: string; text: string }[];
    answerKeyLine?: string;
  }

  const blocks: RawQuestionBlock[] = [];
  let currentBlock: RawQuestionBlock | null = null;

  // Regex patterns
  const questionStartRegex = /^(?:(?:pregunta|question|p)?\s*\d+[.):-]\s*|[¿?])/i;
  const optionStartRegex = /^(\*?)\s*(?:\[([ xX])\]|[a-hA-H1-8][.):-])\s*(.*)$/;
  const answerLineRegex = /^(?:respuesta(?:s)?(?:\s+correcta(?:s)?)?|answer(?:s)?|soluci[oó]n|clave|r)\s*[:=]\s*(.+)$/i;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Check for explicit answer line (e.g., "Respuesta: C" or "Respuesta correcta: A, B")
    const answerMatch = line.match(answerLineRegex);
    if (answerMatch && currentBlock) {
      currentBlock.answerKeyLine = answerMatch[1].trim();
      continue;
    }

    // Check for option line (e.g., "A) París", "*B) Londres", "a. Roma", "[x] Bogotá")
    const optionMatch = line.match(optionStartRegex);
    if (optionMatch && currentBlock && currentBlock.promptLines.length > 0) {
      let isAsterisk = Boolean(optionMatch[1]);
      let optionContent = optionMatch[3].trim();

      // Check if bracket had an x [x]
      if (optionMatch[2] && optionMatch[2].toLowerCase() === 'x') {
        isAsterisk = true;
      }

      // Check if asterisk is at the end of line (e.g., "C) París *")
      if (optionContent.endsWith('*')) {
        isAsterisk = true;
        optionContent = optionContent.slice(0, -1).trim();
      }

      // Detect letter prefix if exists
      const letterMatch = line.match(/^[a-hA-H]/);
      const letterKey = letterMatch ? letterMatch[0].toUpperCase() : String.fromCharCode(65 + currentBlock.optionLines.length);

      currentBlock.optionLines.push({
        isAsteriskMarked: isAsterisk,
        letterKey,
        text: optionContent,
      });
      continue;
    }

    // Check for new question start
    const isNewQuestionStart = questionStartRegex.test(line);

    if (isNewQuestionStart || !currentBlock || (currentBlock.optionLines.length > 0 && !optionMatch)) {
      if (currentBlock && currentBlock.promptLines.length > 0 && currentBlock.optionLines.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        promptLines: [cleanPromptNumbering(line)],
        optionLines: [],
      };
    } else {
      // Continuation of prompt
      currentBlock.promptLines.push(line);
    }
  }

  if (currentBlock && currentBlock.promptLines.length > 0 && currentBlock.optionLines.length > 0) {
    blocks.push(currentBlock);
  }

  // Convert blocks into final Questions
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const prompt = block.promptLines.join(' ').trim();
    if (!prompt || block.optionLines.length < 2) continue;

    const questionId = 'q_' + Math.random().toString(36).substring(2, 7);
    const options: QuestionOption[] = [];
    const correctOptionIds: string[] = [];

    // Parse correct keys from answer line if present (e.g. "A", "A, B", "B y C")
    const explicitKeys: string[] = [];
    if (block.answerKeyLine) {
      const tokens = block.answerKeyLine.toUpperCase().match(/[A-H]/g);
      if (tokens) {
        explicitKeys.push(...tokens);
      }
    }

    for (let optIdx = 0; optIdx < block.optionLines.length; optIdx++) {
      const rawOpt = block.optionLines[optIdx];
      const optId = `opt_${optIdx + 1}`;
      options.push({
        id: optId,
        text: rawOpt.text,
      });

      const isMarkedAsterisk = rawOpt.isAsteriskMarked;
      const isMarkedExplicit = explicitKeys.includes(rawOpt.letterKey);

      if (isMarkedAsterisk || isMarkedExplicit) {
        correctOptionIds.push(optId);
      }
    }

    // Auto-detect type
    let type: QuestionType = 'single_choice';
    const isTrueFalse = options.length === 2 && 
      ((options[0].text.toLowerCase().includes('verdader') && options[1].text.toLowerCase().includes('fals')) ||
       (options[0].text.toLowerCase().includes('true') && options[1].text.toLowerCase().includes('false')));

    if (isTrueFalse) {
      type = 'true_false';
    } else if (correctOptionIds.length > 1) {
      type = 'multiple_choice';
    }

    // Fallback: If no correct answer was indicated, mark first option as suggestion
    if (correctOptionIds.length === 0 && options.length > 0) {
      correctOptionIds.push(options[0].id);
    }

    parsedQuestions.push({
      id: questionId,
      prompt,
      type,
      points: 5,
      options,
      correctOptionIds,
    });
  }

  return parsedQuestions;
}

function cleanPromptNumbering(line: string): string {
  return line.replace(/^(?:(?:pregunta|question|p)?\s*\d+[.):-]\s*)/i, '').trim();
}
