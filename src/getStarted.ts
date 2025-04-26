// Module: getStarted.ts
// Shim for the Get Started flow, delegating UI logic to ui.ts

import { createPanel, attachHandlers, showPanel, hidePanel, renderQuestion } from './ui';

/** Initialize the Get Started flow */
export function initGetStarted(): void {
  createPanel();
  attachHandlers(
    () => { showPanel(); renderQuestion(); },
    () => { hidePanel(); }
  );
}