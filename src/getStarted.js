// Question sequence, including role, product type & sub-type, then details
const QUESTIONS = [
  {
    key: 'userRole',
    question: 'Are you a business or an individual?',
    type: 'choice',
    options: ['Business', 'Individual']
  },
  {
    key: 'project Type',
    question: 'What type of product are you looking to build?',
    type: 'choice',
    options: ['Mobile App', 'Web App', 'Website', 'Other']
  },
  {
    key: 'subType',
    question: 'Which category best describes your product?',
    type: 'choice',
    options: [],      // will be populated dynamically based on userRole + project Type
    skipOption: true  // allow skipping this question
  },
  {
    key: 'description',
    // Dynamic prompt: business description for Business, personal goal for Individual
    question: answers => answers.userRole === 'Business'
      ? 'Tell us about your business/idea.'
      : 'What is your personal goal for this product?',
    type: 'textarea',
    example: answers => answers.userRole === 'Business'
      ? 'E.g. We help people track their daily habits and improve productivity.'
      : 'E.g. I want to track my fitness goals and progress.',
    skipOption: false
  },
  {
    key: 'platforms',
    question: 'Which platforms should the app support?',
    type: 'choice',
    options: ['iOS', 'Android', 'Both', 'Web'],
    skipOption: true,
    // Only ask this if the product is a Mobile App
    condition: answers => answers['project Type'] === 'Mobile App'
  },
  {
    key: 'users',
    question: 'Who are your target users?',
    type: 'textarea',
    example: answers => {
      const role = answers.userRole;
      const project = answers['project Type'] || '';
      const subtype = answers.subType || project;
      if (role === 'Business') {
        return `E.g. ${subtype} customers aged 25-40`;
      }
      return `E.g. Individuals interested in ${subtype}`;
    }
  },
  {
    key: 'features',
    question: 'What are the must-have features?',
    type: 'textarea',
    example: answers => {
      const role = answers.userRole;
      const project = answers['project Type'] || '';
      const subtype = answers.subType || project;
      return `E.g. Key features for a ${role} ${project} (${subtype}), such as user authentication, data reporting, and notifications`;
    }
  },
  {
    key: 'constraints',
    question: 'Any deadlines, budgets, or other constraints?',
    type: 'textarea',
    example: answers => {
      const project = answers['project Type'] || '';
      const subtype = answers.subType || project;
      return `E.g. $10k budget, launch by end of Q3, support for ${project} (${subtype})`;
    }
  }
];

// Mapping of sub-type options based on role and project type
const SUBTYPE_OPTIONS = {
  Business: {
    'Mobile App': ['E-commerce', 'Enterprise', 'Internal Tools', 'Social Networking'],
    'Web App': ['SaaS', 'Dashboard', 'Analytics', 'Workflow Automation'],
    Website: ['Corporate Site', 'Landing Page', 'Blog', 'Marketing Site'],
    Other: ['Plugin', 'Integration', 'API Service', 'Other']
  },
  Individual: {
    'Mobile App': ['Health & Fitness', 'Game', 'Photo/Video', 'Personal Finance'],
    'Web App': ['Portfolio Builder', 'Personal Blog', 'Event Planner', 'Recipe Manager'],
    Website: ['Portfolio', 'Blog', 'Resume Site', 'Hobby Site'],
    Other: ['Custom Tool', 'Script', 'Plugin', 'Other']
  }
};

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

// State for get-started flow, including clarification tracking
let state = {
  currentIndex: 0,
  answers: {},
  clarificationCounts: {},      // number of clarifications per question key
  clarifyMessages: [],          // message history for clarifications
  inClarification: false,       // whether we are in a follow-up clarifying step
  currentQuestionKey: null,     // key of the question being clarified
  currentClarifyQuestion: ''    // the current clarifying question text
};

// Prompt and tool definition for asking clarifying questions
const CLARIFY_PROMPT = `You are a helpful assistant that asks clarifying questions to gather more details about the user's answer. If more information is needed, call the ask_clarification function with a single property 'question'. Otherwise, do not call any function.`;
const ASK_CLARIFICATION_TOOL = {
  type: 'function',
  name: 'ask_clarification',
  description: 'Ask a follow-up clarifying question for more detail',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The clarifying question to ask the user' }
    },
    required: ['question']
  }
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

function attachHandlers() {
  document.querySelectorAll('.js-get-started').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      showPanel();
      renderQuestion();
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
  // Skip any questions whose condition is not met
  while (state.currentIndex < QUESTIONS.length) {
    const skipQ = QUESTIONS[state.currentIndex];
    if (skipQ.condition && !skipQ.condition(state.answers)) {
      state.currentIndex++;
      continue;
    }
    break;
  }
  if (state.currentIndex >= QUESTIONS.length) {
    hidePanel();
    return;
  }
  // Update progress bar
  const progressBar = document.getElementById('get-started-progress-bar');
  if (progressBar) {
    const pct = ((state.currentIndex + 1) / QUESTIONS.length) * 100;
    progressBar.style.width = pct + '%';
  }
  const container = document.querySelector('#get-started-panel .get-started-left');
  const q = QUESTIONS[state.currentIndex];
  const { key, type } = q;
  // Determine question text and example (can be functions)
  const questionText = typeof q.question === 'function'
    ? q.question(state.answers)
    : q.question;
  const exampleText = typeof q.example === 'function'
    ? q.example(state.answers)
    : q.example;
  // Prepare choices for choice questions
  let opts = q.options || [];
  // Add a 'Skip' option if allowed
  if (q.skipOption && type === 'choice') {
    opts = [...opts.filter(o => o !== 'Skip'), 'Skip'];
  }
  if (type === 'choice' && key === 'subType') {
    const role = state.answers['userRole'];
    const proj = state.answers['project Type'];
    opts = (SUBTYPE_OPTIONS[role] && SUBTYPE_OPTIONS[role][proj]) || [];
    if (q.skipOption) opts = [...opts, 'Skip'];
  }
  const existing = state.answers[key] || '';
  // Build the HTML for the current question
  let html = `
    <p class="mb-4 text-gray-600">Help us understand your idea and needs.</p>
    <h3 class="text-xl font-semibold mb-2">${questionText}</h3>
  `;
  if (type === 'choice') {
    html += `<div class="grid grid-cols-2 gap-4 mb-4">`;
    opts.forEach(opt => {
      html += `<button data-value="${opt}" class="js-choice-btn bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">${opt}</button>`;
    });
    html += `</div>
      <div class="flex justify-between">
        ${state.currentIndex > 0 ? `<button id="get-started-prev" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Previous</button>` : `<div></div>`}
      </div>
    `;
  } else {
    html += `
      <textarea id="get-started-answer" rows="4" placeholder="${exampleText}" class="w-full border border-gray-300 p-2 rounded">${existing}</textarea>
      <div class="flex justify-between mt-4">
        ${state.currentIndex > 0 ? `<button id="get-started-prev" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Previous</button>` : `<div></div>`}
        <button id="get-started-next" class="bg-blue-600 text-white px-4 py-2 rounded">${state.currentIndex < QUESTIONS.length - 1 ? 'Next' : 'Finish'}</button>
      </div>
    `;
  }
  container.innerHTML = html;
  // If on features question, inject a Submit button for early submission
  if (q.key === 'features') {
    const textarea = document.getElementById('get-started-answer');
    const nextBtn = document.getElementById('get-started-next');
    if (nextBtn) {
      const submitBtn = document.createElement('button');
      submitBtn.id = 'get-started-submit';
      submitBtn.textContent = 'Submit';
      submitBtn.className = 'bg-green-600 text-white px-4 py-2 rounded ml-2';
      nextBtn.insertAdjacentElement('afterend', submitBtn);
      submitBtn.addEventListener('click', () => {
        // Capture final features answer and submit all responses
        state.answers[q.key] = textarea.value;
        submitAnswers();
      });
    }
  }
  // Attach handlers
  if (type === 'choice') {
    container.querySelectorAll('.js-choice-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const val = e.currentTarget.getAttribute('data-value');
        state.answers[key] = val;
        // Only update summary for text inputs; skip API call on choice selections
        // Next step
        state.currentIndex++;
        renderQuestion();
      });
    });
  } else {
    const textarea = document.getElementById('get-started-answer');
    textarea.addEventListener('blur', e => {
      state.answers[key] = e.target.value;
    });
    document.getElementById('get-started-next').addEventListener('click', async () => {
      // Save user answer and start clarification flow
      state.answers[key] = textarea.value;
      state.currentQuestionKey = key;
      state.clarificationCounts[key] = 0;
      state.clarifyMessages = [];
      await requestClarification();
    });
  }
  if (state.currentIndex > 0) {
    document.getElementById('get-started-prev').addEventListener('click', () => {
      state.currentIndex--;
      renderQuestion();
    });
  }
}

// Request a clarifying question from the AI, or proceed to summary
async function requestClarification() {
  state.inClarification = true;
  const key = state.currentQuestionKey;
  const questionText = QUESTIONS[state.currentIndex].question;
  const userAnswer = state.answers[key];
  const count = state.clarificationCounts[key] || 0;
  const messages = [
    { role: 'system', content: CLARIFY_PROMPT },
    { role: 'user', content: `Question: ${questionText}\nAnswer: ${userAnswer}` },
    ...state.clarifyMessages
  ];
  // Call clarification tool
  const res = await fetch('/.netlify/functions/openai-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4.1',
      input: messages,
      tools: [ASK_CLARIFICATION_TOOL],
      tool_choice: 'auto'
    })
  });
  if (!res.ok) {
    const text = await res.text();
    document.getElementById('get-started-summary').innerHTML = `<p class="text-red-600">Error: ${text}</p>`;
    return;
  }
  const data = await res.json();
  const clar = data.summary && data.summary.question;
  if (clar) {
    state.currentClarifyQuestion = clar;
    state.clarificationCounts[key] = count + 1;
    renderFollowup();
  } else {
    // No clarification needed, update summary and move on
    await updateSummary();
    proceedToNextQuestion();
  }
}

// Render the clarifying question UI
function renderFollowup() {
  const container = document.querySelector('#get-started-panel .get-started-left');
  let html = `
    <p class="mb-4 text-gray-600">Please clarify your previous answer.</p>
    <h3 class="text-xl font-semibold mb-2">${state.currentClarifyQuestion}</h3>
    <textarea id="clarify-answer" rows="4" placeholder="Your answer..." class="w-full border border-gray-300 p-2 rounded"></textarea>
    <div class="flex justify-between mt-4">
      <button id="clarify-skip" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Skip</button>
      <button id="clarify-next" class="bg-blue-600 text-white px-4 py-2 rounded">Next</button>
    </div>`;
  container.innerHTML = html;
  document.getElementById('clarify-next').addEventListener('click', async () => {
    const answer = document.getElementById('clarify-answer').value;
    const key = state.currentQuestionKey;
    // Merge clarification answer into main answer for summary
    state.answers[key] = `${state.answers[key]}\n${answer}`;
    state.clarifyMessages.push({ role: 'assistant', content: state.currentClarifyQuestion });
    state.clarifyMessages.push({ role: 'user', content: `Answer: ${answer}` });
    if ((state.clarificationCounts[key] || 0) < 2) {
      await requestClarification();
    } else {
      await updateSummary();
      proceedToNextQuestion();
    }
  });
  document.getElementById('clarify-skip').addEventListener('click', async () => {
    await updateSummary();
    proceedToNextQuestion();
  });
}

// Move to the next preset question or finish
function proceedToNextQuestion() {
  state.inClarification = false;
  state.clarifyMessages = [];
  state.currentClarifyQuestion = '';
  if (state.currentIndex < QUESTIONS.length - 1) {
    state.currentIndex++;
    renderQuestion();
  } else {
    hidePanel();
  }
}

// Update the summary panel using the generate_summary tool
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
    // Define function-calling tool for summary generation
    const tools = [
      {
        type: 'function',
        name: 'generate_summary',
        description: 'Generate a JSON summary of project requirements based on provided Q&A.',
        parameters: {
          type: 'object',
          properties: {
            userRole: { type: 'string' },
            'project Type': { type: 'string' },
            subType: { type: 'string' },
            platforms: { type: 'string' },
            description: { type: 'string' },
            users: { type: 'array', items: { type: 'string' } },
            features: { type: 'array', items: { type: 'string' } },
            constraints: { type: 'array', items: { type: 'string' } }
          },
          // Constraints can be optional if user submits early after features
          required: ['userRole', 'project Type', 'description', 'users', 'features']
        }
      }
    ];
    // Call the Netlify function with tool definitions
    const res = await fetch('/.netlify/functions/openai-requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: messages,
        tools,
        tool_choice: 'auto'
      })
    });
    if (!res.ok) {
      const text = await res.text();
      summaryEl.innerHTML = `<p class="text-red-600">Error: ${text}</p>`;
      return;
    }
    const data = await res.json();
    let parsed;
    if (data.summary) {
      parsed = data.summary;
    } else {
      try {
        parsed = JSON.parse(data.content);
      } catch {
        summaryEl.innerHTML = `<pre class="whitespace-pre-wrap">${data.content}</pre>`;
        return;
      }
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
      } else if (value !== null && typeof value === 'object') {
        // Render nested objects (unexpected) as formatted JSON
        html += `<pre class="whitespace-pre-wrap">${JSON.stringify(value, null, 2)}</pre>`;
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
// Submit all collected answers to backend
async function submitAnswers() {
  const btn = document.getElementById('get-started-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting…';
  }
  try {
    const res = await fetch('/.netlify/functions/submit-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.answers)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    const json = await res.json();
    const summaryEl = document.getElementById('get-started-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `<p class="text-green-600">${json.message}</p>`;
    }
  } catch (err) {
    const summaryEl = document.getElementById('get-started-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `<p class="text-red-600">Error submitting: ${err.message}</p>`;
    }
  }
}