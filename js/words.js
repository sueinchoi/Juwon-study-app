// ===== WORD MANAGEMENT =====
const Words = (() => {
  const STORAGE_KEY = 'jw_words';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function save(words) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }

  function add(word, meaning) {
    word = word.trim().toLowerCase();
    meaning = meaning.trim();
    if (!word) return false;

    const words = getAll();
    // Check duplicate
    if (words.some(w => w.word === word)) return false;

    words.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      word,
      meaning: meaning || '',
      pos: '',        // part of speech
      example: '',    // example sentence
      dateAdded: new Date().toISOString()
    });
    save(words);
    return true;
  }

  function update(id, updates) {
    const words = getAll();
    const idx = words.findIndex(w => w.id === id);
    if (idx === -1) return;
    Object.assign(words[idx], updates);
    save(words);
  }

  function remove(id) {
    const words = getAll().filter(w => w.id !== id);
    save(words);
    // Also clean up progress for this word
    ProgressData.removeWord(id);
  }

  function getById(id) {
    return getAll().find(w => w.id === id);
  }

  // --- Rendering ---
  function render() {
    const words = getAll();
    const list = document.getElementById('word-list');
    const countEl = document.getElementById('word-count');

    countEl.textContent = words.length > 0
      ? `${words.length} word${words.length !== 1 ? 's' : ''}`
      : '';

    if (words.length === 0) {
      list.innerHTML = `
        <div class="no-words-msg">
          <span class="big-emoji">📝</span>
          Add some words to get started!
        </div>`;
      return;
    }

    list.innerHTML = words.map(w => {
      const stars = ProgressData.getWordStars(w.id);
      const totalStars = stars.spelling + stars.pos + stars.sentences;
      const starDisplay = totalStars > 0 ? '⭐'.repeat(Math.min(totalStars, 9)) : '';
      const posTag = w.pos ? `<span class="word-card-pos ${w.pos}">${w.pos}</span>` : '';

      return `
        <div class="word-card" data-id="${w.id}">
          <div class="word-card-text">
            <div class="word-card-word">${escapeHtml(w.word)} ${posTag}</div>
            <div class="word-card-meaning">${escapeHtml(w.meaning || '(no meaning yet)')}</div>
            ${starDisplay ? `<div class="word-card-stars">${starDisplay}</div>` : ''}
          </div>
          <div class="word-card-actions">
            <button onclick="Words.onAiHelp('${w.id}')" title="AI Help">🤖</button>
            <button onclick="Words.onEdit('${w.id}')" title="Edit">✏️</button>
            <button onclick="Words.onDelete('${w.id}')" title="Delete">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  // --- Event Handlers ---
  function setupEvents() {
    document.getElementById('btn-add-word').addEventListener('click', onAddWord);
    document.getElementById('input-word').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const meaningInput = document.getElementById('input-meaning');
        if (!meaningInput.value.trim()) {
          meaningInput.focus();
        } else {
          onAddWord();
        }
      }
    });
    document.getElementById('input-meaning').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onAddWord();
    });

    // Bulk mode
    document.getElementById('btn-bulk-mode').addEventListener('click', () => {
      document.getElementById('bulk-input-section').classList.toggle('hidden');
    });
    document.getElementById('btn-bulk-cancel').addEventListener('click', () => {
      document.getElementById('bulk-input-section').classList.add('hidden');
    });
    document.getElementById('btn-bulk-add').addEventListener('click', onBulkAdd);
  }

  function onAddWord() {
    const wordInput = document.getElementById('input-word');
    const meaningInput = document.getElementById('input-meaning');
    const word = wordInput.value.trim();
    const meaning = meaningInput.value.trim();

    if (!word) { wordInput.focus(); return; }

    if (add(word, meaning)) {
      wordInput.value = '';
      meaningInput.value = '';
      wordInput.focus();
      render();
    } else {
      wordInput.classList.add('shake');
      setTimeout(() => wordInput.classList.remove('shake'), 300);
    }
  }

  function onBulkAdd() {
    const textarea = document.getElementById('textarea-bulk');
    const lines = textarea.value.split('\n').filter(l => l.trim());
    let added = 0;

    lines.forEach(line => {
      // Support formats: "word, meaning" or "word - meaning" or just "word"
      let word, meaning;
      if (line.includes(',')) {
        [word, ...meaning] = line.split(',');
        meaning = meaning.join(',').trim();
      } else if (line.includes(' - ')) {
        [word, ...meaning] = line.split(' - ');
        meaning = meaning.join(' - ').trim();
      } else {
        word = line.trim();
        meaning = '';
      }
      if (add(word, meaning)) added++;
    });

    if (added > 0) {
      textarea.value = '';
      document.getElementById('bulk-input-section').classList.add('hidden');
      render();
    }
  }

  function onEdit(id) {
    const word = getById(id);
    if (!word) return;

    // Remove any existing edit modal
    const existing = document.querySelector('.edit-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
      <div class="edit-form">
        <h3>Edit Word</h3>
        <input type="text" class="input-field" id="edit-word" value="${escapeHtml(word.word)}">
        <input type="text" class="input-field" id="edit-meaning" value="${escapeHtml(word.meaning)}" placeholder="뜻 (meaning)">
        <select class="input-field" id="edit-pos">
          <option value="">Part of speech...</option>
          <option value="noun" ${word.pos === 'noun' ? 'selected' : ''}>Noun (명사)</option>
          <option value="verb" ${word.pos === 'verb' ? 'selected' : ''}>Verb (동사)</option>
          <option value="adjective" ${word.pos === 'adjective' ? 'selected' : ''}>Adjective (형용사)</option>
          <option value="adverb" ${word.pos === 'adverb' ? 'selected' : ''}>Adverb (부사)</option>
        </select>
        <div class="edit-form-buttons">
          <button class="btn btn-primary" id="edit-save">Save</button>
          <button class="btn btn-secondary" id="edit-cancel">Cancel</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    modal.querySelector('#edit-save').addEventListener('click', () => {
      update(id, {
        word: modal.querySelector('#edit-word').value.trim().toLowerCase(),
        meaning: modal.querySelector('#edit-meaning').value.trim(),
        pos: modal.querySelector('#edit-pos').value
      });
      modal.remove();
      render();
    });

    modal.querySelector('#edit-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  function onDelete(id) {
    const word = getById(id);
    if (!word) return;
    if (confirm(`Delete "${word.word}"?`)) {
      remove(id);
      render();
    }
  }

  async function onAiHelp(id) {
    const word = getById(id);
    if (!word) return;

    // Show loading on the button
    const card = document.querySelector('.word-card[data-id="' + id + '"]');
    const aiBtn = card ? card.querySelector('[title="AI Help"]') : null;
    if (aiBtn) {
      aiBtn.textContent = '⏳';
      aiBtn.disabled = true;
    }

    // Start with current word data
    let result = { meaning: word.meaning || '', pos: word.pos || '', example: word.example || '' };
    let aiSource = 'none';

    // 1) Always try built-in dictionary first (instant, no API needed)
    if (typeof AI !== 'undefined' && AI.lookupDict) {
      const dictResult = AI.lookupDict(word.word);
      if (dictResult) {
        if (dictResult.meaning) result.meaning = result.meaning || dictResult.meaning;
        if (dictResult.pos) result.pos = result.pos || dictResult.pos;
        if (dictResult.example) result.example = result.example || dictResult.example;
        aiSource = 'dict';
      }
    }

    // 2) Try API for richer data or words not in dictionary
    if (typeof AI !== 'undefined' && AI.getWordInfo) {
      try {
        const aiResult = await AI.getWordInfo(word.word);
        if (aiResult) {
          if (aiResult.meaning) result.meaning = aiResult.meaning;
          if (aiResult.pos) result.pos = aiResult.pos;
          if (aiResult.example) result.example = aiResult.example;
          if (aiResult.meaning || aiResult.pos || aiResult.example) {
            aiSource = aiSource === 'dict' ? 'dict' : 'api';
          }
        }
      } catch (err) {
        console.error('AI help error:', err);
      }
    }

    // 3) Try morphological guessing as last resort
    if (!result.pos && typeof AI !== 'undefined' && AI.getFallbackPOS) {
      result.pos = AI.getFallbackPOS(word.word);
      if (result.pos) aiSource = aiSource || 'guess';
    }

    // Restore button
    if (aiBtn) { aiBtn.textContent = '🤖'; aiBtn.disabled = false; }

    // Check if we got any new data
    const hasNew = (result.meaning && result.meaning !== word.meaning) ||
                   (result.pos && result.pos !== word.pos) ||
                   (result.example && result.example !== word.example);

    if (hasNew) {
      update(id, { meaning: result.meaning, pos: result.pos, example: result.example });
      render();
      // Show success toast
      showToast(aiSource === 'dict'
        ? `"${word.word}" 정보를 자동으로 채웠어요! 📚`
        : `"${word.word}" 정보를 AI가 채웠어요! 🤖`);
      return;
    }

    // All data already filled — show confirmation
    if (word.meaning && word.pos && word.example) {
      showToast(`"${word.word}" 정보가 이미 모두 채워져 있어요! ✅`);
      return;
    }

    // Could not get data — show helpful message then edit dialog
    showToast('AI에 연결할 수 없어요. 직접 입력해주세요! ✏️');
    openAiEditDialog(id, result);
  }

  function showToast(message) {
    const existing = document.querySelector('.ai-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function openAiEditDialog(id, prefill) {
    const word = getById(id);
    if (!word) return;

    const existing = document.querySelector('.edit-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
      <div class="edit-form">
        <h3>📝 ${escapeHtml(word.word)}</h3>
        <p style="color:#E65100;font-size:0.85rem;margin-bottom:12px;">⚠️ AI 연결 안 됨 — Settings에서 Gemini API 키를 설정하세요</p>
        <label style="font-size:0.85rem;font-weight:700;">뜻 (Meaning)</label>
        <input type="text" class="input-field" id="ai-edit-meaning" value="${escapeHtml(prefill.meaning)}" placeholder="예: 사과, 달리다...">
        <label style="font-size:0.85rem;font-weight:700;margin-top:8px;display:block;">품사 (Part of Speech)</label>
        <select class="input-field" id="ai-edit-pos">
          <option value="">Choose...</option>
          <option value="noun" ${prefill.pos === 'noun' ? 'selected' : ''}>🧸 Noun (명사)</option>
          <option value="verb" ${prefill.pos === 'verb' ? 'selected' : ''}>🏃 Verb (동사)</option>
          <option value="adjective" ${prefill.pos === 'adjective' ? 'selected' : ''}>🌈 Adjective (형용사)</option>
          <option value="adverb" ${prefill.pos === 'adverb' ? 'selected' : ''}>💨 Adverb (부사)</option>
        </select>
        <label style="font-size:0.85rem;font-weight:700;margin-top:8px;display:block;">예문 (Example)</label>
        <input type="text" class="input-field" id="ai-edit-example" value="${escapeHtml(prefill.example)}" placeholder="예: I eat an apple.">
        <div class="edit-form-buttons">
          <button class="btn btn-primary" id="ai-edit-save">Save</button>
          <button class="btn btn-secondary" id="ai-edit-cancel">Cancel</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    modal.querySelector('#ai-edit-save').addEventListener('click', () => {
      update(id, {
        meaning: modal.querySelector('#ai-edit-meaning').value.trim(),
        pos: modal.querySelector('#ai-edit-pos').value,
        example: modal.querySelector('#ai-edit-example').value.trim()
      });
      modal.remove();
      render();
    });
    modal.querySelector('#ai-edit-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    render();
  });

  return { getAll, getById, add, update, remove, render, onEdit, onDelete, onAiHelp };
})();

// ===== PROGRESS DATA (shared helper) =====
const ProgressData = (() => {
  const KEY = 'jw_progress';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getWordStars(wordId) {
    const all = getAll();
    return all[wordId] || { spelling: 0, pos: 0, sentences: 0 };
  }

  function addStar(wordId, category) {
    const all = getAll();
    if (!all[wordId]) all[wordId] = { spelling: 0, pos: 0, sentences: 0 };
    if (all[wordId][category] < 3) {
      all[wordId][category]++;
      save(all);
      return true;
    }
    return false;
  }

  function removeWord(wordId) {
    const all = getAll();
    delete all[wordId];
    save(all);
  }

  function getTotalStars() {
    const all = getAll();
    let total = 0;
    for (const id in all) {
      total += all[id].spelling + all[id].pos + all[id].sentences;
    }
    return total;
  }

  function getMasteredCount() {
    const all = getAll();
    let count = 0;
    for (const id in all) {
      const s = all[id];
      if (s.spelling >= 3 && s.pos >= 3 && s.sentences >= 3) count++;
    }
    return count;
  }

  return { getAll, getWordStars, addStar, removeWord, getTotalStars, getMasteredCount };
})();
