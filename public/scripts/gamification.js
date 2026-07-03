/**
 * ============================================================
 * gamification.js — XP, Levels, and Badges Engine
 * ============================================================
 */

import CONFIG from './config.js';
import Store from './store.js';

/**
 * Calculates XP earned for a correct answer based on word difficulty
 */
function calculateXP(wordDifficulty = 'Medium') {
  const baseXP = CONFIG.XP_PER_CORRECT_ANSWER;
  const multiplier = CONFIG.DIFFICULTY_MULTIPLIERS[wordDifficulty] || 1;
  return Math.round(baseXP * multiplier);
}

/**
 * Updates streak based on current date
 * Returns true if streak was increased
 */
function updateStreak() {
  const stats = Store.getStats();
  const today = new Date().toISOString().split('T')[0];
  
  if (stats.lastSessionDate === today) {
    return false; // Already studied today
  }

  let newStreak = stats.currentStreak;
  
  if (!stats.lastSessionDate) {
    newStreak = 1;
  } else {
    const lastDate = new Date(stats.lastSessionDate);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // Streak broken
    }
  }

  const bestStreak = Math.max(newStreak, stats.bestStreak || 0);

  Store.updateStats({
    currentStreak: newStreak,
    bestStreak: bestStreak,
    lastSessionDate: today
  });

  return true;
}

/**
 * Determines current level based on total XP
 */
function getLevelForXP(xp) {
  let currentLevel = CONFIG.LEVEL_THRESHOLDS[0];
  for (const threshold of CONFIG.LEVEL_THRESHOLDS) {
    if (xp >= threshold.xp) {
      currentLevel = threshold;
    } else {
      break;
    }
  }
  return currentLevel;
}

/**
 * Add XP and check for level ups
 * Returns an object with xpGained and leveledUp boolean
 */
function addXP(amount) {
  const stats = Store.getStats();
  const currentXP = stats.xp || 0;
  const currentLevel = stats.level || 1;
  
  const newXP = currentXP + amount;
  const newLevelInfo = getLevelForXP(newXP);
  
  let leveledUp = false;
  if (newLevelInfo.level > currentLevel) {
    leveledUp = true;
  }
  
  Store.updateStats({
    xp: newXP,
    level: newLevelInfo.level
  });
  
  return {
    xpGained: amount,
    leveledUp,
    newLevel: newLevelInfo
  };
}

/**
 * Evaluates and unlocks badges based on current state
 * Returns an array of newly unlocked badge IDs
 */
function evaluateBadges() {
  const stats = Store.getStats();
  const currentBadgeIds = new Set((stats.badges || []).map(b => typeof b === 'string' ? b : b.id));
  const newlyUnlocked = [];
  
  const unlock = (badgeId) => {
    if (!currentBadgeIds.has(badgeId)) {
      currentBadgeIds.add(badgeId);
      newlyUnlocked.push(badgeId);
    }
  };

  // Check First Blood
  if (stats.totalReviews > 0) {
    unlock('FIRST_BLOOD');
  }

  // Check 7-Day Streak
  if (stats.currentStreak >= 7) {
    unlock('STREAK_7');
  }

  // Check Century
  const computedStats = Store.getComputedStats(0);
  if (computedStats.wordsLearned >= 100) {
    unlock('CENTURY');
  }

  // Check Hard Worker (Mastered 10 Hard words)
  // Need to cross-reference with words.json to know difficulty, but we can do a simplified check 
  // if we pass word data, or we just rely on totalMastered. For now, we approximate if total Mastered > 20
  if (computedStats.wordsMastered >= 20) {
    unlock('HARD_WORKER');
  }

  if (newlyUnlocked.length > 0) {
    const updatedBadges = (stats.badges || []).map(b => typeof b === 'string' ? { id: b, dateEarned: new Date().toISOString() } : b);
    newlyUnlocked.forEach(id => {
      updatedBadges.push({ id, dateEarned: new Date().toISOString() });
    });
    Store.updateStats({
      badges: updatedBadges
    });
  }

  return newlyUnlocked;
}

/**
 * Save session result to leaderboard history
 */
function recordSession(score, mode, totalQs, xpGained) {
  const stats = Store.getStats();
  const history = stats.sessionHistory || [];
  
  history.push({
    date: new Date().toISOString(),
    score,
    mode,
    totalQs,
    xpGained
  });
  
  Store.updateStats({
    sessionHistory: history
  });
}

export const Gamification = {
  calculateXP,
  updateStreak,
  addXP,
  evaluateBadges,
  recordSession,
  getLevelForXP
};

export default Gamification;
