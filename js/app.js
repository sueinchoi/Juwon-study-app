// ===== APP CONTROLLER =====
const App = (() => {
  let currentScreen = 'home';

  // Encouragement messages
  const CORRECT_MESSAGES = [
    'Amazing job! 🎉', 'You did it! ⭐', 'Wonderful! 🌟',
    'Fantastic! 🎊', 'Superstar! 🌠', 'You\'re getting better! 🌈'
  ];
  const WRONG_MESSAGES = [
    'So close! Try again! 😊', 'Almost there! 🚀', 'Great try! 👏', 'Keep going! 💪'
  ];

  function init() {
    setupNavigation();
    setupSettings();
    navigateTo('home');
    updateStreak();
  }

  // --- Navigation ---
  function setupNavigation() {
    document.querySelectorAll('.nav-btn[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.screen));
    });
    document.querySelector('.nav-title').addEventListener('click', () => navigateTo('home'));
  }

  function navigateTo(screen) {
    currentScreen = screen;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const el = document.getElementById('screen-' + screen);
    if (el) el.classList.add('active');

    const btn = document.querySelector(`.nav-btn[data-screen="${screen}"]`);
    if (btn) btn.classList.add('active');

    // Trigger screen-specific refresh
    if (screen === 'home') Words.render();
    if (screen === 'spelling') Spelling.reset();
    if (screen === 'pos') PartsOfSpeech.reset();
    if (screen === 'sentences') Sentences.reset();
    if (screen === 'challenge') Challenge.reset();
    if (screen === 'progress') Progress.render();
  }

  // --- Settings ---
  function setupSettings() {
    const modal = document.getElementById('settings-modal');
    const lockDiv = document.getElementById('settings-lock');
    const panelDiv = document.getElementById('settings-panel');
    let lockA, lockB;

    document.getElementById('btn-settings').addEventListener('click', () => {
      lockA = Math.floor(Math.random() * 10) + 3;
      lockB = Math.floor(Math.random() * 10) + 3;
      document.getElementById('lock-question').textContent = `${lockA} × ${lockB} = ?`;
      document.getElementById('lock-answer').value = '';
      lockDiv.classList.remove('hidden');
      panelDiv.classList.add('hidden');
      modal.classList.remove('hidden');
    });

    document.getElementById('btn-unlock').addEventListener('click', () => {
      const answer = parseInt(document.getElementById('lock-answer').value);
      if (answer === lockA * lockB) {
        lockDiv.classList.add('hidden');
        panelDiv.classList.remove('hidden');
        // Load current settings
        const settings = getSettings();
        document.getElementById('toggle-ai').checked = settings.aiEnabled;
        document.getElementById('select-ai-provider').value = settings.aiProvider || 'gemini';
        document.getElementById('input-api-key').value = settings.apiKey || '';
        updateApiKeyLabel();
      }
    });

    document.getElementById('select-ai-provider').addEventListener('change', updateApiKeyLabel);

    function updateApiKeyLabel() {
      const provider = document.getElementById('select-ai-provider').value;
      const label = document.getElementById('label-api-key');
      const input = document.getElementById('input-api-key');
      if (provider === 'gemini') {
        label.textContent = 'Gemini API Key';
        input.placeholder = 'AIza...';
      } else {
        label.textContent = 'Claude API Key';
        input.placeholder = 'sk-ant-...';
      }
    }

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      const settings = {
        aiEnabled: document.getElementById('toggle-ai').checked,
        aiProvider: document.getElementById('select-ai-provider').value,
        apiKey: document.getElementById('input-api-key').value.trim()
      };
      localStorage.setItem('jw_settings', JSON.stringify(settings));
      modal.classList.add('hidden');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    document.getElementById('btn-reset-all').addEventListener('click', () => {
      if (confirm('Reset ALL data? This cannot be undone!')) {
        localStorage.removeItem('jw_words');
        localStorage.removeItem('jw_progress');
        localStorage.removeItem('jw_streak');
        localStorage.removeItem('jw_settings');
        location.reload();
      }
    });

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem('jw_settings')) || { aiEnabled: true, aiProvider: 'gemini', apiKey: '' };
    } catch { return { aiEnabled: true, aiProvider: 'gemini', apiKey: '' }; }
  }

  // --- Streak ---
  function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    let streak = JSON.parse(localStorage.getItem('jw_streak') || '{"lastDate":"","count":0}');
    if (streak.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (streak.lastDate === yesterday) {
        streak.count++;
      } else if (streak.lastDate !== today) {
        streak.count = 1;
      }
      streak.lastDate = today;
      localStorage.setItem('jw_streak', JSON.stringify(streak));
    }
    return streak.count;
  }

  function getStreak() {
    const streak = JSON.parse(localStorage.getItem('jw_streak') || '{"lastDate":"","count":0}');
    return streak.count;
  }

  // --- Helpers ---
  function randomEncouragement(correct) {
    if (correct) {
      return CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
    }
    return WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
  }

  function showFeedback(el, message, type) {
    el.textContent = message;
    el.className = 'feedback-area ' + type;
    el.classList.add('bounce');
    setTimeout(() => el.classList.remove('bounce'), 300);
  }

  function celebrate() {
    const container = document.getElementById('celebration');
    container.classList.remove('hidden');
    container.innerHTML = '';
    const colors = ['#4CAF50', '#FF9800', '#42A5F5', '#F06292', '#AB47BC', '#FFD54F'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      confetti.style.width = (6 + Math.random() * 8) + 'px';
      confetti.style.height = (6 + Math.random() * 8) + 'px';
      container.appendChild(confetti);
    }
    setTimeout(() => {
      container.classList.add('hidden');
      container.innerHTML = '';
    }, 2000);
  }

  function speak(word) {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = 'en-US';
      utter.rate = 0.8;
      speechSynthesis.speak(utter);
    }
  }

  return {
    init, navigateTo, getSettings, getStreak, updateStreak,
    randomEncouragement, showFeedback, celebrate, speak
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
