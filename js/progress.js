// ===== PROGRESS MODULE =====
const Progress = (() => {
  const BADGES = [
    { id: 'first_word', name: 'First Word', icon: '🌱', condition: (stats) => stats.totalWords >= 1 },
    { id: 'ten_words', name: '10 Words!', icon: '📚', condition: (stats) => stats.totalWords >= 10 },
    { id: 'twenty_words', name: '20 Words!', icon: '📖', condition: (stats) => stats.totalWords >= 20 },
    { id: 'first_star', name: 'First Star', icon: '⭐', condition: (stats) => stats.totalStars >= 1 },
    { id: 'ten_stars', name: '10 Stars', icon: '🌟', condition: (stats) => stats.totalStars >= 10 },
    { id: 'fifty_stars', name: '50 Stars', icon: '💫', condition: (stats) => stats.totalStars >= 50 },
    { id: 'spelling_ace', name: 'Spell Ace', icon: '✏️', condition: (stats) => stats.spellingStars >= 10 },
    { id: 'pos_pro', name: 'Type Pro', icon: '🏷️', condition: (stats) => stats.posStars >= 10 },
    { id: 'sentence_star', name: 'Writer', icon: '✍️', condition: (stats) => stats.sentenceStars >= 10 },
    { id: 'first_mastery', name: 'Mastered 1', icon: '🏆', condition: (stats) => stats.mastered >= 1 },
    { id: 'five_mastery', name: 'Mastered 5', icon: '👑', condition: (stats) => stats.mastered >= 5 },
    { id: 'streak_3', name: '3 Day Streak', icon: '🔥', condition: (stats) => stats.streak >= 3 },
    { id: 'streak_7', name: 'Week Streak', icon: '💎', condition: (stats) => stats.streak >= 7 },
  ];

  function getStats() {
    const words = Words.getAll();
    const progressData = ProgressData.getAll();
    let spellingStars = 0, posStars = 0, sentenceStars = 0;

    for (const id in progressData) {
      spellingStars += progressData[id].spelling || 0;
      posStars += progressData[id].pos || 0;
      sentenceStars += progressData[id].sentences || 0;
    }

    return {
      totalWords: words.length,
      totalStars: spellingStars + posStars + sentenceStars,
      spellingStars,
      posStars,
      sentenceStars,
      mastered: ProgressData.getMasteredCount(),
      streak: App.getStreak()
    };
  }

  function render() {
    const stats = getStats();
    const words = Words.getAll();

    // Overview stats
    document.getElementById('stat-total-stars').textContent = stats.totalStars;
    document.getElementById('stat-words-mastered').textContent = stats.mastered;
    document.getElementById('stat-streak').textContent = stats.streak;

    // Overall progress bar
    const maxStars = words.length * 9; // 9 stars per word max
    const percent = maxStars > 0 ? Math.round((stats.totalStars / maxStars) * 100) : 0;
    document.getElementById('overall-progress-bar').style.width = percent + '%';
    document.getElementById('overall-progress-text').textContent =
      maxStars > 0 ? `${stats.totalStars} / ${maxStars} stars (${percent}%)` : 'Add words to start!';

    // Badges
    renderBadges(stats);

    // Word-by-word progress
    renderWordProgress(words);
  }

  function renderBadges(stats) {
    const container = document.getElementById('badges-list');
    container.innerHTML = BADGES.map(badge => {
      const earned = badge.condition(stats);
      return `
        <div class="badge ${earned ? '' : 'locked'}" title="${badge.name}">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-name">${badge.name}</div>
        </div>`;
    }).join('');
  }

  function renderWordProgress(words) {
    const container = document.getElementById('progress-words');

    if (words.length === 0) {
      container.innerHTML = '<p class="no-words-msg">Add words to see progress here!</p>';
      return;
    }

    container.innerHTML = words.map(w => {
      const stars = ProgressData.getWordStars(w.id);
      return `
        <div class="word-progress-item">
          <span class="wp-word">${escapeHtml(w.word)}</span>
          <div class="wp-stars">
            <div class="wp-star-group">
              <span class="wp-star-group-label">Spell</span>
              <span class="wp-star-group-stars">${renderStars(stars.spelling, 3)}</span>
            </div>
            <div class="wp-star-group">
              <span class="wp-star-group-label">Type</span>
              <span class="wp-star-group-stars">${renderStars(stars.pos, 3)}</span>
            </div>
            <div class="wp-star-group">
              <span class="wp-star-group-label">Sent</span>
              <span class="wp-star-group-stars">${renderStars(stars.sentences, 3)}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderStars(count, max) {
    let html = '';
    for (let i = 0; i < max; i++) {
      html += i < count ? '⭐' : '☆';
    }
    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
