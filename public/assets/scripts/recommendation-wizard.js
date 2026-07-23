'use strict';

const Wizard = (() => {
  let step    = 0;
  let answers = {};

  function getChoicesForStep() {
    const q = QUESTIONS[step];
    if (q.id !== 'cc') return q.choices;

    const budget = answers.budget;

    // Choices dengan 4 opsi CC
    const allChoices = [
      { title:'100 – 150 cc',  sub:'Ideal untuk harian & irit BBM',     value:'kecil1' },
      { title:'150 – 250 cc',  sub:'Harian & performa seimbang',        value:'kecil2' },
      { title:'250 – 600 cc',  sub:'Performa sedang & sport ringan',    value:'sedang' },
      { title:'600 – 1000 cc', sub:'Performa tinggi & touring nyaman', value:'besar' },
    ];

    // Sembunyikan 250-600cc dan 600-1000cc jika budget < 20jt
    if (budget === '20000000') {
      return allChoices.filter(c => c.value !== 'sedang' && c.value !== 'besar');
    }

    return allChoices;
  }

  function getValidAnswerValue(q) {
    const choices = getChoicesForStep();
    const currentAnswer = answers[q.id];

    // Check if current answer is valid for current choices
    const isValid = choices.some(c => c.value === currentAnswer);

    // If budget changed and old answer is no longer valid, reset it
    if (!isValid && currentAnswer !== undefined) {
      answers[q.id] = undefined;
      return undefined;
    }

    return currentAnswer;
  }

  function renderStep() {
    const q = QUESTIONS[step];

    document.getElementById('w-step-label').textContent = q.stepLabel;
    document.getElementById('w-step-pct').textContent   = `${q.pct}% Selesai`;
    document.getElementById('w-progress').style.width   = `${q.pct}%`;
    document.getElementById('w-q-sub').textContent      = q.sub;
    document.getElementById('w-q').textContent          = q.q;
    document.getElementById('w-q-hint').textContent     = q.hint;

    const dotsEl = document.getElementById('w-dots');
    dotsEl.innerHTML = '';
    QUESTIONS.forEach((_, i) => {
      if (i > 0) {
        const line = document.createElement('div');
        line.className = `dot-line${i <= step ? ' done' : ''}`;
        dotsEl.appendChild(line);
      }
      const dot = document.createElement('div');
      dot.className = `dot${i < step ? ' done' : i === step ? ' active' : ''}`;
      dotsEl.appendChild(dot);
    });

    const choicesEl = document.getElementById('w-choices');
    choicesEl.innerHTML = '';
    const choices = getChoicesForStep();
    const currentAnswer = getValidAnswerValue(q);
    choices.forEach((c, i) => {
      const isSelected = currentAnswer === c.value;
      const div = document.createElement('div');
      div.className     = `choice${isSelected ? ' selected' : ''}`;
      div.dataset.index = i;
      div.innerHTML = `
        <div class="choice-title">${c.title}</div>
        <div class="choice-sub">${c.sub}</div>`;
      choicesEl.appendChild(div);
    });

    const isLast  = step === QUESTIONS.length - 1;
    const hasAns  = currentAnswer !== undefined;
    const btnNext = document.getElementById('w-btn-next');

    btnNext.disabled    = !hasAns;
    btnNext.className   = `btn-next${isLast ? ' finish' : ''}`;
    btnNext.textContent = isLast ? 'Lihat Rekomendasi' : 'Selanjutnya →';

    document.getElementById('w-btn-back').style.visibility =
      step === 0 ? 'hidden' : 'visible';
  }

  function selectAnswer(choiceIndex) {
    const q = QUESTIONS[step];
    const choices = getChoicesForStep();
    answers[q.id] = choices[choiceIndex].value;

    document.querySelectorAll('#w-choices .choice').forEach((el, i) => {
      el.classList.toggle('selected', i === choiceIndex);
    });

    document.getElementById('w-btn-next').disabled = false;
  }

  function next() {
    const q = QUESTIONS[step];
    if (answers[q.id] === undefined) return;

    if (step < QUESTIONS.length - 1) {
      step++;
      renderStep();
    } else {
      Hasil.compute(answers);
    }
  }

  function back() {
    if (step > 0) { step--; renderStep(); }
  }

  function reset() {
    step    = 0;
    answers = {};
    renderStep();
  }

  function initEvents() {
    document.getElementById('w-choices').addEventListener('click', e => {
      const choice = e.target.closest('.choice');
      if (choice) selectAnswer(Number(choice.dataset.index));
    });
    document.getElementById('w-btn-next').addEventListener('click', next);
    document.getElementById('w-btn-back').addEventListener('click', back);
  }

  return { renderStep, next, back, reset, initEvents };
})();

// FIX: Expose ke window agar bisa dicek window.Wizard di main.js
// (const Wizard ≠ window.Wizard — tanpa baris ini wizard tidak pernah dirender!)
window.Wizard = Wizard;
