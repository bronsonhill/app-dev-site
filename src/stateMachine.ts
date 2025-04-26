// Module: stateMachine.ts
// Manages state and navigation logic for the Get Started flow

import { QUESTIONS } from './questions';

/** Answers map: question key → user response */
export type Answers = { [key: string]: any };

/** The main state object for the flow */
export interface State {
  currentIndex: number;
  answers: Answers;
  clarificationCounts: { [key: string]: number };
  clarifyMessages: any[];
  inClarification: boolean;
  currentQuestionKey: string | null;
  currentClarifyQuestion: string;
}

/** Initial state */
export const state: State = {
  currentIndex: 0,
  answers: {},
  clarificationCounts: {},
  clarifyMessages: [],
  inClarification: false,
  currentQuestionKey: null,
  currentClarifyQuestion: ''
};

/** Advance currentIndex past any questions whose condition is unmet */
export function skipToNextValidIndex(): void {
  while (state.currentIndex < QUESTIONS.length) {
    const q = QUESTIONS[state.currentIndex];
    if (q.condition && !q.condition(state.answers)) {
      state.currentIndex++;
      continue;
    }
    break;
  }
}

/** Get the current question, after skipping unmet ones */
export function getCurrentQuestion() {
  skipToNextValidIndex();
  return QUESTIONS[state.currentIndex];
}

/** Move to the next question (exits clarification mode) */
export function proceedToNextQuestion(): void {
  state.inClarification = false;
  state.clarifyMessages = [];
  state.currentClarifyQuestion = '';
  if (state.currentIndex < QUESTIONS.length - 1) {
    state.currentIndex++;
  }
  skipToNextValidIndex();
}

/** Move back one question */
export function moveToPreviousQuestion(): void {
  if (state.currentIndex > 0) {
    state.currentIndex--;
  }
}

/** Record an answer */
export function setAnswer(key: string, value: any): void {
  state.answers[key] = value;
}

/** Reset clarification tracking for a question */
export function resetClarification(key: string): void {
  state.clarificationCounts[key] = 0;
  state.clarifyMessages = [];
  state.currentClarifyQuestion = '';
}