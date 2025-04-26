import './style.css';
import { initGetStarted } from './getStarted.js';

console.log('main.js loaded');
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired: initializing GetStarted');
  initGetStarted();
});
