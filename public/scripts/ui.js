/**
 * ============================================================
 * ui.js — All DOM rendering, animations, and screen management
 * ============================================================
 *
 * Five screens:
 *   1. Dashboard   – progress ring, stats, session CTA
 *   2. Learn       – word teaching cards (batch of 5)
 *   3. Quiz        – question display + answer input
 *   4. Results     – post-quiz summary
 *   5. Complete    – session celebration
 *
 * Every render function writes into #app-root. Navigation
 * is handled by the router in app.js calling these renderers.
 * ============================================================
 */

/* ── SVG icon paths (Heroicons-style) ──────────────────────── */

const ICONS = {
  meaning:  'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  synonym:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  antonym:  'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  example:  'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  bulb:     'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  arrowL:   'M15 19l-7-7 7-7',
  arrowR:   'M9 5l7 7-7 7',
  check:    'M5 13l4 4L19 7',
  x:        'M6 18L18 6M6 6l12 12',
  trophy:   'M12 15l-2 5h4l-2-5zm-3.5-3a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z',
  fire:     'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  star:     'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  badge:    'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
};

/** Create an SVG icon element. */
function icon(pathD, size = 16) {
  return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${pathD}"></path>
  </svg>`;
}

/* ── Helpers ───────────────────────────────────────────────── */

function $(sel) { return document.querySelector(sel); }

/** Fade-transition the app root content. */
function fadeTransition(renderFn) {
  const root = $('#app-root');
  root.classList.add('screen-exit');
  setTimeout(() => {
    renderFn();
    root.classList.remove('screen-exit');
    root.classList.add('screen-enter');
    setTimeout(() => root.classList.remove('screen-enter'), 350);
  }, 200);
}

/** Build a section-label element. */
function sectionLabel(label, iconPath) {
  return `<div class="section-label">${icon(iconPath, 14)} ${label}</div>`;
}

/** Build a chips row. */
function chipsHTML(items) {
  if (!items || items.length === 0) {
    return '<span class="chip chip-empty">None</span>';
  }
  return items.map((t) => `<span class="chip">${t}</span>`).join('');
}

/** Mastery badge colour class. */
function masteryClass(level) {
  return `mastery-${(level || 'new').toLowerCase()}`;
}

/** Friendly question-type label. */
function questionTypeLabel(type) {
  const map = {
    'meaning-to-word': 'Meaning → Word',
    'word-to-meaning': 'Word → Meaning',
    'synonym-match':   'Synonym Match',
    'antonym-match':   'Antonym Match',
    'fill-blank':      'Fill in the Blank',
    'correct-usage':   'Correct Usage',
    'multiple-choice': 'Multiple Choice',
    'type-the-word':   'Type the Word',
    'flashcard-recall': 'Flashcard Recall',
  };
  return map[type] || type;
}

/** Show a beautiful custom confirmation modal. */
function showConfirmModal(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-title">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="color: var(--color-wrong)">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        ${title}
      </div>
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" id="btn-modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-confirm" id="btn-modal-confirm">Reset Progress</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const cleanup = () => {
    overlay.classList.add('screen-exit');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btn-modal-cancel').addEventListener('click', cleanup);
  overlay.querySelector('#btn-modal-confirm').addEventListener('click', () => {
    cleanup();
    onConfirm();
  });
}

/* ================================================================
   1. DASHBOARD
   ================================================================ */

function renderDashboard(computedStats, sessionPlan, callbacks) {
  const s = computedStats;
  const pct = s.totalVocabulary > 0
    ? Math.round((s.wordsLearned / s.totalVocabulary) * 100)
    : 0;

  // SVG progress ring
  const radius = 54;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  const root = $('#app-root');
  root.innerHTML = `
    <div class="screen dashboard-screen">
      <header>
        <h1>VocabBuilder</h1>
        <p>Master Your Words</p>
      </header>

      <!-- Progress Ring -->
      <div class="progress-section">
        <div class="progress-ring-container">
          <svg class="progress-ring" viewBox="0 0 120 120">
            <circle class="progress-ring-bg" cx="60" cy="60" r="${radius}"
              fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
            <circle class="progress-ring-fill" cx="60" cy="60" r="${radius}"
              fill="none" stroke="url(#grad)" stroke-width="8"
              stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"
              transform="rotate(-90 60 60)" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#e0aaff"/>
                <stop offset="100%" stop-color="#9d4edd"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="progress-ring-text">
            <span class="progress-number">${s.wordsLearned}</span>
            <span class="progress-label">/ ${s.totalVocabulary} words</span>
          </div>
        </div>
      </div>

      <!-- Level & XP -->
      <div class="level-section" style="text-align: center; margin-bottom: 0.5rem; display: flex; flex-direction: column; align-items: center;">
        <div class="level-badge" style="display:inline-flex; align-items:center; gap:0.5rem; background: rgba(247, 183, 49, 0.15); color: var(--color-warning); padding: 0.4rem 1rem; border-radius: 99px; font-weight: 700; border: 1px solid rgba(247, 183, 49, 0.3); font-size: 1.1rem; box-shadow: 0 4px 15px rgba(247, 183, 49, 0.2);">
          ${icon(ICONS.star, 20)} Level ${s.level || 1}
        </div>
        <div class="xp-bar" style="width: 100%; max-width: 240px; height: 6px; background: rgba(255,255,255,0.06); border-radius: 99px; margin: 0.8rem 0 0.4rem; overflow: hidden; position: relative;">
          <div class="xp-fill" style="height: 100%; background: var(--accent-gradient); width: ${((s.xp || 0) % 500) / 5}%; transition: width 0.5s ease-out; box-shadow: 0 0 10px var(--accent-glow);"></div>
        </div>
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
          ${s.xp || 0} XP <span style="opacity: 0.5; margin: 0 0.3rem;">•</span> ${500 - ((s.xp || 0) % 500)} TO NEXT LEVEL
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">${icon(ICONS.check, 20)}</span>
          <span class="stat-value">${s.accuracy}%</span>
          <span class="stat-label">Accuracy</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">${icon(ICONS.fire, 20)}</span>
          <span class="stat-value">${s.currentStreak}</span>
          <span class="stat-label">Day Streak</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">${icon(ICONS.trophy, 20)}</span>
          <span class="stat-value">${s.wordsMastered}</span>
          <span class="stat-label">Mastered</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">${icon(ICONS.refresh, 20)}</span>
          <span class="stat-value">${s.totalReviews}</span>
          <span class="stat-label">Reviews</span>
        </div>
      </div>

      <!-- Session Info -->
      ${sessionPlan.hasDueRevision ? `
        <div class="session-info-card">
          ${icon(ICONS.refresh, 18)}
          <span>${sessionPlan.dueRevisionCount} word${sessionPlan.dueRevisionCount > 1 ? 's' : ''} due for revision today</span>
        </div>
      ` : ''}
      ${sessionPlan.allComplete ? `
        <div class="session-info-card complete-card">
          ${icon(ICONS.trophy, 18)}
          <span>All vocabulary completed! Keep revising to master every word.</span>
        </div>
      ` : `
        <div class="session-info-card">
          ${icon(ICONS.bulb, 18)}
          <span>Next: Batch ${sessionPlan.currentBatchIndex + 1} of ${sessionPlan.totalBatches} — ${sessionPlan.nextBatchWords.length} new words</span>
        </div>
      `}

      <!-- CTA -->
      <button class="cta-btn" id="btn-start-session">
        <span>${sessionPlan.allComplete && !sessionPlan.hasDueRevision ? 'Revise All Words' : 'Start Session'}</span>
        ${icon(ICONS.arrowR, 20)}
      </button>

      ${s.weakWordsCount > 0 ? `
        <button class="secondary-btn" id="btn-weak-words">
          ${icon(ICONS.refresh, 16)}
          Review Weak Words (${s.weakWordsCount})
        </button>
      ` : ''}

      <button class="tertiary-btn" id="btn-reset">Reset All Progress</button>

      <!-- Exam Modes -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem; width: 100%;">
        <button class="secondary-btn" id="btn-exam-mock" style="background: rgba(46, 196, 182, 0.1); border-color: rgba(46, 196, 182, 0.3); color: var(--color-correct);">
          ${icon(ICONS.fire, 18)} Mock Test
        </button>
        <button class="secondary-btn" id="btn-exam-pyq" style="background: rgba(247, 183, 49, 0.1); border-color: rgba(247, 183, 49, 0.3); color: var(--color-warning);">
          ${icon(ICONS.badge, 18)} PYQ Mode
        </button>
      </div>

      <!-- Badges section -->
      ${s.badges && s.badges.length > 0 ? `
        <div style="margin-top: 2rem; width: 100%; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            ${icon(ICONS.badge, 18)} <h3 style="font-size: 1.1rem; color: #fff;">Achievements</h3>
          </div>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            ${s.badges.map(b => `
              <div style="background: rgba(157, 78, 221, 0.1); border: 1px solid rgba(157, 78, 221, 0.3); padding: 0.8rem 1rem; border-radius: var(--radius-md); text-align: center; min-width: 120px;">
                <div style="font-size: 2rem; margin-bottom: 0.4rem;">${b.icon}</div>
                <div style="font-weight: 600; font-size: 0.9rem; color: #fff;">${b.name}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">${b.dateEarned.split('T')[0]}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Bind events
  $('#btn-start-session').addEventListener('click', callbacks.onStartSession);
  const weakBtn = $('#btn-weak-words');
  if (weakBtn) weakBtn.addEventListener('click', callbacks.onWeakWords);
  $('#btn-reset').addEventListener('click', () => {
    showConfirmModal(
      'Reset Progress',
      'This will permanently erase ALL your learning statistics, streaks, and spaced repetition schedules. This action cannot be undone.',
      callbacks.onReset
    );
  });
  
  const mockBtn = $('#btn-exam-mock');
  if (mockBtn && callbacks.onExamMock) mockBtn.addEventListener('click', callbacks.onExamMock);
  
  const pyqBtn = $('#btn-exam-pyq');
  if (pyqBtn && callbacks.onExamPYQ) pyqBtn.addEventListener('click', callbacks.onExamPYQ);
}


/* ================================================================
   2. LEARN SCREEN
   ================================================================ */

function renderLearnCard(word, position, total, batchLabel, callbacks) {
  const root = $('#app-root');

  // Progress dots
  const dots = Array.from({ length: total }, (_, i) =>
    `<span class="progress-dot ${i < position ? 'completed' : ''} ${i === position ? 'active' : ''}"></span>`
  ).join('');

  const hasMnemonic = word.mnemonic && word.mnemonic.trim();
  const hasExample  = word.exampleSentence && word.exampleSentence.trim();

  root.innerHTML = `
    <div class="screen learn-screen">
      <!-- Header -->
      <div class="learn-header">
        <button class="icon-btn" id="btn-back-learn" aria-label="Back to dashboard">
          ${icon(ICONS.arrowL, 20)}
        </button>
        <div class="batch-info">${batchLabel}</div>
        <div class="batch-progress">${dots}</div>
      </div>

      <!-- Word Card -->
      <main class="vocab-card" id="learn-card">
        <div class="card-header">
          <span class="badge mastery-learning">Learning</span>
          <span class="card-index">${position + 1} / ${total}</span>
        </div>

        <div class="word-container">
          <h2 class="word-title">${word.word}</h2>
        </div>

        <!-- Meaning -->
        <div class="content-section">
          ${sectionLabel('Meaning', ICONS.meaning)}
          <p class="explanation-text">${word.meaning}</p>
        </div>

        <!-- Synonyms -->
        <div class="content-section">
          ${sectionLabel('Synonyms', ICONS.synonym)}
          <div class="chips-container">${chipsHTML(word.synonyms)}</div>
        </div>

        <!-- Antonyms -->
        <div class="content-section">
          ${sectionLabel('Antonyms', ICONS.antonym)}
          <div class="chips-container">${chipsHTML(word.antonyms)}</div>
        </div>

        ${hasExample ? `
          <div class="content-section example-section">
            ${sectionLabel('Example', ICONS.example)}
            <p class="example-text">"${word.exampleSentence}"</p>
          </div>
        ` : ''}

        ${hasMnemonic ? `
          <div class="mnemonic-box">
            <div class="mnemonic-header">${icon(ICONS.bulb, 16)} Memory Trick</div>
            <p class="mnemonic-text">${word.mnemonic}</p>
          </div>
        ` : ''}
      </main>

      <!-- Navigation -->
      <div class="nav-controls">
        <button id="btn-learn-prev" class="nav-btn" ${position === 0 ? 'disabled' : ''}>
          ${icon(ICONS.arrowL, 20)} Prev
        </button>
        ${position === total - 1 ? `
          <button id="btn-start-practice" class="nav-btn cta-nav">
            Start Practice ${icon(ICONS.arrowR, 20)}
          </button>
        ` : `
          <button id="btn-learn-next" class="nav-btn">
            Next ${icon(ICONS.arrowR, 20)}
          </button>
        `}
      </div>
    </div>
  `;

  // Bind
  $('#btn-back-learn').addEventListener('click', callbacks.onBack);
  const prevBtn = $('#btn-learn-prev');
  if (prevBtn && !prevBtn.disabled) prevBtn.addEventListener('click', callbacks.onPrev);
  const nextBtn = $('#btn-learn-next');
  if (nextBtn) nextBtn.addEventListener('click', callbacks.onNext);
  const practiceBtn = $('#btn-start-practice');
  if (practiceBtn) practiceBtn.addEventListener('click', callbacks.onStartPractice);
}

/* ================================================================
   3. QUIZ SCREEN
   ================================================================ */

function renderQuizQuestion(question, qNum, qTotal, quizLabel, callbacks) {
  const root = $('#app-root');
  const pctProgress = Math.round(((qNum - 1) / qTotal) * 100);

  let answerHTML = '';

  if (question.selfAssess) {
    // Flashcard recall
    answerHTML = `
      <div class="flashcard-container">
        <div class="flashcard" id="flashcard">
          <div class="flashcard-inner">
            <div class="flashcard-front">
              <span class="flashcard-word">${question.prompt}</span>
              <span class="flashcard-hint">Tap to reveal meaning</span>
            </div>
            <div class="flashcard-back">
              <p class="flashcard-meaning">${question.detail}</p>
              ${question.synonyms && question.synonyms.length > 0 ? `
                <div class="flashcard-extra">
                  <strong>Synonyms:</strong> ${question.synonyms.join(', ')}
                </div>
              ` : ''}
              ${question.antonyms && question.antonyms.length > 0 ? `
                <div class="flashcard-extra">
                  <strong>Antonyms:</strong> ${question.antonyms.join(', ')}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="self-assess-btns" id="assess-btns" style="display:none">
          <button class="assess-btn wrong-btn" data-correct="false">
            ${icon(ICONS.x, 18)} Didn't Know
          </button>
          <button class="assess-btn correct-btn" data-correct="true">
            ${icon(ICONS.check, 18)} Knew It!
          </button>
        </div>
      </div>
    `;
  } else if (question.inputType === 'text') {
    // Type the word
    answerHTML = `
      <div class="input-container">
        <input type="text" class="answer-input" id="answer-input"
          placeholder="Type your answer..." autocomplete="off" autocapitalize="off" spellcheck="false" />
        <button class="submit-btn" id="btn-submit-answer">Submit</button>
        <p class="hint-text">${question.hint || ''}</p>
      </div>
    `;
  } else {
    // MCQ options
    answerHTML = `
      <div class="options-container" id="options-container">
        ${question.options.map((opt, i) => `
          <button class="option-btn" data-index="${i}" data-correct="${opt.correct}">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="option-text">${opt.text}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  root.innerHTML = `
    <div class="screen quiz-screen">
      <div class="quiz-header">
        <span class="quiz-type-badge">${quizLabel}</span>
        <span class="quiz-counter">Q${qNum} / ${qTotal}</span>
      </div>

      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width: ${pctProgress}%"></div>
      </div>

      <div class="question-card">
        <div class="question-type-label">${questionTypeLabel(question.type)}</div>
        <p class="question-prompt">${question.prompt}</p>
        ${question.detail ? `<h3 class="question-detail">${question.detail}</h3>` : ''}

        ${answerHTML}
      </div>

      <!-- Feedback (hidden until answered) -->
      <div class="feedback-overlay" id="feedback-overlay" style="display:none">
        <div class="feedback-content">
          <div class="feedback-icon" id="feedback-icon"></div>
          <p class="feedback-text" id="feedback-text"></p>
          <p class="feedback-correct" id="feedback-correct"></p>
          <button class="cta-btn feedback-next-btn" id="btn-feedback-next">
            Next ${icon(ICONS.arrowR, 18)}
          </button>
        </div>
      </div>
    </div>
  `;

  // ── Bind event handlers ───────────────────────────────────
  if (question.selfAssess) {
    const card = $('#flashcard');
    const assessBtns = $('#assess-btns');
    card.addEventListener('click', () => {
      card.classList.add('flipped');
      setTimeout(() => { assessBtns.style.display = 'flex'; }, 300);
    });
    assessBtns.querySelectorAll('.assess-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const correct = btn.dataset.correct === 'true';
        showFeedback(correct, question.prompt, correct ? 'Great recall!' : `The meaning is: ${question.detail}`);
        callbacks.onAnswer(correct, correct ? 'Knew it' : "Didn't know");
      });
    });
  } else if (question.inputType === 'text') {
    const input = $('#answer-input');
    const submitBtn = $('#btn-submit-answer');
    const handleSubmit = () => {
      const userAnswer = input.value.trim();
      if (!userAnswer) return;
      const correct = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
      input.disabled = true;
      submitBtn.disabled = true;
      showFeedback(correct, userAnswer, correct ? 'Perfect!' : `Correct answer: ${question.correctAnswer}`);
      callbacks.onAnswer(correct, userAnswer);
    };
    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    input.focus();
  } else {
    const container = $('#options-container');
    container.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Disable all options
        container.querySelectorAll('.option-btn').forEach((b) => { b.disabled = true; });

        const isCorrect = btn.dataset.correct === 'true';

        // Highlight correct/wrong
        btn.classList.add(isCorrect ? 'option-correct' : 'option-wrong');
        if (!isCorrect) {
          container.querySelector('[data-correct="true"]').classList.add('option-correct');
        }

        const userAnswer = btn.querySelector('.option-text').textContent;
        setTimeout(() => {
          showFeedback(isCorrect, userAnswer, isCorrect ? 'Well done!' : `Correct: ${question.correctAnswer}`);
          callbacks.onAnswer(isCorrect, userAnswer);
        }, 400);
      });
    });
  }

  // Next button in feedback
  $('#btn-feedback-next').addEventListener('click', callbacks.onNext);
}

/** Show the feedback overlay after answering. */
function showFeedback(correct, _userAnswer, message) {
  const overlay = $('#feedback-overlay');
  const iconEl  = $('#feedback-icon');
  const text    = $('#feedback-text');
  const detail  = $('#feedback-correct');

  overlay.style.display = 'flex';
  overlay.classList.add(correct ? 'feedback-correct-bg' : 'feedback-wrong-bg');
  iconEl.innerHTML = correct
    ? `<div class="feedback-icon-circle correct-circle">${icon(ICONS.check, 32)}</div>`
    : `<div class="feedback-icon-circle wrong-circle">${icon(ICONS.x, 32)}</div>`;
  text.textContent = correct ? 'Correct!' : 'Incorrect';
  detail.textContent = message;
}

/* ================================================================
   4. RESULTS SCREEN
   ================================================================ */

function renderQuizResults(answers, quizLabel, callbacks, gamificationData = {}) {
  const total   = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Score ring
  const radius = 46;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
  const msg   = pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good job!' : 'Keep practicing!';

  const answersHTML = answers.map((a) => `
    <div class="answer-item ${a.correct ? 'answer-correct' : 'answer-wrong'}">
      <span class="answer-icon">${a.correct ? icon(ICONS.check, 16) : icon(ICONS.x, 16)}</span>
      <div class="answer-detail">
        <span class="answer-word">${a.word || ''}</span>
        ${!a.correct ? `<span class="answer-correction">Correct: ${a.correctAnswer}</span>` : ''}
      </div>
    </div>
  `).join('');

  const root = $('#app-root');
  root.innerHTML = `
    <div class="screen results-screen">
      <div class="results-header">
        <h2>${quizLabel} Complete ${emoji}</h2>
        <p class="results-subtitle">${msg}</p>
      </div>

      <div class="score-section">
        <div class="score-ring-container">
          <svg class="score-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${radius}" fill="none"
              stroke="rgba(255,255,255,0.06)" stroke-width="6" />
            <circle cx="50" cy="50" r="${radius}" fill="none"
              stroke="${pct >= 50 ? '#2ec4b6' : '#e63946'}" stroke-width="6"
              stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              transform="rotate(-90 50 50)" />
          </svg>
          <div class="score-text">
            <span class="score-big">${correct}</span>
            <span class="score-small">/ ${total}</span>
          </div>
        </div>
        <span class="score-pct">${pct}%</span>
      </div>

      ${gamificationData.xpGained > 0 ? `
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: var(--color-warning); font-weight: 700; background: rgba(247, 183, 49, 0.1); padding: 0.8rem 1.5rem; border-radius: 99px; margin-top: 0.5rem;">
          ${icon(ICONS.star, 22)} <span>+${gamificationData.xpGained} XP Earned!</span>
        </div>
      ` : ''}

      ${gamificationData.badges && gamificationData.badges.length > 0 ? `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-top: 1rem;">
          <h3 style="font-size: 1rem; color: #fff;">New Badges Unlocked!</h3>
          <div style="display: flex; gap: 0.5rem;">
            ${gamificationData.badges.map(b => `
              <div style="background: rgba(157,78,221,0.2); border: 1px solid var(--accent-color); padding: 0.5rem 1rem; border-radius: var(--radius-md); font-size: 0.9rem;">
                <span style="font-size: 1.2rem; margin-right: 0.3rem;">${b.icon}</span> ${b.name}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${answers.some((a) => !a.correct) ? `
        <div class="answers-review">
          <h3 class="review-title">Review Your Answers</h3>
          ${answersHTML}
        </div>
      ` : `
        <div class="perfect-score">
          <p>Perfect score! All answers correct! 🌟</p>
        </div>
      `}

      <button class="cta-btn" id="btn-continue">
        Continue ${icon(ICONS.arrowR, 18)}
      </button>
    </div>
  `;

  $('#btn-continue').addEventListener('click', callbacks.onContinue);
}

/* ================================================================
   5. SESSION COMPLETE
   ================================================================ */

function renderSessionComplete(computedStats, callbacks) {
  const s = computedStats;
  const root = $('#app-root');
  root.innerHTML = `
    <div class="screen session-complete-screen">
      <div class="celebration">
        <div class="confetti-container" id="confetti"></div>
        <div class="trophy-icon">${icon(ICONS.trophy, 48)}</div>
        <h2>Session Complete!</h2>
        <p class="session-summary">Great work today!</p>
      </div>

      <div class="session-stats">
        <div class="session-stat">
          <span class="session-stat-value">${s.wordsLearned}</span>
          <span class="session-stat-label">Words Learned</span>
        </div>
        <div class="session-stat">
          <span class="session-stat-value">${s.wordsMastered}</span>
          <span class="session-stat-label">Mastered</span>
        </div>
        <div class="session-stat">
          <span class="session-stat-value">${s.accuracy}%</span>
          <span class="session-stat-label">Accuracy</span>
        </div>
        <div class="session-stat">
          <span class="session-stat-value">${s.currentStreak}</span>
          <span class="session-stat-label">Day Streak</span>
        </div>
        <div class="session-stat" style="grid-column: span 2; background: rgba(247, 183, 49, 0.08); border-color: rgba(247, 183, 49, 0.2);">
          <span class="session-stat-value" style="color: var(--color-warning);">${icon(ICONS.star, 24)} Level ${s.level}</span>
          <span class="session-stat-label">${s.xp} Total XP</span>
        </div>
      </div>

      <button class="cta-btn" id="btn-back-dashboard">
        Back to Dashboard ${icon(ICONS.arrowR, 18)}
      </button>
    </div>
  `;

  // Trigger confetti
  spawnConfetti();

  $('#btn-back-dashboard').addEventListener('click', callbacks.onDashboard);
}

/** Simple CSS confetti animation. */
function spawnConfetti() {
  const container = $('#confetti');
  if (!container) return;
  const colors = ['#e0aaff', '#9d4edd', '#5a189a', '#2ec4b6', '#f7b731', '#ff007f'];
  for (let i = 0; i < 40; i++) {
    const span = document.createElement('span');
    span.className = 'confetti-piece';
    span.style.setProperty('--x', `${Math.random() * 100}%`);
    span.style.setProperty('--delay', `${Math.random() * 2}s`);
    span.style.setProperty('--duration', `${1.5 + Math.random() * 2}s`);
    span.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(span);
  }
}

/* ── Public API ────────────────────────────────────────────── */

export const UI = {
  renderDashboard,
  renderLearnCard,
  renderQuizQuestion,
  renderQuizResults,
  renderSessionComplete,
  fadeTransition,
};

export default UI;
