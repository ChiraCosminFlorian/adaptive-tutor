const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;

// ─── Helpers ─────────────────────────────────────────────

function getLanguageInstruction(subject) {
  switch (subject) {
    case 'algorithms':
    case 'oop':
      return 'All code examples and expected answers must be in C#.';
    case 'databases':
      return 'All code examples and expected answers must be in SQL.';
    case 'mathematics':
      return 'Use text/explanation format. Do NOT include any code.';
    default:
      return '';
  }
}

function getCodeLanguageNote(subject) {
  switch (subject) {
    case 'algorithms':
    case 'oop':
      return 'Expected language: C#.';
    case 'databases':
      return 'Expected language: SQL.';
    default:
      return '';
  }
}

function getAnswerType(difficulty) {
  if (difficulty <= 2) return 'multiple_choice';
  if (difficulty === 3) return 'text';
  return 'code';
}

/**
 * Safely parse a JSON string that may be wrapped in markdown fences.
 */
function parseJSON(raw) {
  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON: ${err.message}\nRaw: ${cleaned.slice(0, 300)}`);
  }
}

// ─── Generate Question ───────────────────────────────────

async function generateQuestion(subject, difficulty, concept, recentMistakes = []) {
  const answerType = getAnswerType(difficulty);
  const languageInstruction = getLanguageInstruction(subject);
  const mistakesText =
    recentMistakes.length > 0
      ? recentMistakes.join(', ')
      : 'none yet';

  const systemPrompt = `You are an expert tutor for ${subject}. Generate exactly ONE question at difficulty ${difficulty}/5 about the concept: ${concept}.
Recent mistakes by this student: ${mistakesText}.
Target these weak areas if relevant.
${languageInstruction}
Respond ONLY in this exact JSON format with no extra text:
{
  "question": "string",
  "answerType": "${answerType}",
  "options": ${answerType === 'multiple_choice' ? '["option1","option2","option3","option4"]' : 'null'},
  "correctOption": ${answerType === 'multiple_choice' ? 'number (index 0-3)' : 'null'},
  "hint": "string",
  "expectedCriteria": "string",
  "conceptTested": "string"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: systemPrompt }],
  });

  const text = response.content[0].text;
  const parsed = parseJSON(text);

  // Enforce the answer type we requested
  parsed.answerType = answerType;

  return parsed;
}

// ─── Evaluate Answer ─────────────────────────────────────

async function evaluateAnswer(question, userAnswer, subject, answerType, difficulty, correctOption) {
  // Multiple-choice: deterministic check, no LLM needed
  if (answerType === 'multiple_choice') {
    const selected = parseInt(userAnswer, 10);
    const isCorrect = selected === correctOption;
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: isCorrect
        ? 'Correct! You picked the right answer.'
        : `Incorrect. The correct option was index ${correctOption}.`,
      explanation: isCorrect
        ? 'Your selection matched the expected answer.'
        : `The correct answer was option ${correctOption}. Review the concept and try again.`,
      encouragement: isCorrect
        ? 'Great job — keep it up!'
        : 'Don\'t worry, mistakes help you learn!',
    };
  }

  // Text / code: call Claude for evaluation
  const codeLanguageNote = getCodeLanguageNote(subject);

  const systemPrompt = `You are a strict but encouraging tutor for ${subject}.
Evaluate this student answer.
Question: ${question}
Answer type: ${answerType}
${codeLanguageNote}
Student answer: ${userAnswer}
Difficulty level: ${difficulty}/5
Respond ONLY in this exact JSON format with no extra text:
{
  "isCorrect": true or false,
  "score": number (0-100),
  "feedback": "string (2-3 sentences)",
  "explanation": "string (full correct solution with steps)",
  "encouragement": "string (one short motivating sentence)"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: systemPrompt }],
  });

  const text = response.content[0].text;
  return parseJSON(text);
}

// ─── Generate Hint ───────────────────────────────────────

async function generateHint(question, concept, subject) {
  const systemPrompt = `Give a subtle hint for this ${subject} question about ${concept}. Do NOT reveal the answer. Maximum 2 sentences.

Question: ${question}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: systemPrompt }],
  });

  return response.content[0].text.trim();
}

module.exports = {
  generateQuestion,
  evaluateAnswer,
  generateHint,
};
