/**
 * ============================================================
 * store.js — State management & localStorage persistence
 * ============================================================
 *
 * Holds all mutable runtime data:
 *   • wordProgress  — per-word mastery tracking
 *   • session       — current phase, batch, quiz state
 *   • stats         — lifetime statistics & streak
 *
 * Every mutation auto-saves to localStorage so progress
 * survives page reloads and browser restarts.
 * ============================================================
 */

import CONFIG from './config.js';

/* ── Default state factory ─────────────────────────────────── */

function createDefaultState() {
  return {
    /**
     * Per-word learning progress.
     * Keyed by word ID (number → object).
     */
    wordProgress: {},

    /**
     * Transient session state — tracks where the learner
     * currently is in the learn → practice → revision flow.
     */
    session: {
      currentBatchIndex: 0,
      batchesCompleted: [],          // batch indices whose practice is done
      phase: 'dashboard',            // active screen
      learnIndex: 0,                 // word position within the current batch
      learnViewedAll: false,         // whether all 5 words have been seen
      quizType: null,                // 'practice' | 'revision' | 'due-revision' | 'weak-review'
      quiz: {
        questions: [],
        currentIndex: 0,
        answers: [],                 // { wordId, correct, userAnswer, correctAnswer }
      },
      sessionSteps: [],              // planned steps for the current session
      sessionStepIndex: 0,           // which step we're on
    },

    /**
     * Lifetime statistics — survive across sessions.
     */
    stats: {
      totalReviews: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastSessionDate: null,         // ISO date 'YYYY-MM-DD'
      xp: 0,
      level: 1,
      badges: [],
      sessionHistory: [],            // Array of { date: string, score: number, mode: string, xpGained: number }
    },
  };
}

/* ── Private state ─────────────────────────────────────────── */

let _state = createDefaultState();

/* ── Deep merge utility ────────────────────────────────────── */

/**
 * Recursively merges `source` into `target`.
 * Arrays are replaced (not concatenated) to avoid stale data.
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/* ── Persistence ───────────────────────────────────────────── */

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      _state = deepMerge(createDefaultState(), saved);
    }
  } catch (err) {
    console.warn('[Store] Failed to load state:', err);
    _state = createDefaultState();
  }
}

function save() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(_state));
  } catch (err) {
    console.warn('[Store] Failed to save state:', err);
  }
}

/* ── Getters ───────────────────────────────────────────────── */

function getState() {
  return _state;
}

/**
 * Returns the progress object for a word, creating it with
 * defaults if it doesn't exist yet.
 */
function getWordProgress(wordId) {
  if (!_state.wordProgress[wordId]) {
    _state.wordProgress[wordId] = {
      correctCount: 0,
      incorrectCount: 0,
      consecutiveCorrect: 0,
      lastReviewed: null,
      masteryLevel: 'New',
      nextReviewDate: null,
    };
  }
  return _state.wordProgress[wordId];
}

function getSession() {
  return _state.session;
}

function getStats() {
  return _state.stats;
}

/**
 * Returns computed / derived statistics for the dashboard.
 */
function getComputedStats(totalWordCount) {
  const progressEntries = Object.values(_state.wordProgress);
  const wordsLearned = progressEntries.filter(
    (p) => p.masteryLevel !== 'New'
  ).length;
  const wordsMastered = progressEntries.filter(
    (p) => p.masteryLevel === 'Mastered'
  ).length;
  const total = _state.stats.totalCorrect + _state.stats.totalIncorrect;
  const accuracy =
    total > 0
      ? Math.round((_state.stats.totalCorrect / total) * 100)
      : 0;

  return {
    wordsLearned,
    wordsMastered,
    accuracy,
    currentStreak: _state.stats.currentStreak,
    bestStreak: _state.stats.bestStreak || 0,
    totalReviews: _state.stats.totalReviews,
    totalVocabulary: totalWordCount,
    weakWordsCount: getWeakWordIds().length,
    percentComplete:
      totalWordCount > 0
        ? Math.round((wordsLearned / totalWordCount) * 100)
        : 0,
    xp: _state.stats.xp || 0,
    level: _state.stats.level || 1,
    badges: (_state.stats.badges || []).map(b => {
      const id = typeof b === 'string' ? b : b.id;
      const dateEarned = typeof b === 'string' ? new Date().toISOString() : b.dateEarned;
      const meta = CONFIG.BADGES[id] || { title: id, icon: '🏆', description: '' };
      return {
        id,
        dateEarned,
        name: meta.title,
        title: meta.title,
        icon: meta.icon,
        description: meta.description
      };
    }),
    sessionHistory: _state.stats.sessionHistory || [],
  };
}

/**
 * Returns IDs of words whose accuracy is below the weak threshold.
 */
function getWeakWordIds() {
  return Object.entries(_state.wordProgress)
    .filter(([, p]) => {
      const total = p.correctCount + p.incorrectCount;
      if (total === 0) return false;
      const accuracy = (p.correctCount / total) * 100;
      return accuracy < CONFIG.WEAK_WORD_THRESHOLD;
    })
    .map(([id]) => parseInt(id, 10));
}

/* ── Setters ───────────────────────────────────────────────── */

function updateSession(updates) {
  Object.assign(_state.session, updates);
  save();
}

function updateQuiz(updates) {
  Object.assign(_state.session.quiz, updates);
  save();
}

function updateStats(updates) {
  Object.assign(_state.stats, updates);
  save();
}

function updateWordProgress(wordId, updates) {
  const progress = getWordProgress(wordId);
  Object.assign(progress, updates);
  save();
}

function resetAll() {
  _state = createDefaultState();
  save();
}

/* ── Public API ────────────────────────────────────────────── */

export const Store = {
  load,
  save,
  getState,
  getWordProgress,
  getSession,
  getStats,
  getComputedStats,
  getWeakWordIds,
  updateSession,
  updateQuiz,
  updateStats,
  updateWordProgress,
  resetAll,
};

export default Store;
