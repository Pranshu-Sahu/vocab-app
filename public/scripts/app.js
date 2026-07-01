/**
 * ============================================================
 * app.js — Entry point & screen router
 * ============================================================
 *
 * Thin orchestrator that:
 *   1. Loads vocabulary data from window.__vocabWords
 *   2. Initialises Store from localStorage
 *   3. Coordinates the session flow by calling Engine, Questions, UI
 *   4. Manages screen transitions and event delegation
 * ============================================================
 */

import CONFIG    from './config.js';
import Store     from './store.js';
import Engine    from './engine.js';
import Questions from './questions.js';
import UI        from './ui.js';

/* ── Module-level state ────────────────────────────────────── */

let allWords = [];          // full vocabulary
let sessionSteps = [];      // planned steps for current session
let currentStepIndex = 0;   // which step we're executing
let quizAnswers = [];       // accumulated answers for the current quiz

/* ── Initialisation ────────────────────────────────────────── */

function init() {
  allWords = window.__vocabWords || [];

  // Load persisted state
  Store.load();

  // Update streak on app open
  Engine.updateStreak();

  // Show dashboard
  showDashboard();
}

/* ── Dashboard ─────────────────────────────────────────────── */

function showDashboard() {
  const stats       = Store.getComputedStats(allWords.length);
  const sessionPlan = Engine.getSessionPlan(allWords);

  UI.fadeTransition(() => {
    UI.renderDashboard(stats, sessionPlan, {
      onStartSession: startSession,
      onWeakWords:    startWeakReview,
      onReset:        handleReset,
    });
  });
}

/* ── Session Flow ──────────────────────────────────────────── */

function startSession() {
  sessionSteps    = Engine.buildSessionPlan(allWords);
  currentStepIndex = 0;

  if (sessionSteps.length === 0) {
    // Nothing to do — all complete, no due words
    // Offer a full revision
    const revisionPool = allWords.filter((w) => {
      const p = Store.getWordProgress(w.id);
      return p.masteryLevel !== 'New';
    });
    if (revisionPool.length > 0) {
      sessionSteps = [{ type: 'quiz', quizType: 'revision', words: revisionPool }];
    } else {
      showDashboard();
      return;
    }
  }

  executeCurrentStep();
}

function executeCurrentStep() {
  if (currentStepIndex >= sessionSteps.length) {
    showSessionComplete();
    return;
  }

  const step = sessionSteps[currentStepIndex];

  if (step.type === 'learn') {
    startLearnPhase(step);
  } else if (step.type === 'quiz') {
    startQuizPhase(step);
  }
}

function advanceStep() {
  currentStepIndex++;
  executeCurrentStep();
}

/* ── Learn Phase ───────────────────────────────────────────── */

let learnWords = [];
let learnIndex = 0;
let learnBatchIndex = 0;

function startLearnPhase(step) {
  learnWords      = step.words;
  learnIndex      = 0;
  learnBatchIndex = step.batchIndex;

  showLearnCard();
}

function showLearnCard() {
  const word     = learnWords[learnIndex];
  const batchNum = learnBatchIndex + 1;
  const label    = `Batch ${batchNum} — Learning New Words`;

  UI.fadeTransition(() => {
    UI.renderLearnCard(word, learnIndex, learnWords.length, label, {
      onBack: showDashboard,
      onPrev: () => {
        if (learnIndex > 0) {
          learnIndex--;
          showLearnCard();
        }
      },
      onNext: () => {
        if (learnIndex < learnWords.length - 1) {
          learnIndex++;
          showLearnCard();
        }
      },
      onStartPractice: () => {
        // Mark all words in this batch as "Learning"
        Engine.markBatchLearned(allWords, learnBatchIndex);
        advanceStep();
      },
    });
  });
}

/* ── Quiz Phase ────────────────────────────────────────────── */

let quizQuestions = [];
let quizIndex     = 0;
let quizType      = '';
let quizBatchIdx  = null;

function startQuizPhase(step) {
  quizType     = step.quizType;
  quizBatchIdx = step.batchIndex ?? null;
  quizAnswers  = [];
  quizIndex    = 0;

  // Determine question count
  let count;
  if (quizType === 'practice')      count = CONFIG.QUESTIONS_PER_PRACTICE;
  else if (quizType === 'revision') count = CONFIG.QUESTIONS_PER_REVISION;
  else                              count = CONFIG.QUESTIONS_PER_DUE_REVISION;

  // Cap to pool size (don't ask more questions than words × 2)
  count = Math.min(count, step.words.length * 2);

  quizQuestions = Questions.generateQuiz(
    step.words,
    count,
    allWords,
    Store.getState().wordProgress
  );

  if (quizQuestions.length === 0) {
    advanceStep();
    return;
  }

  showQuizQuestion();
}

function quizLabel() {
  if (quizType === 'practice')      return 'Practice';
  if (quizType === 'revision')      return 'Mixed Revision';
  if (quizType === 'due-revision')  return 'Daily Review';
  if (quizType === 'weak-review')   return 'Weak Words';
  return 'Quiz';
}

function showQuizQuestion() {
  const question = quizQuestions[quizIndex];

  UI.fadeTransition(() => {
    UI.renderQuizQuestion(
      question,
      quizIndex + 1,
      quizQuestions.length,
      quizLabel(),
      {
        onAnswer: (correct, userAnswer) => {
          // Record in engine
          Engine.recordAnswer(question.wordId, correct);

          // Track for results screen
          const wordObj = allWords.find((w) => w.id === question.wordId);
          quizAnswers.push({
            wordId: question.wordId,
            word: wordObj ? wordObj.word : '',
            correct,
            userAnswer,
            correctAnswer: question.correctAnswer || '',
          });
        },
        onNext: () => {
          quizIndex++;
          if (quizIndex < quizQuestions.length) {
            showQuizQuestion();
          } else {
            showQuizResults();
          }
        },
      }
    );
  });
}

function showQuizResults() {
  // Mark batch as practiced if this was a batch practice
  if (quizType === 'practice' && quizBatchIdx !== null) {
    Engine.markBatchPracticed(quizBatchIdx);
  }

  UI.fadeTransition(() => {
    UI.renderQuizResults(quizAnswers, quizLabel(), {
      onContinue: () => {
        // If this was the last batch practice and no more steps, advance batch
        if (quizType === 'practice' || quizType === 'revision') {
          // Check if we need to advance batch
          const session = Store.getSession();
          if (
            currentStepIndex >= sessionSteps.length - 1 &&
            session.currentBatchIndex < Engine.getTotalBatches(allWords)
          ) {
            Engine.advanceToNextBatch();
          }
        }
        advanceStep();
      },
    });
  });
}

/* ── Session Complete ──────────────────────────────────────── */

function showSessionComplete() {
  const stats = Store.getComputedStats(allWords.length);

  UI.fadeTransition(() => {
    UI.renderSessionComplete(stats, {
      onDashboard: showDashboard,
    });
  });
}

/* ── Weak Words Review ─────────────────────────────────────── */

function startWeakReview() {
  const weakWords = Engine.getWeakWords(allWords);
  if (weakWords.length === 0) {
    showDashboard();
    return;
  }

  // Run as a standalone quiz (not part of session steps)
  sessionSteps     = [{ type: 'quiz', quizType: 'weak-review', words: weakWords }];
  currentStepIndex = 0;
  executeCurrentStep();
}

/* ── Reset ─────────────────────────────────────────────────── */

function handleReset() {
  Store.resetAll();
  showDashboard();
}

/* ── Bootstrap ─────────────────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
