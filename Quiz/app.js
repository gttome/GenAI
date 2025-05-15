/* global Chart */
const APP_STATE_KEY = 'gapeg_progress_v1';
const DATA_PATH = 'data/';

let appState;
try { appState = JSON.parse(localStorage.getItem(APP_STATE_KEY) || '{}'); }
catch { appState = {}; }

const $ = (sel, ctx=document) => ctx.querySelector(sel);
const NOTES_KEY_PREFIX = APP_STATE_KEY + '_notes_';


const screens = {
  dashboard: document.querySelector('#tpl-dashboard').content.cloneNode(true),
  question : document.querySelector('#tpl-question').content.cloneNode(true),
  review   : document.querySelector('#tpl-review').content.cloneNode(true),
  results  : document.querySelector('#tpl-results').content.cloneNode(true)
};

const appRoot = document.querySelector('#app');
let quiz = null, chapterMeta = null, currentQ = 0, timerId = null;

/* ---------- boot ---------- */
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
  loadDashboard();
});

/* ---------- dashboard ---------- */
function loadDashboard() {
  clearInterval(timerId);
  appRoot.innerHTML = '';
  appRoot.appendChild(screens.dashboard.cloneNode(true));

  const list = $('#chapter-list');
  fetch(DATA_PATH + 'index.json')
    .then(r => r.ok ? r.json() : Promise.reject('index.json missing'))
    .then(arr => arr.forEach(ch => list.appendChild(renderCard(ch))))
    .catch(err => { list.textContent = err; console.error(err); });
}

function renderCard(ch) {
  const li = document.createElement('li');
  li.className = 'card';
  const pct = appState[ch.id]?.percent ?? 0;
  const score = appState[ch.id]?.score ?? '—';
  li.innerHTML = `<strong>${ch.title}</strong>
                  <div class="meta">Completed: ${pct}% • Score: ${score}</div>`;
  li.onclick = () => startChapter(ch);
  return li;
}

/* ---------- chapter ---------- */
async function startChapter(meta) {
  chapterMeta = meta;
  // 1) load the quiz data
  quiz = await fetch(DATA_PATH + meta.file).then(r => r.json());

  // 2) initialize answers & notes
  quiz.answers = {}; 
  // ← add this line to ensure quiz.notes always exists
  quiz.notes   = JSON.parse(
    localStorage.getItem(NOTES_KEY_PREFIX + meta.id) || '{}'
  );

  currentQ = 0;
  loadQuestion();
}


/* ---------- timer ---------- */
function startTimer() {
  clearInterval(timerId);
  const max = 60 * quiz.questions.length;
  let elapsed = 0;
  timerId = setInterval(() => {
    elapsed++;
    const t = String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
    const timerEl = $('#timer'); if(timerEl) timerEl.textContent = 'Time: ' + t;
    if (elapsed>=max) clearInterval(timerId);
  },1000);
}

/* ---------- question ---------- */

function loadQuestion() {
  // 1) Clear existing view and inject the question template
  appRoot.innerHTML = '';
  appRoot.appendChild(screens.question.cloneNode(true));

  // 2) Chapter title
  const chapLabel = $('#chapter-name');
  if (chapLabel) chapLabel.textContent = chapterMeta.title;

  // 3) Current question object
  const q = quiz.questions[currentQ];

  // 4) Question text
  const qText = $('#question-text');
  if (qText) qText.textContent = q.question_text;

  // 5) Render the options form
  const form = $('#options-form');
  if (form) {
    form.innerHTML = '';
    q.options.forEach(opt => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input
          type="radio"
          name="opt"
          value="${opt.option_id}"
          ${quiz.answers[q.question_id] === opt.option_id ? 'checked' : ''}
        >
        ${opt.option_id}. ${opt.option_text}
      `;
      form.appendChild(label);
    });
    form.addEventListener('change', e => {
      if (e.target.name === 'opt') {
        quiz.answers[q.question_id] = e.target.value;
        // Optionally: saveProgress(); 
      }
    });
  }

  // 6) Notes textarea binding
  const notesBox = document.getElementById('notes');
  if (notesBox) {
    quiz.notes = quiz.notes || {};
    notesBox.value = quiz.notes[q.question_id] || '';
    notesBox.addEventListener('input', () => {
      quiz.notes[q.question_id] = notesBox.value;
      localStorage.setItem(
        NOTES_KEY_PREFIX + chapterMeta.id,
        JSON.stringify(quiz.notes)
      );
    });
  }

  // 7) Progress indicator
  const prog = $('#progress');
  if (prog) prog.textContent = `Q ${currentQ + 1} / ${quiz.questions.length}`;

  // 8) Previous button
  const prevBtn = $('#btn-prev');
  if (prevBtn) {
    prevBtn.disabled = currentQ === 0;
    prevBtn.onclick = () => {
      currentQ--;
      loadQuestion();
    };
  }

  // 9) Next / Review button
  const nextBtn = $('#btn-next');
  if (nextBtn) {
    const isLast = currentQ === quiz.questions.length - 1;
    nextBtn.textContent = isLast ? 'Review' : 'Next';
    nextBtn.onclick = () => {
      if (isLast) loadReview();
      else {
        currentQ++;
        loadQuestion();
      }
    };
  }

  // 10) Mark for Review toggle
  const flagBtn = $('#btn-flag');
  if (flagBtn) {
    // initialize label
    flagBtn.textContent = q.flagged ? 'Unmark' : 'Mark for Review';
    // attach handler
    flagBtn.onclick = () => {
      q.flagged = !q.flagged;
      flagBtn.textContent = q.flagged ? 'Unmark' : 'Mark for Review';
      saveProgress(); 
    };
  }

  // 11) Back to Chapters
  const backBtn = $('#btn-back-dashboard');
  if (backBtn) backBtn.onclick = loadDashboard;
}

/* ---------- review ---------- */
function loadReview() {
  appRoot.innerHTML='';
  appRoot.appendChild(screens.review.cloneNode(true));
  const list=$('#review-list');
  quiz.questions.forEach((q,i)=>{
    const li=document.createElement('li');
    li.textContent=`Q${i+1}: ${quiz.answers[q.question_id]||'—'} ${q.flagged?'⚑':''}`;
    li.onclick=()=>{currentQ=i;loadQuestion();};
    list.appendChild(li);
  });
  $('#btn-submit').onclick = submitQuiz;
  const backBtn = $('#btn-back-question'); if(backBtn){ backBtn.onclick = () => { loadQuestion(); }; }
}

/* ---------- submit ---------- */
function submitQuiz(){
  let correct=0;
  quiz.questions.forEach(q=>{
    if(quiz.answers[q.question_id]===q.correct_answer.option_id) correct++;
  });
  const pct=Math.round(correct/quiz.questions.length*100);
  appState[chapterMeta.id]={percent:100,score:pct};
  localStorage.setItem(APP_STATE_KEY,JSON.stringify(appState));
  loadResults(correct,quiz.questions.length);
}

/* ---------- results ---------- */
function loadResults(correct, total) {
  // 1) Clear and render the results template
  appRoot.innerHTML = '';
  appRoot.appendChild(screens.results.cloneNode(true));

  // 2) Chapter label and score
  $('#chapter-label').textContent =
    'Chapter: ' + chapterMeta.title;
  $('#score-summary').textContent =
    `Score: ${correct} / ${total} (${Math.round(correct/total*100)}%)`;

  // 3) Buttons
  $('#btn-back-dashboard').onclick = loadDashboard;
  $('#btn-review-questions').onclick = loadReview;

  // 4) Doughnut chart
  new Chart($('#chart'), {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Incorrect'],
     datasets: [{
       data: [correct, total - correct],
       backgroundColor: ['green', 'red']
     }]
    },
    options: { responsive: false, plugins: { legend: { display: false } } }
  });

  // 5) Detailed breakdown with numbering, indicator, and hanging-indent
  const details = document.createElement('pre');
  details.classList.add('detailed-breakdown');

  details.textContent = quiz.questions
    .map((q, idx) => {
      const qid       = q.question_id;
      const corrId    = q.correct_answer.option_id;
      const optCorrect = q.options.find(o => o.option_id === corrId);
      const selected  = quiz.answers[qid] || '—';
      const indicator = selected === corrId ? '✓ Correct' : '✗ Incorrect';

      return [
        `${idx + 1}. ${indicator} – ${q.question_text}`,
        `    Your answer: ${selected}`,
        `    Correct answer: ${corrId}. ${optCorrect.option_text}`,
        `    Reason: ${q.reasoning}`
      ].join('\n');
    })
    .join('\n\n');

  // 6) Inject the breakdown right after the score summary
  $('#score-summary').insertAdjacentElement('afterend', details);
}
