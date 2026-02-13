// ===== SPELLING MODULE =====
const Spelling = (() => {
  let mode = ''; // 'practice' or 'test'
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let hintLevel = 0;
  let results = [];
  let currentWord = null;

  function reset() {
    document.getElementById('spelling-start').classList.remove('hidden');
    document.getElementById('spelling-game').classList.add('hidden');
    document.getElementById('spelling-result').classList.add('hidden');
  }

  function startGame(gameMode) {
    const allWords = Words.getAll();
    if (allWords.length === 0) {
      alert('Add some words first!');
      App.navigateTo('home');
      return;
    }

    mode = gameMode;
    words = shuffleArray([...allWords]);
    currentIndex = 0;
    score = 0;
    results = [];

    document.getElementById('spelling-start').classList.add('hidden');
    document.getElementById('spelling-game').classList.remove('hidden');
    document.getElementById('spelling-result').classList.add('hidden');

    // Hide hint button in test mode
    document.getElementById('btn-spell-hint').classList.toggle('hidden', mode === 'test');

    showWord();
  }

  function showWord() {
    if (currentIndex >= words.length) {
      showResults();
      return;
    }

    currentWord = words[currentIndex];
    hintLevel = 0;

    // Update progress
    document.getElementById('spell-progress').textContent =
      `${currentIndex + 1} / ${words.length}`;
    document.getElementById('spell-score').textContent =
      mode === 'test' ? `Score: ${score}` : '';

    // Show meaning
    document.getElementById('spell-meaning').textContent =
      currentWord.meaning || currentWord.word;

    // Create letter boxes
    const boxesEl = document.getElementById('spell-boxes');
    boxesEl.innerHTML = '';
    for (let i = 0; i < currentWord.word.length; i++) {
      const box = document.createElement('div');
      box.className = 'letter-box';
      boxesEl.appendChild(box);
    }

    // Reset input
    const input = document.getElementById('spell-input');
    input.value = '';
    input.maxLength = currentWord.word.length;
    input.focus();

    // Reset UI
    document.getElementById('spell-hint').textContent = '';
    document.getElementById('spell-feedback').textContent = '';
    document.getElementById('spell-feedback').className = 'feedback-area';
    document.getElementById('btn-spell-check').classList.remove('hidden');
    document.getElementById('btn-spell-next').classList.add('hidden');
    document.getElementById('btn-spell-hint').disabled = false;
  }

  function updateBoxes(input) {
    const boxes = document.querySelectorAll('#spell-boxes .letter-box');
    const letters = input.toLowerCase().split('');

    boxes.forEach((box, i) => {
      if (i < letters.length) {
        box.textContent = letters[i];
        box.classList.add('filled');
      } else {
        box.textContent = '';
        box.classList.remove('filled');
      }
      box.classList.remove('correct', 'wrong', 'hint');
    });
  }

  function checkAnswer() {
    if (!currentWord) return;

    const input = document.getElementById('spell-input');
    const answer = input.value.trim().toLowerCase();
    const correct = answer === currentWord.word.toLowerCase();

    // Show letter-by-letter feedback
    const boxes = document.querySelectorAll('#spell-boxes .letter-box');
    const target = currentWord.word.toLowerCase();

    boxes.forEach((box, i) => {
      if (i < answer.length) {
        box.textContent = answer[i];
        if (answer[i] === target[i]) {
          box.classList.add('correct');
        } else {
          box.classList.add('wrong');
        }
      }
    });

    const feedbackEl = document.getElementById('spell-feedback');

    if (correct) {
      App.showFeedback(feedbackEl, App.randomEncouragement(true), 'correct');
      App.speak(currentWord.word);

      if (mode === 'test') score++;

      // Award star
      ProgressData.addStar(currentWord.id, 'spelling');
      results.push({ word: currentWord.word, correct: true });

      document.getElementById('btn-spell-check').classList.add('hidden');
      document.getElementById('btn-spell-next').classList.remove('hidden');
    } else {
      App.showFeedback(feedbackEl,
        `${App.randomEncouragement(false)} The word is "${currentWord.word}"`,
        'wrong'
      );

      if (mode === 'practice') {
        // In practice mode, let them try again or move on
        results.push({ word: currentWord.word, correct: false });
        document.getElementById('btn-spell-check').classList.add('hidden');
        document.getElementById('btn-spell-next').classList.remove('hidden');

        // Show correct answer in boxes
        boxes.forEach((box, i) => {
          box.textContent = target[i] || '';
          box.classList.remove('wrong');
          box.classList.add(i < answer.length && answer[i] === target[i] ? 'correct' : 'hint');
        });
      } else {
        // Test mode - show answer and move on
        results.push({ word: currentWord.word, correct: false });
        boxes.forEach((box, i) => {
          box.textContent = target[i] || '';
          box.classList.add('hint');
        });
        document.getElementById('btn-spell-check').classList.add('hidden');
        document.getElementById('btn-spell-next').classList.remove('hidden');
      }
    }
  }

  async function showHint() {
    if (!currentWord || mode === 'test') return;

    hintLevel++;
    const hintEl = document.getElementById('spell-hint');
    const word = currentWord.word;

    if (hintLevel === 1) {
      hintEl.textContent = `Starts with "${word[0].toUpperCase()}"`;
    } else if (hintLevel === 2) {
      hintEl.textContent = `${word.length} letters: ${word[0]}${'_'.repeat(word.length - 1)}`;
    } else if (hintLevel >= 3) {
      // AI hint or extended fallback
      hintEl.textContent = 'Thinking...';
      const hint = await AI.getSpellingHint(word, currentWord.meaning);
      hintEl.textContent = hint;
      document.getElementById('btn-spell-hint').disabled = true;
    }
  }

  function showResults() {
    document.getElementById('spelling-game').classList.add('hidden');
    document.getElementById('spelling-result').classList.remove('hidden');

    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Title
    let title, starsHtml;
    if (percent >= 90) {
      title = 'Amazing! 🎉';
      starsHtml = '⭐⭐⭐';
      App.celebrate();
    } else if (percent >= 70) {
      title = 'Great Job! 🌟';
      starsHtml = '⭐⭐';
    } else if (percent >= 50) {
      title = 'Good Try! 👏';
      starsHtml = '⭐';
    } else {
      title = 'Keep Practicing! 💪';
      starsHtml = '';
    }

    document.getElementById('spell-result-title').textContent = title;
    document.getElementById('spell-result-stars').textContent = starsHtml;
    document.getElementById('spell-result-score').textContent =
      `${correctCount} / ${total} correct (${percent}%)`;

    // Details
    const detailsEl = document.getElementById('spell-result-details');
    detailsEl.innerHTML = results.map(r => `
      <div class="result-details-item">
        <span class="result-icon">${r.correct ? '✅' : '🔄'}</span>
        <span>${r.word}</span>
      </div>
    `).join('');
  }

  // --- Setup Events ---
  function setupEvents() {
    document.getElementById('btn-spell-practice').addEventListener('click', () => startGame('practice'));
    document.getElementById('btn-spell-test').addEventListener('click', () => startGame('test'));
    document.getElementById('btn-spell-check').addEventListener('click', checkAnswer);
    document.getElementById('btn-spell-hint').addEventListener('click', showHint);
    document.getElementById('btn-spell-quit').addEventListener('click', reset);
    document.getElementById('btn-spell-again').addEventListener('click', reset);

    document.getElementById('btn-spell-next').addEventListener('click', () => {
      currentIndex++;
      showWord();
    });

    // Hidden input for capturing keystrokes
    const input = document.getElementById('spell-input');
    input.addEventListener('input', () => {
      updateBoxes(input.value);
      // Always keep cursor at end to prevent backspace issues
      input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener('keydown', (e) => {
      // Prevent arrow keys from moving cursor inside hidden input
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        const checkBtn = document.getElementById('btn-spell-check');
        const nextBtn = document.getElementById('btn-spell-next');
        if (!checkBtn.classList.contains('hidden')) {
          checkAnswer();
        } else if (!nextBtn.classList.contains('hidden')) {
          currentIndex++;
          showWord();
        }
      }
    });
    // Click on game card focuses input (but not when clicking buttons)
    document.querySelector('#spelling-game .game-card')?.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const inp = document.getElementById('spell-input');
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });

    // Speak button
    document.getElementById('btn-spell-speak').addEventListener('click', () => {
      if (currentWord) App.speak(currentWord.word);
    });
  }

  document.addEventListener('DOMContentLoaded', setupEvents);

  // --- Helpers ---
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { reset };
})();
