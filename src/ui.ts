// Module: ui.ts
// Handles creation, rendering, and interactions of the Get Started flow UI

import { state } from './stateMachine';
import { QUESTIONS, SUBTYPE_OPTIONS } from './questions';
import { submitAnswers, askClarification, generateSummary } from './api';
import { proceedToNextQuestion } from './stateMachine';

// Prompts for AI interactions
const SYSTEM_PROMPT = `You are a requirements analyst. Given these Q&A pairs, produce or update a JSON summary according to this schema:
{
  "userRole": string,
  "project Type": string,
  "subType": string,
  "platforms": string,
  "description": string,
  "users": string[],
  "features": string[],
  "constraints": string[]
}
Return a valid JSON object only.`;
const CLARIFY_PROMPT = `You are a helpful assistant that asks clarifying questions to gather more details about the user's answer. If more information is needed, call the ask_clarification function with a single property 'question'. Otherwise, do not call any function.`;

/**
 * Create the main Get Started panel and append it to document.body
 */
export function createPanel(): void {
  const container = document.createElement('div');
  container.id = 'get-started-panel';
  container.className = 'fixed top-0 left-0 w-full h-full bg-white z-50 hidden';
  container.innerHTML = `
    <div id="get-started-progress" class="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-4">
      <div id="get-started-progress-bar" class="bg-blue-600 h-full w-0 transition-all duration-300"></div>
    </div>
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

/**
 * Attach click handlers for opening/closing the panel
 */
export function attachHandlers(onOpen: () => void, onClose: () => void): void {
  document.querySelectorAll('.js-get-started').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      onOpen();
    });
  });
  const closeBtn = document.getElementById('get-started-close');
  if (closeBtn) closeBtn.addEventListener('click', onClose);
}

/** Show the panel */
export function showPanel(): void {
  const panel = document.getElementById('get-started-panel');
  if (panel) panel.classList.remove('hidden');
}

/** Hide the panel */
export function hidePanel(): void {
  const panel = document.getElementById('get-started-panel');
  if (panel) panel.classList.add('hidden');
}

/** Update progress bar based on current index and total questions */
export function updateProgress(currentIndex: number, total: number): void {
  const progressBar = document.getElementById('get-started-progress-bar');
  if (progressBar) {
    const pct = ((currentIndex + 1) / total) * 100;
    // @ts-ignore
    progressBar.style.width = pct + '%';
  }
}

/** Render the current question into the panel */
export function renderQuestion(): void {
  // Skip questions with unmet conditions
  while (state.currentIndex < QUESTIONS.length) {
    const q = QUESTIONS[state.currentIndex];
    if (q.condition && !q.condition(state.answers)) {
      state.currentIndex++;
      continue;
    }
    break;
  }
  if (state.currentIndex >= QUESTIONS.length) {
    hidePanel();
    return;
  }
  updateProgress(state.currentIndex, QUESTIONS.length);
  const container = document.querySelector('#get-started-panel .get-started-left') as HTMLElement;
  const q = QUESTIONS[state.currentIndex];
  const { key, type } = q;
  const questionText = typeof q.question === 'function' ? q.question(state.answers) : q.question;
  const exampleText = typeof q.example === 'function' ? q.example(state.answers) : q.example || '';
  // Prepare choice options
  let opts = q.options ? [...q.options] : [];
  if (q.skipOption && type === 'choice') opts.push('Skip');
  if (type === 'choice' && key === 'subType') {
    const role = state.answers['userRole'];
    const proj = state.answers['project Type'];
    opts = (SUBTYPE_OPTIONS[role] && SUBTYPE_OPTIONS[role][proj]) || [];
    if (q.skipOption) opts.push('Skip');
  }
  const existing = state.answers[key] || '';
  // Build HTML
  let html = `<p class="mb-4 text-gray-600">Help us understand your idea and needs.</p>
    <h3 class="text-xl font-semibold mb-2">${questionText}</h3>`;
  if (type === 'choice') {
    html += `<div class="grid grid-cols-2 gap-4 mb-4">`;
    opts.forEach(opt => html += `<button data-value="${opt}" class="js-choice-btn bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">${opt}</button>`);
    html += `</div><div class="flex justify-between">${state.currentIndex > 0 ? '<button id="get-started-prev" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Previous</button>' : '<div></div>'}</div>`;
  } else {
    html += `<textarea id="get-started-answer" rows="4" placeholder="${exampleText}" class="w-full border border-gray-300 p-2 rounded">${existing}</textarea>
      <div class="flex justify-between mt-4">${state.currentIndex > 0 ? '<button id="get-started-prev" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Previous</button>' : '<div></div>'}<button id="get-started-next" class="bg-blue-600 text-white px-4 py-2 rounded">${state.currentIndex < QUESTIONS.length - 1 ? 'Next' : 'Finish'}</button></div>`;
  }
  container.innerHTML = html;
  // Early submit on features
  if (q.key === 'features') {
    const textarea = document.getElementById('get-started-answer') as HTMLTextAreaElement;
    const nextBtn = document.getElementById('get-started-next');
    if (nextBtn) {
      const submitBtn = document.createElement('button');
      submitBtn.id = 'get-started-submit';
      submitBtn.textContent = 'Submit';
      submitBtn.className = 'bg-green-600 text-white px-4 py-2 rounded ml-2';
      nextBtn.insertAdjacentElement('afterend', submitBtn);
      submitBtn.addEventListener('click', () => {
        state.answers[q.key] = textarea.value;
        submitAnswers(state.answers).catch(console.error);
      });
    }
  }
  // Attach handlers
  if (type === 'choice') {
    container.querySelectorAll('.js-choice-btn').forEach(btn => btn.addEventListener('click', e => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-value');
      state.answers[key] = val;
      state.currentIndex++;
      renderQuestion();
    }));
  } else {
    const textarea = document.getElementById('get-started-answer') as HTMLTextAreaElement;
    textarea.addEventListener('blur', e => state.answers[key] = (e.target as HTMLTextAreaElement).value);
    const nextBtn = document.getElementById('get-started-next');
    if (nextBtn) nextBtn.addEventListener('click', async () => {
      state.answers[key] = textarea.value;
      state.currentQuestionKey = key;
      state.clarificationCounts[key] = 0;
      state.clarifyMessages = [];
      await requestClarification();
    });
  }
  if (state.currentIndex > 0) {
    const prevBtn = document.getElementById('get-started-prev');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      state.currentIndex--;
      renderQuestion();
    });
  }
}

/**
 * Request a clarifying question from the AI, or update summary and proceed
 */
async function requestClarification(): Promise<void> {
  state.inClarification = true;
  const key = state.currentQuestionKey!;
  const questionText = QUESTIONS[state.currentIndex].question;
  const userAnswer = state.answers[key];
  const count = state.clarificationCounts[key] || 0;
  const messages: any[] = [
    { role: 'system', content: CLARIFY_PROMPT },
    { role: 'user', content: `Question: ${questionText}\nAnswer: ${userAnswer}` },
    ...state.clarifyMessages
  ];
  try {
    const aiResp = await askClarification(messages);
    const clar = aiResp.summary?.question;
    if (clar) {
      state.currentClarifyQuestion = clar;
      state.clarificationCounts[key] = count + 1;
      renderFollowup();
    } else {
      await updateSummary();
      proceedToNextQuestion();
      renderQuestion();
    }
  } catch (err: any) {
    const summaryEl = document.getElementById('get-started-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
  }
}

/** Render a follow-up clarification question */
export function renderFollowup(): void {
  const container = document.querySelector('#get-started-panel .get-started-left') as HTMLElement;
  const html = `<p class="mb-4 text-gray-600">Please clarify your previous answer.</p>
    <h3 class="text-xl font-semibold mb-2">${state.currentClarifyQuestion}</h3>
    <textarea id="clarify-answer" rows="4" placeholder="Your answer..." class="w-full border border-gray-300 p-2 rounded"></textarea>
    <div class="flex justify-between mt-4">
      <button id="clarify-skip" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Skip</button>
      <button id="clarify-next" class="bg-blue-600 text-white px-4 py-2 rounded">Next</button>
    </div>`;
  container.innerHTML = html;
  document.getElementById('clarify-next')?.addEventListener('click', async () => {
    const answer = (document.getElementById('clarify-answer') as HTMLTextAreaElement).value;
    const key = state.currentQuestionKey!;
    state.answers[key] = `${state.answers[key]}\n${answer}`;
    state.clarifyMessages.push({ role: 'assistant', content: state.currentClarifyQuestion });
    state.clarifyMessages.push({ role: 'user', content: `Answer: ${answer}` });
    if ((state.clarificationCounts[key] || 0) < 2) {
      await requestClarification();
    } else {
      await updateSummary();
      proceedToNextQuestion();
      renderQuestion();
    }
  });
  document.getElementById('clarify-skip')?.addEventListener('click', async () => {
    await updateSummary();
    proceedToNextQuestion();
    renderQuestion();
  });
}

/** Update the summary panel using AI and render results */
export async function updateSummary(): Promise<void> {
  const summaryEl = document.getElementById('get-started-summary');
  if (!summaryEl) return;
  summaryEl.innerHTML = '<p class="italic text-gray-500">Updating summary...</p>';
  const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  QUESTIONS.forEach(({ key, question }) => {
    if (state.answers[key]) {
      messages.push({ role: 'user', content: `${question}\nAnswer: ${state.answers[key]}` });
    }
  });
  try {
    const aiResp = await generateSummary(messages);
    let parsed: any;
    if (aiResp.summary) parsed = aiResp.summary;
    else parsed = JSON.parse(aiResp.content || '');
    let html = '';
    Object.entries(parsed).forEach(([section, value]) => {
      html += `<h3 class="text-lg font-semibold mt-4">${capitalize(section)}</h3>`;
      if (Array.isArray(value)) {
        html += '<ul class="list-disc pl-5">';
        value.forEach(item => html += `<li>${item}</li>`);
        html += '</ul>';
      } else if (value && typeof value === 'object') {
        html += `<pre class="whitespace-pre-wrap">${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        html += `<p>${value}</p>`;
      }
    });
    summaryEl.innerHTML = html;
  } catch (err: any) {
    summaryEl.innerHTML = `<p class="text-red-600 italic">${err.toString()}</p>`;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}