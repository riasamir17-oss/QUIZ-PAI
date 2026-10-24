import { MULTIPLE_CHOICE_QUESTIONS, ESSAY_QUESTIONS } from '../data/quizData';
import { StudentSubmission } from '../types/quiz';

export interface GradingResult {
  pgTotal: number;
  essayTotal: number;
  grandTotal: number;
  pgDetails: {
    questionId: string;
    number: number;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    earnedWeight: number;
  }[];
  essayScores: {
    [partKey: string]: number;
  };
  essayFeedbacks: {
    [partKey: string]: string;
  };
}

/**
 * Automatically grades a student submission.
 * PG is 100% exact match against verified keys (total 30 points).
 * Essay evaluates against official rubric concepts & key terminology (total 70 points).
 */
export function evaluateSubmission(answers: { [key: string]: string }): GradingResult {
  let pgTotal = 0;
  const pgDetails: GradingResult['pgDetails'] = [];

  for (const q of MULTIPLE_CHOICE_QUESTIONS) {
    const studentAnswer = (answers[q.id] || '').trim().toUpperCase();
    const isCorrect = studentAnswer === q.correctAnswer;
    const earned = isCorrect ? q.weight : 0;
    pgTotal += earned;

    pgDetails.push({
      questionId: q.id,
      number: q.number,
      studentAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      earnedWeight: earned,
    });
  }

  let essayTotal = 0;
  const essayScores: { [partKey: string]: number } = {};
  const essayFeedbacks: { [partKey: string]: string } = {};

  for (const q of ESSAY_QUESTIONS) {
    for (const part of q.parts) {
      const partKey = `${q.id}-${part.part}`;
      const text = (answers[partKey] || '').toLowerCase().trim();
      const maxWeight = part.weight;

      if (!text || text.length < 15) {
        essayScores[partKey] = 0;
        essayFeedbacks[partKey] = 'Jawaban belum memadai atau belum diisi.';
        continue;
      }

      // Calculate keyword and concept coverage
      let matches = 0;
      const foundKeywords: string[] = [];
      for (const kw of part.keywords) {
        if (text.includes(kw.toLowerCase())) {
          matches++;
          foundKeywords.push(kw);
        }
      }

      const matchRatio = matches / Math.max(part.keywords.length, 1);
      const hasSubstantialLength = text.length >= 80;

      let scoreAwarded = 0;
      let feedback = '';

      if (matchRatio >= 0.65 && hasSubstantialLength) {
        scoreAwarded = maxWeight;
        feedback = `Sangat Baik. Analisis komprehensif mencakup poin kunci (${foundKeywords.slice(0, 4).join(', ')}).`;
      } else if (matchRatio >= 0.45 && text.length >= 40) {
        scoreAwarded = Math.round(maxWeight * 0.85 * 10) / 10;
        feedback = `Baik. Menjawab pokok masalah dengan menyebut konsep ${foundKeywords.slice(0, 3).join(', ')}.`;
      } else if (matchRatio >= 0.25 || text.length >= 50) {
        scoreAwarded = Math.round(maxWeight * 0.65 * 10) / 10;
        feedback = `Cukup. Penjelasan dasar telah diuraikan, memerlukan pendalaman dalil dan terminologi fikih.`;
      } else {
        scoreAwarded = Math.round(maxWeight * 0.4 * 10) / 10;
        feedback = `Perlu Perbaikan. Konsep penting belum banyak terulas dalam uraian.`;
      }

      essayScores[partKey] = scoreAwarded;
      essayFeedbacks[partKey] = feedback;
      essayTotal += scoreAwarded;
    }
  }

  const grandTotal = Math.min(100, Math.round((pgTotal + essayTotal) * 10) / 10);

  return {
    pgTotal,
    essayTotal: Math.round(essayTotal * 10) / 10,
    grandTotal,
    pgDetails,
    essayScores,
    essayFeedbacks,
  };
}

/**
 * Recalculates total score when an instructor edits essay marks in Admin Dashboard.
 */
export function recalculateWithOverrides(
  submission: StudentSubmission,
  updatedEssayScores: { [partKey: string]: number }
): StudentSubmission {
  let newEssayTotal = 0;
  for (const key of Object.keys(updatedEssayScores)) {
    newEssayTotal += Number(updatedEssayScores[key]) || 0;
  }
  newEssayTotal = Math.round(newEssayTotal * 10) / 10;
  const newGrandTotal = Math.min(100, Math.round((submission.scores.pgTotal + newEssayTotal) * 10) / 10);

  return {
    ...submission,
    scores: {
      ...submission.scores,
      essayScores: updatedEssayScores,
      essayTotal: newEssayTotal,
      grandTotal: newGrandTotal,
    },
  };
}
