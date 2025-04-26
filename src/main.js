import './style.css';
import { initGetStarted } from './getStarted.js';

console.log('main.js loaded');
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired: initializing UI components');
  initGetStarted();
  initTiles();
});

// Initialize clickable project tiles to show more info modal
function initTiles() {
  const TILE_INFO = {
    'Web Pages': {
      title: 'Web Pages',
      content: '<p>Custom, modern, and tailored websites designed to represent your brand and engage users. We focus on responsive layouts, performance, and SEO best practices.</p>'
    },
    'Mobile Apps': {
      title: 'Mobile Apps',
      content: '<p>Native and cross-platform iOS & Android apps built to provide seamless experiences. We handle everything from wireframes to App Store deployment.</p>'
    },
    'Web Apps': {
      title: 'Web Apps',
      content: '<p>Scalable web applications for business or personal needs, including SaaS platforms, dashboards, and data-intensive tools.</p>'
    },
    'Custom Integrations': {
      title: 'Custom Integrations',
      content: '<p>APIs, chatbots, and automation solutions that integrate with your existing systems and streamline your workflows.</p>'
    }
  };
  const modal = document.getElementById('tile-info-modal');
  const titleEl = document.getElementById('tile-info-title');
  const contentEl = document.getElementById('tile-info-content');
  const closeBtn = document.getElementById('tile-info-close');
  document.querySelectorAll('.js-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const key = tile.getAttribute('data-type');
      const info = TILE_INFO[key];
      if (!info) return;
      titleEl.textContent = info.title;
      contentEl.innerHTML = info.content;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  });
  // Initialize clickable process steps
  const STEP_INFO = {
    'Get Started': {
      title: 'Step 1: Get Started',
      content: '<p>We discuss your idea and requirements in a free session to align on scope and goals.</p>'
    },
    'Initial Design & Prototype': {
      title: 'Step 2: Initial Design & Prototype',
      content: '<p>We create mockups and interactive prototypes so you can visualize the final product before development.</p>'
    },
    'Development': {
      title: 'Step 3: Development',
      content: '<p>Our team builds your product using modern frameworks and AI-assisted workflows for speed and efficiency.</p>'
    },
    'Launch & Support': {
      title: 'Step 4: Launch & Support',
      content: '<p>We handle deployment, monitoring, and ongoing maintenance to keep your product running smoothly.</p>'
    }
  };
  document.querySelectorAll('.js-step').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const key = stepEl.getAttribute('data-step');
      const info = STEP_INFO[key];
      if (!info) return;
      titleEl.textContent = info.title;
      contentEl.innerHTML = info.content;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  });
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });
}
