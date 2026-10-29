import { describe, it, expect } from 'vitest';
import { parseQuestionsFromText } from './wordExamParser';

describe('parseQuestionsFromText', () => {
  it('returns an empty array when given empty input', () => {
    expect(parseQuestionsFromText('')).toEqual([]);
    expect(parseQuestionsFromText('   \n  \t  ')).toEqual([]);
  });

  it('parses standard multiple-choice questions with asterisk marker for correct answer', () => {
    const rawText = `
1. ¿Cuál es la capital de Colombia?
A) Medellín
*B) Bogotá
C) Cali
D) Barranquilla

2. ¿Cuál es el lenguaje de tipado estático sobre JavaScript?
*A) TypeScript
B) Python
C) Ruby
D) PHP
    `;

    const parsed = parseQuestionsFromText(rawText);
    expect(parsed).toHaveLength(2);

    expect(parsed[0].prompt).toBe('¿Cuál es la capital de Colombia?');
    expect(parsed[0].options).toHaveLength(4);
    expect(parsed[0].options[1].text).toBe('Bogotá');
    expect(parsed[0].correctOptionIds).toEqual([parsed[0].options[1].id]);

    expect(parsed[1].prompt).toBe('¿Cuál es el lenguaje de tipado estático sobre JavaScript?');
    expect(parsed[1].options[0].text).toBe('TypeScript');
    expect(parsed[1].correctOptionIds).toEqual([parsed[1].options[0].id]);
  });

  it('parses questions with explicit "Respuesta: X" answer key line', () => {
    const rawText = `
1. ¿Cuántos bits tiene un byte?
A) 4
B) 8
C) 16
D) 32
Respuesta: B
    `;

    const parsed = parseQuestionsFromText(rawText);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].options).toHaveLength(4);
    expect(parsed[0].options[1].text).toBe('8');
    expect(parsed[0].correctOptionIds).toEqual([parsed[0].options[1].id]);
  });
});
