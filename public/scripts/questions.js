/**
 * ============================================================
 * questions.js — Quiz question generator (9 types)
 * ============================================================
 *
 * Generates randomised quiz questions from a pool of words.
 * Handles:
 *   • 9 distinct question types
 *   • Anti-repetition (no more than N same types in a row)
 *   • Weak-word weighting (struggling words appear more often)
 *   • Graceful fallbacks when data is missing
 * ============================================================
 */

import CONFIG from './config.js';

/* ── Utilities ─────────────────────────────────────────────── */

/** Fisher-Yates shuffle — returns a new array. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `count` random items from `arr`. */
function pickRandom(arr, count) {
  return shuffle(arr).slice(0, count);
}

/** Get distractor words, excluding the target. */
function getDistractors(target, allWords, count = 3) {
  const others = allWords.filter((w) => w.id !== target.id);
  return pickRandom(others, Math.min(count, others.length));
}

/* ── Question Type Generators ──────────────────────────────── */

/**
 * Meaning → Word
 * "Which word means '...'?"
 */
function meaningToWord(word, allWords) {
  const distractors = getDistractors(word, allWords);
  const options = shuffle([
    { text: word.word, correct: true },
    ...distractors.map((d) => ({ text: d.word, correct: false })),
  ]);
  return {
    type: 'meaning-to-word',
    wordId: word.id,
    prompt: 'Which word means:',
    detail: `"${word.meaning}"`,
    options,
    correctAnswer: word.word,
  };
}

/**
 * Word → Meaning
 * "What does '...' mean?"
 */
function wordToMeaning(word, allWords) {
  const distractors = getDistractors(word, allWords);
  const options = shuffle([
    { text: word.meaning, correct: true },
    ...distractors.map((d) => ({ text: d.meaning, correct: false })),
  ]);
  return {
    type: 'word-to-meaning',
    wordId: word.id,
    prompt: 'What does this word mean?',
    detail: word.word,
    options,
    correctAnswer: word.meaning,
  };
}

/**
 * Synonym Match
 * "Which is a synonym of '...'?"
 */
function synonymMatch(word, allWords) {
  if (!word.synonyms || word.synonyms.length === 0) return null;

  const correct = word.synonyms[Math.floor(Math.random() * word.synonyms.length)];

  // Collect distractor synonyms from other words
  const pool = allWords
    .filter((w) => w.id !== word.id && w.synonyms && w.synonyms.length > 0)
    .flatMap((w) => w.synonyms)
    .filter((s) => s !== correct && !word.synonyms.includes(s));

  const distractors = pickRandom([...new Set(pool)], 3);

  // Pad with random word names if not enough
  while (distractors.length < 3) {
    const rw = allWords[Math.floor(Math.random() * allWords.length)];
    if (rw.id !== word.id && !distractors.includes(rw.word) && rw.word !== correct) {
      distractors.push(rw.word);
    }
  }

  const options = shuffle([
    { text: correct, correct: true },
    ...distractors.slice(0, 3).map((s) => ({ text: s, correct: false })),
  ]);

  return {
    type: 'synonym-match',
    wordId: word.id,
    prompt: 'Which is a synonym of',
    detail: word.word,
    options,
    correctAnswer: correct,
  };
}

/**
 * Antonym Match
 * "Which is an antonym of '...'?"
 */
function antonymMatch(word, allWords) {
  if (!word.antonyms || word.antonyms.length === 0) return null;

  const correct = word.antonyms[Math.floor(Math.random() * word.antonyms.length)];

  const pool = allWords
    .filter((w) => w.id !== word.id && w.antonyms && w.antonyms.length > 0)
    .flatMap((w) => w.antonyms)
    .filter((a) => a !== correct && !word.antonyms.includes(a));

  const distractors = pickRandom([...new Set(pool)], 3);

  while (distractors.length < 3) {
    const rw = allWords[Math.floor(Math.random() * allWords.length)];
    if (rw.id !== word.id && !distractors.includes(rw.word) && rw.word !== correct) {
      distractors.push(rw.word);
    }
  }

  const options = shuffle([
    { text: correct, correct: true },
    ...distractors.slice(0, 3).map((a) => ({ text: a, correct: false })),
  ]);

  return {
    type: 'antonym-match',
    wordId: word.id,
    prompt: 'Which is an antonym of',
    detail: word.word,
    options,
    correctAnswer: correct,
  };
}

/**
 * Fill in the Blank
 * Shows example sentence with the word blanked out.
 */
function fillBlank(word, allWords) {
  const sentence = word.exampleSentence;
  if (!sentence) return meaningToWord(word, allWords); // fallback

  const regex = new RegExp(`\\b${escapeRegex(word.word)}\\b`, 'gi');
  const blanked = sentence.replace(regex, '________');
  if (blanked === sentence) return meaningToWord(word, allWords);

  const distractors = getDistractors(word, allWords, 3);
  const options = shuffle([
    { text: word.word, correct: true },
    ...distractors.map((d) => ({ text: d.word, correct: false })),
  ]);

  return {
    type: 'fill-blank',
    wordId: word.id,
    prompt: 'Fill in the blank:',
    detail: blanked,
    options,
    correctAnswer: word.word,
  };
}

/**
 * Correct Usage
 * "Which sentence correctly uses the word '...'?"
 */
function correctUsage(word, allWords) {
  if (!word.exampleSentence) return wordToMeaning(word, allWords);

  const others = allWords
    .filter((w) => w.id !== word.id && w.exampleSentence)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  if (others.length < 3) return wordToMeaning(word, allWords);

  const options = shuffle([
    { text: word.exampleSentence, correct: true },
    ...others.map((d) => ({
      text: d.exampleSentence.replace(
        new RegExp(`\\b${escapeRegex(d.word)}\\b`, 'gi'),
        word.word
      ),
      correct: false,
    })),
  ]);

  return {
    type: 'correct-usage',
    wordId: word.id,
    prompt: 'Which sentence correctly uses the word',
    detail: word.word,
    options,
    correctAnswer: word.exampleSentence,
  };
}

/**
 * Multiple Choice — randomly delegates to another MCQ type.
 */
function multipleChoice(word, allWords) {
  const variants = [meaningToWord, wordToMeaning, synonymMatch, antonymMatch];
  const fn = variants[Math.floor(Math.random() * variants.length)];
  const q = fn(word, allWords);
  if (q) q.type = 'multiple-choice';
  return q;
}

/**
 * Type the Word
 * Shows meaning, user types the answer.
 */
function typeTheWord(word) {
  return {
    type: 'type-the-word',
    wordId: word.id,
    prompt: 'Type the word that means:',
    detail: `"${word.meaning}"`,
    correctAnswer: word.word,
    inputType: 'text',
    hint: `${word.word.length} letters — starts with "${word.word[0].toUpperCase()}"`,
  };
}

/**
 * Flashcard Recall — self-assessed.
 */
function flashcardRecall(word) {
  return {
    type: 'flashcard-recall',
    wordId: word.id,
    prompt: word.word,
    detail: word.meaning,
    synonyms: word.synonyms,
    antonyms: word.antonyms,
    correctAnswer: null,
    selfAssess: true,
  };
}

/* ── Regex helper ──────────────────────────────────────────── */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ── Generator map ─────────────────────────────────────────── */

const GENERATORS = {
  'meaning-to-word': meaningToWord,
  'word-to-meaning': wordToMeaning,
  'synonym-match':   synonymMatch,
  'antonym-match':   antonymMatch,
  'fill-blank':      fillBlank,
  'correct-usage':   correctUsage,
  'multiple-choice': multipleChoice,
  'type-the-word':   typeTheWord,
  'flashcard-recall': flashcardRecall,
};

/* ── Main Quiz Generator ───────────────────────────────────── */

/**
 * Generate `count` randomised quiz questions.
 *
 * @param {Array}  wordPool        – words eligible for this quiz
 * @param {number} count           – how many questions to produce
 * @param {Array}  allWords        – full vocabulary (for distractors)
 * @param {Object} wordProgressMap – Store.wordProgress (for weighting)
 * @returns {Array} questions
 */
function generateQuiz(wordPool, count, allWords, wordProgressMap = {}) {
  if (wordPool.length === 0) return [];

  const questions   = [];
  const recentTypes = [];

  /* ── Build a weighted pool so weak / new words appear more ── */
  const weightedPool = [];
  wordPool.forEach((w) => {
    const p = wordProgressMap[w.id];
    let weight = 1;
    if (p) {
      const total = p.correctCount + p.incorrectCount;
      if (total > 0) {
        const acc = (p.correctCount / total) * 100;
        if (acc < CONFIG.WEAK_WORD_THRESHOLD) weight = CONFIG.WEAK_WORD_WEIGHT;
      }
      if (p.masteryLevel === 'New' || p.masteryLevel === 'Learning') {
        weight = Math.max(weight, 2);
      }
    } else {
      weight = 2; // never-seen words get slight boost
    }
    for (let i = 0; i < weight; i++) weightedPool.push(w);
  });

  /* ── Filter question types to those the data supports ────── */
  const hasExamples = wordPool.some((w) => w.exampleSentence);
  const availableTypes = CONFIG.QUESTION_TYPES.filter((t) => {
    if ((t === 'fill-blank' || t === 'correct-usage') && !hasExamples) return false;
    return true;
  });

  /* ── Generate questions ──────────────────────────────────── */
  for (let i = 0; i < count; i++) {
    // Pick a word
    const word = weightedPool[Math.floor(Math.random() * weightedPool.length)];

    // Pick a type, enforcing anti-repetition
    let type;
    let attempts = 0;
    do {
      type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      attempts++;
    } while (
      attempts < 30 &&
      recentTypes.length >= CONFIG.MAX_SAME_TYPE_IN_ROW &&
      recentTypes.slice(-CONFIG.MAX_SAME_TYPE_IN_ROW).every((t) => t === type)
    );

    // Generate
    const gen = GENERATORS[type];
    let question = null;
    if (gen) {
      question =
        type === 'type-the-word' || type === 'flashcard-recall'
          ? gen(word)
          : gen(word, allWords);
    }

    // Fallback
    if (!question) question = meaningToWord(word, allWords);

    questions.push(question);
    recentTypes.push(question.type);
  }

  return questions;
}

/* ── Public API ────────────────────────────────────────────── */

export const Questions = {
  generateQuiz,
  shuffle,
};

export default Questions;
