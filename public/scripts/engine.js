/**
 * ============================================================
 * engine.js — Core learning logic & spaced-repetition scheduler
 * ============================================================
 *
 * Implements the session flow:
 *   Dashboard → Due Revision → Learn Batch → Practice →
 *   Mixed Revision → Dashboard
 *
 * All mastery transitions, SRS scheduling, batch management,
 * and streak tracking live here.
 * ============================================================
 */

import CONFIG from './config.js';
import Store  from './store.js';

/* ── Date helpers ──────────────────────────────────────────── */

function getToday() {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/* ── Spaced Repetition ─────────────────────────────────────── */

/**
 * Calculate the next review date given a mastery level.
 */
function calculateNextReview(masteryLevel) {
  const days = CONFIG.SRS_INTERVALS[masteryLevel] ?? 0;
  return addDays(getToday(), days);
}

/**
 * Returns words that are due for SRS review today or earlier.
 * Sorted most-overdue first.
 */
function getDueRevisionWords(allWords) {
  const today = getToday();
  return allWords
    .filter((w) => {
      const p = Store.getWordProgress(w.id);
      if (p.masteryLevel === 'New') return false;
      if (!p.nextReviewDate) return false;
      return p.nextReviewDate <= today;
    })
    .sort((a, b) => {
      const pa = Store.getWordProgress(a.id).nextReviewDate || '';
      const pb = Store.getWordProgress(b.id).nextReviewDate || '';
      return pa.localeCompare(pb); // earliest (most overdue) first
    });
}

/* ── Batch Management ──────────────────────────────────────── */

/**
 * Returns the 5 words for a given batch index.
 */
function getBatchWords(allWords, batchIndex) {
  const start = batchIndex * CONFIG.BATCH_SIZE;
  return allWords.slice(start, start + CONFIG.BATCH_SIZE);
}

/**
 * Returns all words from batch 0 through batchIndex (inclusive)
 * — the pool for mixed revision quizzes.
 */
function getRevisionPool(allWords, batchIndex) {
  const end = (batchIndex + 1) * CONFIG.BATCH_SIZE;
  return allWords.slice(0, end);
}

function getTotalBatches(allWords) {
  return Math.ceil(allWords.length / CONFIG.BATCH_SIZE);
}

function isBatchComplete(batchIndex) {
  return Store.getSession().batchesCompleted.includes(batchIndex);
}

/* ── Mastery & Answer Recording ────────────────────────────── */

/**
 * Record an answer and update the word's mastery + SRS schedule.
 */
function recordAnswer(wordId, correct) {
  const progress = Store.getWordProgress(wordId);
  const stats    = Store.getStats();

  if (correct) {
    progress.correctCount++;
    progress.consecutiveCorrect++;
    stats.totalCorrect++;

    // Check for mastery promotion
    const currentIdx = CONFIG.MASTERY_LEVELS.indexOf(progress.masteryLevel);
    const nextLevel  = CONFIG.MASTERY_LEVELS[currentIdx + 1];

    if (nextLevel) {
      const threshold = CONFIG.MASTERY_THRESHOLDS[nextLevel];
      if (
        progress.correctCount >= threshold &&
        progress.consecutiveCorrect >= CONFIG.CONSECUTIVE_CORRECT_TO_PROMOTE
      ) {
        progress.masteryLevel = nextLevel;
      }
    }
  } else {
    progress.incorrectCount++;
    progress.consecutiveCorrect = 0;
    stats.totalIncorrect++;

    // Demote mastery (never below Learning — once taught, stays at least Learning)
    const currentIdx = CONFIG.MASTERY_LEVELS.indexOf(progress.masteryLevel);
    if (currentIdx > 1) {
      const newIdx = Math.max(1, currentIdx - CONFIG.WRONG_ANSWER_DEMOTION);
      progress.masteryLevel = CONFIG.MASTERY_LEVELS[newIdx];
    }
  }

  progress.lastReviewed   = getToday();
  progress.nextReviewDate = calculateNextReview(progress.masteryLevel);
  stats.totalReviews++;

  Store.updateWordProgress(wordId, progress);
  Store.updateStats(stats);
}

/* ── Batch Lifecycle ───────────────────────────────────────── */

/**
 * Called after the user views all 5 words in a batch.
 * Initialises progress for any word still at 'New'.
 */
function markBatchLearned(allWords, batchIndex) {
  const batchWords = getBatchWords(allWords, batchIndex);
  batchWords.forEach((w) => {
    const p = Store.getWordProgress(w.id);
    if (p.masteryLevel === 'New') {
      Store.updateWordProgress(w.id, {
        ...p,
        masteryLevel: 'Learning',
        lastReviewed: getToday(),
        nextReviewDate: calculateNextReview('Learning'),
      });
    }
  });
}

/**
 * Called after a batch's practice quiz is finished.
 */
function markBatchPracticed(batchIndex) {
  const session = Store.getSession();
  if (!session.batchesCompleted.includes(batchIndex)) {
    const updated = [...session.batchesCompleted, batchIndex];
    Store.updateSession({ batchesCompleted: updated });
  }
}

/**
 * Move the current-batch pointer forward by one.
 */
function advanceToNextBatch() {
  const session = Store.getSession();
  Store.updateSession({
    currentBatchIndex: session.currentBatchIndex + 1,
    learnIndex: 0,
    learnViewedAll: false,
  });
}

/* ── Weak Words ────────────────────────────────────────────── */

function getWeakWords(allWords) {
  const weakIds = Store.getWeakWordIds();
  return allWords.filter((w) => weakIds.includes(w.id));
}

/* ── Streak ────────────────────────────────────────────────── */

function updateStreak() {
  const stats = Store.getStats();
  const today = getToday();

  if (stats.lastSessionDate === today) return; // already counted today

  if (stats.lastSessionDate) {
    const yesterday = addDays(today, -1);
    stats.currentStreak =
      stats.lastSessionDate === yesterday ? stats.currentStreak + 1 : 1;
  } else {
    stats.currentStreak = 1;
  }

  stats.bestStreak = Math.max(stats.currentStreak, stats.bestStreak || 0);
  stats.lastSessionDate = today;
  Store.updateStats(stats);
}

/* ── Session Planning ──────────────────────────────────────── */

/**
 * Builds an ordered list of steps for the current session.
 * Called when the user taps "Start Session".
 */
function buildSessionPlan(allWords) {
  const session     = Store.getSession();
  const totalB      = getTotalBatches(allWords);
  const batchIdx    = session.currentBatchIndex;
  const allComplete = batchIdx >= totalB;
  const steps       = [];

  // 1 — Due revision (SRS words)
  const dueWords = getDueRevisionWords(allWords);
  if (dueWords.length > 0) {
    steps.push({ type: 'quiz', quizType: 'due-revision', words: dueWords });
  }

  if (!allComplete) {
    // 2 — Learn the next batch
    const batchWords = getBatchWords(allWords, batchIdx);
    if (batchWords.length > 0) {
      steps.push({ type: 'learn', batchIndex: batchIdx, words: batchWords });

      // 3 — Practice that batch
      steps.push({ type: 'quiz', quizType: 'practice', words: batchWords, batchIndex: batchIdx });

      if (window.__vocabPassages && window.__vocabPassages.some(p => p.batchIndex === batchIdx)) {
        steps.push({ type: 'macro-practice', batchIndex: batchIdx });
      }

      // 4 — Mixed revision if we've already completed at least one batch before
      if (batchIdx > 0) {
        const revisionPool = getRevisionPool(allWords, batchIdx);
        steps.push({ type: 'quiz', quizType: 'revision', words: revisionPool });
      }
    }
  }

  return steps;
}

/**
 * Builds a session plan for a specific Candy Crush-style Level (Batch).
 * levelNumber is 1-indexed (Level 1 = Batch 0).
 */
function buildLevelSessionPlan(allWords, levelNumber) {
  const batchIdx = levelNumber - 1;
  const levelWords = getBatchWords(allWords, batchIdx);
  const steps = [];
  
  if (levelWords.length > 0) {
    steps.push({ type: 'learn', batchIndex: batchIdx, words: levelWords });
    steps.push({ type: 'quiz', quizType: 'practice', words: levelWords, batchIndex: batchIdx });
    
    if (window.__vocabPassages && window.__vocabPassages.some(p => p.batchIndex === batchIdx)) {
      steps.push({ type: 'macro-practice', batchIndex: batchIdx });
    }
  }
  
  return steps;
}

/**
 * Returns a high-level session plan summary for the dashboard.
 */
function getSessionPlan(allWords) {
  const session    = Store.getSession();
  const totalB     = getTotalBatches(allWords);
  const dueWords   = getDueRevisionWords(allWords);
  const batchIdx   = session.currentBatchIndex;
  const allDone    = batchIdx >= totalB;

  return {
    hasDueRevision: dueWords.length > 0,
    dueRevisionCount: dueWords.length,
    currentBatchIndex: batchIdx,
    totalBatches: totalB,
    allComplete: allDone,
    nextBatchWords: allDone ? [] : getBatchWords(allWords, batchIdx),
  };
}

/* ── Public API ────────────────────────────────────────────── */

export const Engine = {
  // Date helpers
  getToday,
  addDays,

  // SRS
  calculateNextReview,
  getDueRevisionWords,

  // Batches
  getBatchWords,
  getRevisionPool,
  getTotalBatches,
  isBatchComplete,

  // Mastery
  recordAnswer,
  markBatchLearned,
  markBatchPracticed,
  advanceToNextBatch,

  // Weak words
  getWeakWords,

  // Streak
  updateStreak,

  // Session
  buildSessionPlan,
  buildLevelSessionPlan,
  getSessionPlan,
};

export default Engine;
