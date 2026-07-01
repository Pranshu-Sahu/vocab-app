/**
 * ============================================================
 * config.js — All tunable settings for the Vocabulary Learning Engine
 * ============================================================
 *
 * Change any value here to alter the engine's behaviour without
 * touching other modules.  Every module imports this single
 * source of truth so there are zero magic numbers elsewhere.
 * ============================================================
 */

const CONFIG = {
  /* ── Batch / Chunking ────────────────────────────────────── */

  /** Number of new words introduced per learning batch */
  BATCH_SIZE: 5,

  /** Number of questions in a single-batch practice quiz */
  QUESTIONS_PER_PRACTICE: 10,

  /** Number of questions in a mixed-revision quiz */
  QUESTIONS_PER_REVISION: 15,

  /** Number of questions for due-revision (SRS) quiz */
  QUESTIONS_PER_DUE_REVISION: 10,

  /* ── Mastery Levels ──────────────────────────────────────── */

  /** Ordered mastery levels (index = numeric level) */
  MASTERY_LEVELS: ['New', 'Learning', 'Familiar', 'Mastered'],

  /** Cumulative correct answers required to reach each level */
  MASTERY_THRESHOLDS: {
    Learning: 2,
    Familiar: 5,
    Mastered: 8,
  },

  /** Consecutive correct answers needed to promote one level */
  CONSECUTIVE_CORRECT_TO_PROMOTE: 3,

  /** How many mastery levels to drop on a wrong answer */
  WRONG_ANSWER_DEMOTION: 1,

  /* ── Spaced Repetition ───────────────────────────────────── */

  /** Days until next review at each mastery level */
  SRS_INTERVALS: {
    New: 0,        // review immediately
    Learning: 1,   // 1 day
    Familiar: 3,   // 3 days
    Mastered: 7,   // 7 days
  },

  /* ── Question Engine ─────────────────────────────────────── */

  /** Available question types — add/remove to change quiz variety */
  QUESTION_TYPES: [
    'meaning-to-word',
    'word-to-meaning',
    'synonym-match',
    'antonym-match',
    'fill-blank',
    'correct-usage',
    'multiple-choice',
    'type-the-word',
    'flashcard-recall',
  ],

  /** Maximum consecutive questions of the same type */
  MAX_SAME_TYPE_IN_ROW: 2,

  /** Number of options in multiple-choice questions */
  MCQ_OPTIONS_COUNT: 4,

  /* ── Weak-word Detection ─────────────────────────────────── */

  /** Weight multiplier for weak words in quiz selection */
  WEAK_WORD_WEIGHT: 3,

  /** Accuracy % below which a word is considered "weak" */
  WEAK_WORD_THRESHOLD: 60,

  /* ── Persistence ─────────────────────────────────────────── */

  /** localStorage key for all persisted state */
  STORAGE_KEY: 'vocab_engine_state',
};

export default CONFIG;
