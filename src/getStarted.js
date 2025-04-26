++ Content
const QUESTIONS = [
  { key: 'objectives', question: 'What’s your core business goal?' },
  { key: 'users', question: 'Who are your target users?' },
  { key: 'features', question: 'What are the must-have features?' },
  { key: 'constraints', question: 'Any deadlines, budgets, or other constraints?' }
];

const SYSTEM_PROMPT = `You are a requirements analyst. Given these Q&A pairs, produce or update a JSON summary according to this schema:
{
  "objectives": string[],
  "users": string[],
  "features": string[],
  "constraints": string[]
}
Return a valid JSON object only.`;

let state = {
  currentIndex: 0,
  answers: {}
};

export function initGetStarted() {
  createPanel();
  attachHandlers();
}

function createPanel() {
  const container = document.createElement('div');
  container.id = 'get-started-panel';
  container.className = 'fixed top-0 left-0 w-full h-full bg-white z-50 hidden';
  container.innerHTML = `
    <div class="flex h-full">
      <div class="get-started-left w-1/2 p-6 overflow-y-auto"></div>
      <div class="get-started-right w-1/2 p-6 overflow-y-auto bg-gray-50">
        <h2 class="text-2xl font-bold mb-4">Project Summary</h2>
        <div id="get-started-summary" class="space-y-4 text-gray-700">
          <p>Answer questions to see the summary here.</p>
        </div>
      </div>
    </div>
    <button id="get-started-close" class="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-2xl">&times;</button>
  `;
  document.body.appendChild(container);
}

function attachHandlers() {
  document.querySelectorAll('.js-get-started').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      showPanel();
      renderQuestion();
      updateSummary();
    });
  });
  document.getElementById('get-started-close').addEventListener('click', hidePanel);
}

function showPanel() {
  document.getElementById('get-started-panel').classList.remove('hidden');
}

function hidePanel() {
  document.getElementById('get-started-panel').classList.add('hidden');
}

function renderQuestion() {
  const container = document.querySelector('#get-started-panel .get-started-left');
  const { key, question } = QUESTIONS[state.currentIndex];
  const existing = state.answers[key] || '';
  container.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">${question}</h3>
    <textarea id="get-started-answer" rows="4" class="w-full border border-gray-300 p-2 rounded">${existing}</textarea>
    <div class="flex justify-between mt-4">
      ${state.currentIndex > 0 ? '<button id="get-started-prev" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Previous</button>' : '<div></div>'}
      <button id="get-started-next" class="bg-blue-600 text-white px-4 py-2 rounded">${state.currentIndex < QUESTIONS.length -1 ? 'Next' : 'Finish'}</button>
    </div>
  `;
  document.getElementById('get-started-answer').addEventListener('blur', e => {
    state.answers[key] = e.target.value;
    updateSummary();
  });
  document.getElementById('get-started-next').addEventListener('click', () => {
    state.answers[key] = document.getElementById('get-started-answer').value;
    updateSummary();
    if (state.currentIndex < QUESTIONS.length - 1) {
      state.currentIndex++;
      renderQuestion();
    } else {
      hidePanel();
    }
  });
  if (state.currentIndex > 0) {
    document.getElementById('get-started-prev').addEventListener('click', () => {
      state.currentIndex--;
      renderQuestion();
      updateSummary();
    });
  }
}

async function updateSummary() {
  const summaryEl = document.getElementById('get-started-summary');
  summaryEl.innerHTML = '<p class="italic text-gray-500">Updating summary...</p>';
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];
  QUESTIONS.forEach(({ key, question }) => {
    if (state.answers[key]) {
      messages.push({
        role: 'user',
        content: `${question}\nAnswer: ${state.answers[key]}`
      });
    }
  });
  try {
    const res = await fetch('/.netlify/functions/openai-requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    if (!res.ok) {
      const text = await res.text();
      summaryEl.innerHTML = `<p class="text-red-600">Error: ${text}</p>`;
      return;
    }
    const { content } = await res.json();
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      summaryEl.innerHTML = `<pre class="whitespace-pre-wrap">${content}</pre>`;
      return;
    }
    let html = '';
    Object.entries(parsed).forEach(([section, value]) => {
      html += `<h3 class="text-lg font-semibold mt-4">${capitalize(section)}</h3>`;
      if (Array.isArray(value)) {
        html += '<ul class="list-disc pl-5">';
        value.forEach(item => {
          html += `<li>${item}</li>`;
        });
        html += '</ul>';
      } else {
        html += `<p>${value}</p>`;
      }
    });
    summaryEl.innerHTML = html;
  } catch (err) {
    summaryEl.innerHTML = `<p class="text-red-600 italic">${err.toString()}</p>`;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}