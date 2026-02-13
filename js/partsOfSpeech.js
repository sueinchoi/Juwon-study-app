// ===== PARTS OF SPEECH MODULE =====
const PartsOfSpeech = (() => {
  let words = [];
  let currentIndex = 0;
  let score = 0;
  let results = [];
  let currentWord = null;
  let answered = false;

  const POS_INFO = {
    noun: { icon: '🧸', label: 'Noun', kr: '명사', desc: 'A person, place, or thing', color: '#4CAF50' },
    verb: { icon: '🏃', label: 'Verb', kr: '동사', desc: 'An action word', color: '#42A5F5' },
    adjective: { icon: '🌈', label: 'Adjective', kr: '형용사', desc: 'Describes a noun', color: '#FF9800' },
    adverb: { icon: '💨', label: 'Adverb', kr: '부사', desc: 'Describes a verb', color: '#AB47BC' }
  };

  function reset() {
    document.getElementById('pos-start').classList.remove('hidden');
    document.getElementById('pos-learn').classList.add('hidden');
    document.getElementById('pos-quiz').classList.add('hidden');
    document.getElementById('pos-result').classList.add('hidden');
  }

  function showLearn() {
    document.getElementById('pos-start').classList.add('hidden');
    document.getElementById('pos-learn').classList.remove('hidden');
  }

  function startQuiz() {
    const allWords = Words.getAll();
    // Filter words that have a POS assigned
    const wordsWithPOS = allWords.filter(w => w.pos && ['noun', 'verb', 'adjective', 'adverb'].includes(w.pos));

    if (wordsWithPOS.length < 3) {
      // If not enough words have POS, try AI fallback to assign POS
      const wordsNeedingPOS = allWords.filter(w => !w.pos);
      wordsNeedingPOS.forEach(w => {
        const fallbackPOS = AI.getFallbackPOS(w.word);
        if (fallbackPOS) {
          Words.update(w.id, { pos: fallbackPOS });
          w.pos = fallbackPOS;
        }
      });

      // Recheck
      const updated = Words.getAll().filter(w => w.pos && ['noun', 'verb', 'adjective', 'adverb'].includes(w.pos));
      if (updated.length < 3) {
        alert('Need at least 3 words with word types. Use the AI help button (🤖) on each word to set them, or edit words manually!');
        App.navigateTo('home');
        return;
      }
      words = shuffleArray([...updated]);
    } else {
      words = shuffleArray([...wordsWithPOS]);
    }

    currentIndex = 0;
    score = 0;
    results = [];
    answered = false;

    document.getElementById('pos-start').classList.add('hidden');
    document.getElementById('pos-learn').classList.add('hidden');
    document.getElementById('pos-quiz').classList.remove('hidden');
    document.getElementById('pos-result').classList.add('hidden');

    showQuestion();
  }

  function showQuestion() {
    if (currentIndex >= words.length) {
      showResults();
      return;
    }

    currentWord = words[currentIndex];
    answered = false;

    document.getElementById('pos-progress').textContent =
      `${currentIndex + 1} / ${words.length}`;
    document.getElementById('pos-score').textContent = `Score: ${score}`;

    document.getElementById('pos-word').textContent = currentWord.word;
    document.getElementById('pos-meaning').textContent = currentWord.meaning || '';

    // Reset buttons
    document.querySelectorAll('.btn-pos-choice').forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('correct', 'wrong', 'selected');
    });

    document.getElementById('pos-feedback').textContent = '';
    document.getElementById('pos-feedback').className = 'feedback-area';
    document.getElementById('btn-pos-next').classList.add('hidden');
  }

  function handleChoice(chosenPOS) {
    if (answered) return;
    answered = true;

    const correct = chosenPOS === currentWord.pos;
    const feedbackEl = document.getElementById('pos-feedback');

    // Highlight buttons
    document.querySelectorAll('.btn-pos-choice').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.pos === currentWord.pos) {
        btn.classList.add('correct');
      }
      if (btn.dataset.pos === chosenPOS && !correct) {
        btn.classList.add('wrong');
      }
    });

    if (correct) {
      score++;
      const info = POS_INFO[currentWord.pos];
      App.showFeedback(feedbackEl,
        `${App.randomEncouragement(true)} "${currentWord.word}" is a ${info.label} (${info.kr}) - ${info.desc}!`,
        'correct'
      );
      ProgressData.addStar(currentWord.id, 'pos');
    } else {
      const correctInfo = POS_INFO[currentWord.pos];
      App.showFeedback(feedbackEl,
        `${App.randomEncouragement(false)} "${currentWord.word}" is a ${correctInfo.label} (${correctInfo.kr})`,
        'wrong'
      );
    }

    results.push({ word: currentWord.word, correct, correctPOS: currentWord.pos, chosenPOS });
    document.getElementById('btn-pos-next').classList.remove('hidden');
  }

  function showResults() {
    document.getElementById('pos-quiz').classList.add('hidden');
    document.getElementById('pos-result').classList.remove('hidden');

    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let title, starsHtml;
    if (percent >= 90) {
      title = 'Word Type Master! 🎉';
      starsHtml = '⭐⭐⭐';
      App.celebrate();
    } else if (percent >= 70) {
      title = 'Great Job! 🌟';
      starsHtml = '⭐⭐';
    } else if (percent >= 50) {
      title = 'Good Try! 👏';
      starsHtml = '⭐';
    } else {
      title = 'Keep Learning! 💪';
      starsHtml = '';
    }

    document.getElementById('pos-result-title').textContent = title;
    document.getElementById('pos-result-stars').textContent = starsHtml;
    document.getElementById('pos-result-score').textContent =
      `${correctCount} / ${total} correct (${percent}%)`;

    const detailsEl = document.getElementById('pos-result-details');
    detailsEl.innerHTML = results.map(r => {
      const info = POS_INFO[r.correctPOS];
      return `
        <div class="result-details-item">
          <span class="result-icon">${r.correct ? '✅' : '🔄'}</span>
          <span>${r.word} → ${info.icon} ${info.label}</span>
        </div>`;
    }).join('');
  }

  // --- Setup Events ---
  function setupEvents() {
    document.getElementById('btn-pos-learn').addEventListener('click', showLearn);
    document.getElementById('btn-pos-quiz').addEventListener('click', startQuiz);
    document.getElementById('btn-pos-start-quiz').addEventListener('click', startQuiz);
    document.getElementById('btn-pos-quit').addEventListener('click', reset);
    document.getElementById('btn-pos-again').addEventListener('click', reset);

    document.querySelectorAll('.btn-pos-choice').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn.dataset.pos));
    });

    document.getElementById('btn-pos-next').addEventListener('click', () => {
      currentIndex++;
      showQuestion();
    });
  }

  document.addEventListener('DOMContentLoaded', setupEvents);

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { reset };
})();
