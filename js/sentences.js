// ===== SENTENCES MODULE =====
const Sentences = (() => {
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let results = [];
  let currentWord = null;

  function reset() {
    document.getElementById('sentences-start').classList.remove('hidden');
    document.getElementById('sentences-game').classList.add('hidden');
    document.getElementById('sentences-result').classList.add('hidden');
  }

  function startGame() {
    const allWords = Words.getAll();
    if (allWords.length === 0) {
      alert('Add some words first!');
      App.navigateTo('home');
      return;
    }

    words = shuffleArray([...allWords]);
    currentIndex = 0;
    score = 0;
    results = [];

    document.getElementById('sentences-start').classList.add('hidden');
    document.getElementById('sentences-game').classList.remove('hidden');
    document.getElementById('sentences-result').classList.add('hidden');

    showWord();
  }

  function showWord() {
    if (currentIndex >= words.length) {
      showResults();
      return;
    }

    currentWord = words[currentIndex];

    document.getElementById('sent-progress').textContent =
      `${currentIndex + 1} / ${words.length}`;
    document.getElementById('sent-score').textContent = `Score: ${score}`;

    document.getElementById('sent-word').textContent = currentWord.word;
    document.getElementById('sent-meaning').textContent = currentWord.meaning || '';

    document.getElementById('sent-input').value = '';
    document.getElementById('sent-input').focus();
    document.getElementById('sent-feedback').textContent = '';
    document.getElementById('sent-feedback').className = 'feedback-area';
    document.getElementById('btn-sent-check').classList.remove('hidden');
    document.getElementById('btn-sent-next').classList.add('hidden');
    document.getElementById('btn-sent-example').disabled = false;
    document.getElementById('btn-sent-help').disabled = false;
  }

  function checkSentence() {
    if (!currentWord) return;

    const sentence = document.getElementById('sent-input').value.trim();
    const feedbackEl = document.getElementById('sent-feedback');

    if (!sentence) {
      App.showFeedback(feedbackEl, 'Write a sentence first!', 'info');
      return;
    }

    // Basic validation
    const issues = [];
    const wordLower = currentWord.word.toLowerCase();
    const sentenceLower = sentence.toLowerCase();

    // Check if word is included
    const wordIncluded = sentenceLower.includes(wordLower);
    if (!wordIncluded) {
      issues.push(`Try to use the word "${currentWord.word}" in your sentence!`);
    }

    // Check starts with capital letter
    if (sentence[0] !== sentence[0].toUpperCase()) {
      issues.push('Start with a capital letter!');
    }

    // Check ends with punctuation
    if (!/[.!?]$/.test(sentence)) {
      issues.push('End with a period (.), question mark (?), or exclamation mark (!)');
    }

    // Check minimum length
    if (sentence.split(' ').length < 3) {
      issues.push('Try to write a longer sentence (at least 3 words)!');
    }

    if (issues.length === 0) {
      // Sentence passed basic checks
      score++;
      ProgressData.addStar(currentWord.id, 'sentences');
      results.push({ word: currentWord.word, sentence, correct: true });

      App.showFeedback(feedbackEl, App.randomEncouragement(true), 'correct');

      document.getElementById('btn-sent-check').classList.add('hidden');
      document.getElementById('btn-sent-next').classList.remove('hidden');

      // Try AI review if available
      tryAIReview(currentWord.word, sentence, feedbackEl);
    } else {
      // Show the most important issue
      App.showFeedback(feedbackEl, issues[0], 'wrong');
      document.getElementById('sent-input').classList.add('shake');
      setTimeout(() => document.getElementById('sent-input').classList.remove('shake'), 300);

      if (!wordIncluded) {
        // If word not included, let them try again
        return;
      }

      // If minor issues (punctuation, capitalization), still count it
      results.push({ word: currentWord.word, sentence, correct: false });
      document.getElementById('btn-sent-check').classList.add('hidden');
      document.getElementById('btn-sent-next').classList.remove('hidden');
    }
  }

  async function tryAIReview(word, sentence, feedbackEl) {
    const review = await AI.reviewSentence(word, sentence);
    if (review) {
      feedbackEl.textContent += ' ' + review;
    }
  }

  async function showExample() {
    if (!currentWord) return;
    const btn = document.getElementById('btn-sent-example');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const example = await AI.getSentenceExample(currentWord.word, currentWord.meaning);
    const feedbackEl = document.getElementById('sent-feedback');
    App.showFeedback(feedbackEl, `Example: "${example}"`, 'info');
    btn.textContent = 'Show Example';
    btn.disabled = true;
  }

  async function showHelp() {
    if (!currentWord) return;
    const btn = document.getElementById('btn-sent-help');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const starter = await AI.getSentenceStarter(currentWord.word, currentWord.meaning);
    document.getElementById('sent-input').value = starter;
    document.getElementById('sent-input').focus();
    btn.textContent = 'Help Me Start';
    btn.disabled = true;
  }

  function showResults() {
    document.getElementById('sentences-game').classList.add('hidden');
    document.getElementById('sentences-result').classList.remove('hidden');

    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let title, starsHtml;
    if (percent >= 90) {
      title = 'Sentence Master! 🎉';
      starsHtml = '⭐⭐⭐';
      App.celebrate();
    } else if (percent >= 70) {
      title = 'Great Writing! 🌟';
      starsHtml = '⭐⭐';
    } else if (percent >= 50) {
      title = 'Nice Try! 👏';
      starsHtml = '⭐';
    } else {
      title = 'Keep Writing! 💪';
      starsHtml = '';
    }

    document.getElementById('sent-result-title').textContent = title;
    document.getElementById('sent-result-stars').textContent = starsHtml;
    document.getElementById('sent-result-score').textContent =
      `${correctCount} / ${total} correct (${percent}%)`;

    const detailsEl = document.getElementById('sent-result-details');
    detailsEl.innerHTML = results.map(r => `
      <div class="result-details-item">
        <span class="result-icon">${r.correct ? '✅' : '🔄'}</span>
        <span><b>${r.word}</b>: ${escapeHtml(r.sentence || '(skipped)')}</span>
      </div>
    `).join('');
  }

  // --- Speech Recognition ---
  let recognition = null;
  let isRecording = false;

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.getElementById('btn-sent-mic').style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      document.getElementById('sent-input').value = transcript;
    };

    recognition.onend = () => {
      isRecording = false;
      document.getElementById('btn-sent-mic').classList.remove('recording');
      document.getElementById('btn-sent-mic').textContent = '🎤';
    };

    recognition.onerror = (event) => {
      isRecording = false;
      document.getElementById('btn-sent-mic').classList.remove('recording');
      document.getElementById('btn-sent-mic').textContent = '🎤';
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access to use voice input!');
      }
    };
  }

  function toggleMic() {
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
    } else {
      isRecording = true;
      document.getElementById('btn-sent-mic').classList.add('recording');
      document.getElementById('btn-sent-mic').textContent = '⏹️';
      document.getElementById('sent-input').value = '';
      recognition.start();
    }
  }

  // --- Setup Events ---
  function setupEvents() {
    document.getElementById('btn-sent-start').addEventListener('click', startGame);
    document.getElementById('btn-sent-check').addEventListener('click', checkSentence);
    document.getElementById('btn-sent-example').addEventListener('click', showExample);
    document.getElementById('btn-sent-help').addEventListener('click', showHelp);
    document.getElementById('btn-sent-quit').addEventListener('click', reset);
    document.getElementById('btn-sent-again').addEventListener('click', reset);
    document.getElementById('btn-sent-mic').addEventListener('click', toggleMic);

    document.getElementById('btn-sent-next').addEventListener('click', () => {
      currentIndex++;
      showWord();
    });

    document.getElementById('sent-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const checkBtn = document.getElementById('btn-sent-check');
        const nextBtn = document.getElementById('btn-sent-next');
        if (!checkBtn.classList.contains('hidden')) {
          checkSentence();
        } else if (!nextBtn.classList.contains('hidden')) {
          currentIndex++;
          showWord();
        }
      }
    });

    setupSpeechRecognition();
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
