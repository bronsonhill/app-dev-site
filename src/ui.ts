// Module: ui.ts
// Handles creation, rendering, and interactions of the Get Started flow UI

import { state } from './stateMachine';
import { QUESTIONS, SUBTYPE_OPTIONS } from './questions';
import { submitAnswers, callTools, submitContact } from './api';
// Track whether contact form has been submitted
let contactSubmitted = false;
import { proceedToNextQuestion } from './stateMachine';
// Manual summary for structured inputs
function refreshRawSummary(): void {
  const summaryEl = document.getElementById('get-started-summary');
  if (!summaryEl) return;
  let html = '';
  // Display only choice-based or features answers
  QUESTIONS.forEach(q => {
    const key = q.key;
    const val = state.answers[key];
    if (val === undefined) return;
    // Only show for choice questions and features array
    if (q.type === 'choice' || key === 'features') {
      const label = typeof q.question === 'string' ? q.question : key;
      html += `<h3 class="text-lg font-semibold mt-4">${label}</h3>`;
      if (Array.isArray(val)) {
        html += '<ul class="list-disc pl-5">';
        val.forEach((item: string) => html += `<li>${item}</li>`);
        html += '</ul>';
      } else {
        html += `<p>${val}</p>`;
      }
    }
  });
  summaryEl.innerHTML = html;
}
// Generate feature options tailored to user role, project type, and subtype
function getFeatureOptions(role: string, project: string, subtype: string): string[] {
  const featuresByProjectType: Record<string, string[]> = {
    'Mobile App': ['User Authentication', 'Push Notifications', 'In-app Purchases', 'Offline Mode', 'Analytics'],
    'Web App': ['User Authentication', 'Dashboard', 'Reporting', 'API Integration', 'Responsive Design'],
    'Website': ['Landing Page', 'Contact Form', 'SEO Optimization', 'Blog', 'Analytics'],
    'Other': ['API Access', 'Integrations', 'Custom Plugin', 'Other'],
  };
  const featuresBySubType: Record<string, string[]> = {
    'E-commerce': ['Shopping Cart', 'Payment Gateway', 'Product Catalog'],
    'Enterprise': ['Role-Based Access', 'Advanced Analytics', 'Integration APIs'],
    'Internal Tools': ['Admin Dashboard', 'User Management', 'Data Import/Export'],
    'Social Networking': ['User Profiles', 'Messaging', 'Social Feed'],
    'SaaS': ['Subscription Management', 'Onboarding', 'Billing System'],
    'Dashboard': ['Data Visualization', 'Interactive Charts', 'Alerts & Notifications'],
    'Analytics': ['Custom Reporting', 'Real-time Metrics', 'Data Export'],
    'Workflow Automation': ['Task Scheduler', 'Workflow Designer', 'Approval Processes'],
    'Corporate Site': ['About Us Page', 'Team Profiles', 'Contact Form'],
    'Landing Page': ['Hero Section', 'Signup Form', 'A/B Testing'],
    'Blog': ['CMS', 'Commenting System', 'Social Sharing'],
    'Marketing Site': ['Lead Capture Forms', 'SEO Tools', 'Analytics Integration'],
    'Plugin': ['Custom Extensions', 'Configuration Panel', 'Versioning'],
    'Integration': ['Webhook Support', 'Data Sync', 'API Connectors'],
    'API Service': ['RESTful Endpoints', 'Documentation', 'Authentication'],
    'Other': ['Customization', 'Support & Maintenance'],
    'Health & Fitness': ['Activity Tracking', 'Goal Setting', 'Progress Reports'],
    'Game': ['Leaderboards', 'Achievements', 'Multiplayer'],
    'Photo/Video': ['Image Filters', 'Gallery', 'Social Sharing'],
    'Personal Finance': ['Expense Tracking', 'Budget Planner', 'Financial Reports'],
    'Portfolio Builder': ['Template Selection', 'Drag & Drop Editor', 'Image Gallery'],
    'Personal Blog': ['WYSIWYG Editor', 'Comments', 'Social Sharing'],
    'Event Planner': ['Calendar Integration', 'Ticketing System', 'Notifications'],
    'Recipe Manager': ['Recipe Database', 'Ingredient List', 'Nutritional Info'],
    'Portfolio': ['Project Showcase', 'Contact Form', 'Responsive Design'],
    'Resume Site': ['Resume Templates', 'Download PDF', 'Skill Charts'],
    'Hobby Site': ['Photo Gallery', 'Blog Integration', 'Social Sharing'],
    'Custom Tool': ['Script Editor', 'Scheduling', 'Logging'],
    'Script': ['Scheduler', 'Command-Line Interface', 'Logging'],
  };
  const featuresByRole: Record<string, string[]> = {
    'Business': ['Reporting Dashboard', 'User Roles Management', 'Team Collaboration'],
    'Individual': ['Social Sharing', 'Customization Options'],
  };
  const suggestions = [
    ...(featuresByProjectType[project] || []),
    ...(featuresBySubType[subtype] || []),
    ...(featuresByRole[role] || []),
  ];
  return Array.from(new Set(suggestions));
}

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
        <h2 class="text-2xl font-bold mt-6 mb-2">Get your idea started now</h2>
        <form id="get-started-contact-form" class="space-y-4">
          <div>
            <label for="contact-name" class="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" id="contact-name" name="name" required class="mt-1 block w-full border border-gray-300 p-2 rounded" />
          </div>
          <div>
            <label for="contact-email" class="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" id="contact-email" name="email" required class="mt-1 block w-full border border-gray-300 p-2 rounded" />
          </div>
          <div>
            <label for="contact-phone" class="block text-sm font-medium text-gray-700">Phone</label>
            <input type="tel" id="contact-phone" name="phone" class="mt-1 block w-full border border-gray-300 p-2 rounded" />
          </div>
          <button type="submit" id="contact-submit" class="bg-green-600 text-white px-4 py-2 rounded">Submit Summary</button>
          <p id="contact-feedback" class="text-sm text-gray-500"></p>
        </form>
      </div>
    </div>
    <button id="get-started-close" class="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-2xl">&times;</button>
  `;
  document.body.appendChild(container);

  // Contact form handling
  const contactForm = document.getElementById('get-started-contact-form') as HTMLFormElement | null;
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('contact-name') as HTMLInputElement;
      const emailInput = document.getElementById('contact-email') as HTMLInputElement;
      const phoneInput = document.getElementById('contact-phone') as HTMLInputElement;
      const feedbackEl = document.getElementById('contact-feedback') as HTMLElement;
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      try {
        await submitContact({ name, email, phone });
        contactSubmitted = true;
        if (feedbackEl) {
          feedbackEl.textContent = 'Thank you! We will be in touch soon.';
          feedbackEl.className = 'text-sm text-green-600';
        }
        contactForm.reset();
      } catch (err: any) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Error submitting contact info. Please try again later.';
          feedbackEl.className = 'text-sm text-red-600';
        }
      }
    });
  }
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
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Prompt to submit contact form if not already done
      if (!contactSubmitted) {
        const submitNow = window.confirm(
          'Before exiting, please submit your contact info so we can reach out. Click OK to go to the contact form, or Cancel to exit.'
        );
        if (submitNow) {
          const formEl = document.getElementById('get-started-contact-form');
          if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      onClose();
    });
  }
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
    // Clone subtype options to avoid mutating the original array
    const baseOpts = (SUBTYPE_OPTIONS[role] && SUBTYPE_OPTIONS[role][proj]) || [];
    opts = [...baseOpts];
    if (q.skipOption) opts.push('Skip');
  }
  const existing = state.answers[key] || '';
  // Custom multi-select for features
  if (key === 'features') {
    const role = state.answers['userRole'] as string;
    const project = state.answers['project Type'] as string;
    const subtype = (state.answers['subType'] as string) || project;
    const options = getFeatureOptions(role, project, subtype);
    const containerEl = container;
    let htmlFs = `<p class="mb-4 text-gray-600">Help us understand your idea and needs. Tell us as much as you can about your idea, and we will get back to you on next steps.</p>
    <h3 class="text-xl font-semibold mb-2">${questionText}</h3>
    <div class="grid grid-cols-2 gap-4 mb-4">`;
    options.forEach(opt => {
      htmlFs += `<button data-value="${opt}" class="js-features-btn bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">${opt}</button>`;
    });
    htmlFs += `</div><div class="flex justify-between mt-4">`;
    htmlFs += state.currentIndex > 0
      ? '<button id="get-started-prev" class="bg-gray-200 text-gray-800 px-4 py-2 rounded">Previous</button>'
      : '<div></div>';
    htmlFs += `<button id="get-started-next" class="bg-blue-600 text-white px-4 py-2 rounded">${state.currentIndex < QUESTIONS.length - 1 ? 'Next' : 'Finish'}</button></div>`;
    containerEl.innerHTML = htmlFs;
    // initialize selection set
    const selected = new Set<string>(Array.isArray(state.answers[key]) ? state.answers[key] as string[] : []);
    // attach toggle handlers
    containerEl.querySelectorAll('.js-features-btn').forEach(btn => {
      const b = btn as HTMLElement;
      const val = b.getAttribute('data-value')!;
      // Apply selected/unselected styling on load
      if (selected.has(val)) {
        b.classList.add('bg-gray-700', 'text-white');
        b.classList.remove('bg-gray-200', 'text-gray-800', 'hover:bg-gray-300');
      }
      b.addEventListener('click', () => {
        if (selected.has(val)) {
          // Deselect: revert to light gray
          selected.delete(val);
          b.classList.remove('bg-gray-700', 'text-white');
          b.classList.add('bg-gray-200', 'text-gray-800', 'hover:bg-gray-300');
        } else {
          // Select: dark gray background, white text
          selected.add(val);
          b.classList.add('bg-gray-700', 'text-white');
          b.classList.remove('bg-gray-200', 'text-gray-800', 'hover:bg-gray-300');
        }
        state.answers[key] = Array.from(selected);
      });
    });
    // attach navigation handlers
    document.getElementById('get-started-next')?.addEventListener('click', async () => {
      state.currentQuestionKey = key;
      state.clarificationCounts[key] = 0;
      state.clarifyMessages = [];
      await requestClarification();
    });
    if (state.currentIndex > 0) {
      document.getElementById('get-started-prev')?.addEventListener('click', () => {
        state.currentIndex--;
        renderQuestion();
      });
    }
    return;
  }
  // Build HTML
  let html = `<p class="mb-4 text-gray-600">Help us understand your idea and needs and we can get started free of charge.</p>
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
  // Attach handlers
  if (type === 'choice') {
    container.querySelectorAll('.js-choice-btn').forEach(btn => btn.addEventListener('click', e => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-value');
      state.answers[key] = val;
      // Update summary panel for structured inputs
      refreshRawSummary();
      // Proceed to next question
      state.currentIndex++;
      renderQuestion();
    }));
  } else {
    const textarea = document.getElementById('get-started-answer') as HTMLTextAreaElement;
    textarea.addEventListener('blur', e => state.answers[key] = (e.target as HTMLTextAreaElement).value);
    const nextBtn = document.getElementById('get-started-next');
    if (nextBtn) nextBtn.addEventListener('click', async () => {
      // Save answer and immediately refresh summary
      state.answers[key] = textarea.value;
      await updateSummary();
      // Proceed to next question
      proceedToNextQuestion();
      renderQuestion();
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
    const aiResp = await callTools(messages);
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
  QUESTIONS.forEach(q => {
    const key = q.key;
    const answer = state.answers[key];
    if (answer) {
      const promptText = typeof q.question === 'function'
        ? q.question(state.answers)
        : q.question;
      messages.push({
        role: 'user',
        content: `${promptText}\nAnswer: ${answer}`
      });
    }
  });
  try {
    const aiResp = await callTools(messages);
    // If AI wants to ask a clarifying question
    const clar = aiResp.summary?.question;
    if (clar) {
      state.currentClarifyQuestion = clar;
      renderFollowup();
      return;
    }
    // Otherwise, process JSON summary
    let parsed: any;
    if (aiResp.summary) {
      parsed = aiResp.summary;
    } else if (aiResp.content && typeof aiResp.content === 'object') {
      parsed = aiResp.content;
    } else {
      try {
        parsed = JSON.parse(aiResp.content || '');
      } catch {
        summaryEl.innerHTML = `<pre class="whitespace-pre-wrap">${
          typeof aiResp.content === 'string'
            ? aiResp.content
            : JSON.stringify(aiResp.content, null, 2)
        }</pre>`;
        return;
      }
    }
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