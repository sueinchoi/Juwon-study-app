// ===== CHALLENGE MODULE (종합 시험) =====
const Challenge = (() => {
  let words = [];
  let currentIndex = 0;
  let phase = ''; // 'spelling', 'pos', 'sentences'
  let results = { spelling: [], pos: [], sentences: [] };
  let currentWord = null;
  let retryMode = false;
  let retryWords = [];

  const PHASES = [
    { key: 'spelling', label: 'Spelling', icon: '✏️', kr: '받아쓰기' },
    { key: 'pos', label: 'Word Types', icon: '🏷️', kr: '품사' },
    { key: 'sentences', label: 'Sentences', icon: '💬', kr: '문장 만들기' }
  ];

  function reset() {
    document.getElementById('challenge-start').classList.remove('hidden');
    document.getElementById('challenge-game').classList.add('hidden');
    document.getElementById('challenge-result').classList.add('hidden');
    document.getElementById('challenge-phase-intro').classList.add('hidden');
  }

  function startChallenge() {
    const allWords = Words.getAll();
    const wordsWithPOS = allWords.filter(w => w.pos && ['noun', 'verb', 'adjective', 'adverb'].includes(w.pos));

    if (wordsWithPOS.length < 3) {
      // Try to assign POS via fallback
      allWords.filter(w => !w.pos).forEach(w => {
        const fallbackPOS = AI.getFallbackPOS(w.word);
        if (fallbackPOS) {
          Words.update(w.id, { pos: fallbackPOS });
          w.pos = fallbackPOS;
        }
      });
      const updated = Words.getAll().filter(w => w.pos && ['noun', 'verb', 'adjective', 'adverb'].includes(w.pos));
      if (updated.length < 3) {
        alert('Need at least 3 words with word types. Use the AI help button (🤖) on each word first!');
        App.navigateTo('home');
        return;
      }
    }

    words = shuffleArray([...wordsWithPOS]);
    retryMode = false;
    retryWords = [];
    results = { spelling: [], pos: [], sentences: [] };

    document.getElementById('challenge-start').classList.add('hidden');
    startPhase('spelling');
  }

  function startRetry() {
    // Collect wrong words from all phases
    const wrongIds = new Set();
    for (const key in results) {
      results[key].filter(r => !r.correct).forEach(r => wrongIds.add(r.wordId));
    }
    const allWords = Words.getAll();
    retryWords = allWords.filter(w => wrongIds.has(w.id));

    if (retryWords.length === 0) return;

    words = shuffleArray([...retryWords]);
    retryMode = true;
    results = { spelling: [], pos: [], sentences: [] };

    startPhase('spelling');
  }

  // ===== PHASE MANAGEMENT =====
  function startPhase(phaseKey) {
    phase = phaseKey;
    currentIndex = 0;

    const info = PHASES.find(p => p.key === phaseKey);

    // Show phase intro
    document.getElementById('challenge-game').classList.add('hidden');
    document.getElementById('challenge-result').classList.add('hidden');
    document.getElementById('challenge-phase-intro').classList.remove('hidden');
    document.getElementById('challenge-phase-icon').textContent = info.icon;
    document.getElementById('challenge-phase-title').textContent = `${info.label} (${info.kr})`;
    document.getElementById('challenge-phase-count').textContent =
      `${words.length} words`;

    // Auto-advance after 1.5s
    setTimeout(() => {
      document.getElementById('challenge-phase-intro').classList.add('hidden');
      document.getElementById('challenge-game').classList.remove('hidden');
      showCurrentQuestion();
    }, 1500);
  }

  function nextPhase() {
    if (phase === 'spelling') {
      startPhase('pos');
    } else if (phase === 'pos') {
      startPhase('sentences');
    } else {
      showFinalResults();
    }
  }

  // ===== QUESTION DISPLAY =====
  function showCurrentQuestion() {
    if (currentIndex >= words.length) {
      nextPhase();
      return;
    }

    currentWord = words[currentIndex];
    const gameArea = document.getElementById('challenge-game-area');
    const phaseInfo = PHASES.find(p => p.key === phase);

    // Update header
    document.getElementById('challenge-progress').textContent =
      `${phaseInfo.icon} ${currentIndex + 1} / ${words.length}`;

    if (phase === 'spelling') showSpellingQuestion(gameArea);
    else if (phase === 'pos') showPOSQuestion(gameArea);
    else if (phase === 'sentences') showSentenceQuestion(gameArea);
  }

  // ===== SPELLING =====
  function showSpellingQuestion(area) {
    area.innerHTML = `
      <div class="meaning-display">${escapeHtml(currentWord.meaning || currentWord.word)}</div>
      <button class="btn-speak" id="ch-speak" title="Listen">🔊</button>
      <div id="ch-spell-boxes" class="letter-boxes"></div>
      <input type="text" id="ch-spell-input" class="spell-hidden-input" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="game-buttons">
        <button id="ch-check" class="btn btn-primary">Check</button>
        <button id="ch-next" class="btn btn-primary hidden">Next</button>
      </div>
      <div id="ch-feedback" class="feedback-area"></div>`;

    // Create letter boxes
    const boxesEl = document.getElementById('ch-spell-boxes');
    for (let i = 0; i < currentWord.word.length; i++) {
      const box = document.createElement('div');
      box.className = 'letter-box';
      boxesEl.appendChild(box);
    }

    const input = document.getElementById('ch-spell-input');
    input.maxLength = currentWord.word.length;
    input.value = '';
    input.focus();

    input.addEventListener('input', () => {
      updateSpellBoxes(input.value);
      input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); return; }
      if (e.key === 'Enter') {
        if (!document.getElementById('ch-check').classList.contains('hidden')) checkSpelling();
        else if (!document.getElementById('ch-next').classList.contains('hidden')) advanceQuestion();
      }
    });

    document.getElementById('ch-speak').addEventListener('click', () => App.speak(currentWord.word));
    document.getElementById('ch-check').addEventListener('click', checkSpelling);
    document.getElementById('ch-next').addEventListener('click', advanceQuestion);

    area.addEventListener('click', (e) => {
      if (!e.target.closest('button')) { input.focus(); }
    });
  }

  function updateSpellBoxes(val) {
    const boxes = document.querySelectorAll('#ch-spell-boxes .letter-box');
    const letters = val.toLowerCase().split('');
    boxes.forEach((box, i) => {
      box.textContent = i < letters.length ? letters[i] : '';
      box.classList.toggle('filled', i < letters.length);
      box.classList.remove('correct', 'wrong', 'hint');
    });
  }

  function checkSpelling() {
    const input = document.getElementById('ch-spell-input');
    const answer = input.value.trim().toLowerCase();
    const correct = answer === currentWord.word.toLowerCase();
    const target = currentWord.word.toLowerCase();

    const boxes = document.querySelectorAll('#ch-spell-boxes .letter-box');
    boxes.forEach((box, i) => {
      if (correct) {
        box.textContent = target[i];
        box.classList.add('correct');
      } else {
        box.textContent = target[i] || '';
        box.classList.add(i < answer.length && answer[i] === target[i] ? 'correct' : 'hint');
      }
    });

    const feedbackEl = document.getElementById('ch-feedback');
    if (correct) {
      App.showFeedback(feedbackEl, App.randomEncouragement(true), 'correct');
      App.speak(currentWord.word);
      ProgressData.addStar(currentWord.id, 'spelling');
    } else {
      App.showFeedback(feedbackEl, `The word is "${currentWord.word}"`, 'wrong');
    }

    results.spelling.push({ wordId: currentWord.id, word: currentWord.word, correct });
    document.getElementById('ch-check').classList.add('hidden');
    document.getElementById('ch-next').classList.remove('hidden');
  }

  // ===== PARTS OF SPEECH =====
  function showPOSQuestion(area) {
    area.innerHTML = `
      <div class="word-display">${escapeHtml(currentWord.word)}</div>
      <div class="meaning-sub">${escapeHtml(currentWord.meaning || '')}</div>
      <div class="pos-buttons">
        <button class="btn btn-pos-choice pos-noun" data-pos="noun">🧸 Noun</button>
        <button class="btn btn-pos-choice pos-verb" data-pos="verb">🏃 Verb</button>
        <button class="btn btn-pos-choice pos-adjective" data-pos="adjective">🌈 Adjective</button>
        <button class="btn btn-pos-choice pos-adverb" data-pos="adverb">💨 Adverb</button>
      </div>
      <div id="ch-feedback" class="feedback-area"></div>
      <button id="ch-next" class="btn btn-primary hidden" style="margin-top:12px;">Next</button>`;

    area.querySelectorAll('.btn-pos-choice').forEach(btn => {
      btn.addEventListener('click', () => checkPOS(btn.dataset.pos));
    });
    document.getElementById('ch-next').addEventListener('click', advanceQuestion);
  }

  function checkPOS(chosen) {
    const correct = chosen === currentWord.pos;
    const feedbackEl = document.getElementById('ch-feedback');

    document.querySelectorAll('#challenge-game-area .btn-pos-choice').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.pos === currentWord.pos) btn.classList.add('correct');
      if (btn.dataset.pos === chosen && !correct) btn.classList.add('wrong');
    });

    if (correct) {
      App.showFeedback(feedbackEl, App.randomEncouragement(true), 'correct');
      ProgressData.addStar(currentWord.id, 'pos');
    } else {
      App.showFeedback(feedbackEl,
        `"${currentWord.word}" is a ${currentWord.pos}`, 'wrong');
    }

    results.pos.push({ wordId: currentWord.id, word: currentWord.word, correct, correctPOS: currentWord.pos });
    document.getElementById('ch-next').classList.remove('hidden');
  }

  // ===== SENTENCES =====
  function showSentenceQuestion(area) {
    area.innerHTML = `
      <div class="word-display">${escapeHtml(currentWord.word)}</div>
      <div class="meaning-sub">${escapeHtml(currentWord.meaning || '')}</div>
      <div class="sentence-input-wrapper">
        <textarea id="ch-sent-input" class="sentence-input" placeholder="Write a sentence using this word..." rows="3"></textarea>
        <button id="ch-sent-mic" class="btn-mic" title="Speak">🎤</button>
      </div>
      <div class="game-buttons">
        <button id="ch-check" class="btn btn-primary">Check</button>
        <button id="ch-next" class="btn btn-primary hidden">Next</button>
      </div>
      <div id="ch-feedback" class="feedback-area"></div>`;

    document.getElementById('ch-check').addEventListener('click', checkSentence);
    document.getElementById('ch-next').addEventListener('click', advanceQuestion);

    const input = document.getElementById('ch-sent-input');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!document.getElementById('ch-check').classList.contains('hidden')) checkSentence();
        else if (!document.getElementById('ch-next').classList.contains('hidden')) advanceQuestion();
      }
    });

    // Mic support
    setupChallengeMic();
  }

  function checkSentence() {
    const sentence = document.getElementById('ch-sent-input').value.trim();
    const feedbackEl = document.getElementById('ch-feedback');

    if (!sentence) {
      App.showFeedback(feedbackEl, 'Write a sentence first!', 'info');
      return;
    }

    const wordLower = currentWord.word.toLowerCase();
    const sentenceLower = sentence.toLowerCase();
    const issues = [];

    if (!sentenceLower.includes(wordLower)) {
      issues.push(`Use the word "${currentWord.word}" in your sentence!`);
    }
    if (sentence[0] !== sentence[0].toUpperCase()) {
      issues.push('Start with a capital letter!');
    }
    if (!/[.!?]$/.test(sentence)) {
      issues.push('End with . ? or !');
    }
    if (sentence.split(' ').length < 3) {
      issues.push('Write at least 3 words!');
    }

    const correct = issues.length === 0;

    if (correct) {
      App.showFeedback(feedbackEl, App.randomEncouragement(true), 'correct');
      ProgressData.addStar(currentWord.id, 'sentences');
    } else {
      App.showFeedback(feedbackEl, issues[0], 'wrong');
      if (!sentenceLower.includes(wordLower)) return; // Let them retry
    }

    results.sentences.push({ wordId: currentWord.id, word: currentWord.word, correct, sentence });
    document.getElementById('ch-check').classList.add('hidden');
    document.getElementById('ch-next').classList.remove('hidden');
  }

  // ===== MIC FOR SENTENCES =====
  let chRecognition = null;
  let chIsRecording = false;

  function setupChallengeMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.getElementById('ch-sent-mic');
    if (!SpeechRecognition) { micBtn.style.display = 'none'; return; }

    if (!chRecognition) {
      chRecognition = new SpeechRecognition();
      chRecognition.lang = 'en-US';
      chRecognition.interimResults = true;
      chRecognition.continuous = false;

      chRecognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        const input = document.getElementById('ch-sent-input');
        if (input) input.value = transcript;
      };
      chRecognition.onend = () => {
        chIsRecording = false;
        const btn = document.getElementById('ch-sent-mic');
        if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤'; }
      };
      chRecognition.onerror = () => {
        chIsRecording = false;
        const btn = document.getElementById('ch-sent-mic');
        if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤'; }
      };
    }

    micBtn.addEventListener('click', () => {
      if (chIsRecording) {
        chRecognition.stop();
      } else {
        chIsRecording = true;
        micBtn.classList.add('recording');
        micBtn.textContent = '⏹️';
        document.getElementById('ch-sent-input').value = '';
        chRecognition.start();
      }
    });
  }

  // ===== NAVIGATION =====
  function advanceQuestion() {
    currentIndex++;
    showCurrentQuestion();
  }

  // ===== FINAL RESULTS =====
  function showFinalResults() {
    document.getElementById('challenge-game').classList.add('hidden');
    document.getElementById('challenge-result').classList.remove('hidden');

    const spellCorrect = results.spelling.filter(r => r.correct).length;
    const posCorrect = results.pos.filter(r => r.correct).length;
    const sentCorrect = results.sentences.filter(r => r.correct).length;
    const total = results.spelling.length + results.pos.length + results.sentences.length;
    const totalCorrect = spellCorrect + posCorrect + sentCorrect;
    const percent = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

    // Count unique wrong words
    const wrongIds = new Set();
    for (const key in results) {
      results[key].filter(r => !r.correct).forEach(r => wrongIds.add(r.wordId));
    }

    let title, starsHtml;
    if (percent >= 90) {
      title = 'Champion! 🏆';
      starsHtml = '⭐⭐⭐';
      App.celebrate();
    } else if (percent >= 70) {
      title = 'Great Job! 🌟';
      starsHtml = '⭐⭐';
    } else if (percent >= 50) {
      title = 'Good Try! 👏';
      starsHtml = '⭐';
    } else {
      title = 'Keep Going! 💪';
      starsHtml = '';
    }

    document.getElementById('ch-result-title').textContent =
      retryMode ? 'Retry Results!' : title;
    document.getElementById('ch-result-stars').textContent = starsHtml;
    document.getElementById('ch-result-score').textContent =
      `${totalCorrect} / ${total} correct (${percent}%)`;

    // Breakdown table
    const breakdown = document.getElementById('ch-result-breakdown');
    breakdown.innerHTML = `
      <div class="ch-breakdown-row">
        <span class="ch-breakdown-label">✏️ Spelling</span>
        <span class="ch-breakdown-score">${spellCorrect} / ${results.spelling.length}</span>
      </div>
      <div class="ch-breakdown-row">
        <span class="ch-breakdown-label">🏷️ Word Types</span>
        <span class="ch-breakdown-score">${posCorrect} / ${results.pos.length}</span>
      </div>
      <div class="ch-breakdown-row">
        <span class="ch-breakdown-label">💬 Sentences</span>
        <span class="ch-breakdown-score">${sentCorrect} / ${results.sentences.length}</span>
      </div>`;

    // Details per word
    const details = document.getElementById('ch-result-details');
    const wordMap = {};
    for (const key in results) {
      results[key].forEach(r => {
        if (!wordMap[r.wordId]) wordMap[r.wordId] = { word: r.word, spelling: null, pos: null, sentences: null };
        wordMap[r.wordId][key] = r.correct;
      });
    }

    details.innerHTML = Object.values(wordMap).map(w => `
      <div class="result-details-item">
        <span class="wp-word" style="min-width:80px;">${escapeHtml(w.word)}</span>
        <span title="Spelling">${w.spelling ? '✅' : '❌'} ✏️</span>
        <span title="Word Type">${w.pos ? '✅' : '❌'} 🏷️</span>
        <span title="Sentence">${w.sentences ? '✅' : '❌'} 💬</span>
      </div>
    `).join('');

    // Retry button
    const retryBtn = document.getElementById('btn-ch-retry');
    if (wrongIds.size > 0) {
      retryBtn.classList.remove('hidden');
      retryBtn.textContent = `Retry Wrong Ones (${wrongIds.size} words)`;
    } else {
      retryBtn.classList.add('hidden');
    }
  }

  // ===== SETUP =====
  function setupEvents() {
    document.getElementById('btn-ch-start').addEventListener('click', startChallenge);
    document.getElementById('btn-ch-quit').addEventListener('click', reset);
    document.getElementById('btn-ch-again').addEventListener('click', reset);
    document.getElementById('btn-ch-retry').addEventListener('click', startRetry);
  }

  document.addEventListener('DOMContentLoaded', setupEvents);

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { reset };
})();
