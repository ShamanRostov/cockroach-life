import type { PlacedRoom } from '../types';

export type TutorialStepId = 'welcome' | 'buildKitchen' | 'foodArcade' | 'worldMap' | 'complete';

const STEP_ORDER: TutorialStepId[] = [
  'welcome',
  'buildKitchen',
  'foodArcade',
  'worldMap',
  'complete',
];

export const TUTORIAL_STEP_COUNT = STEP_ORDER.length - 1;

export class TutorialSystem {
  tutorialComplete = true;
  currentStep: TutorialStepId = 'welcome';

  /** Old saves without the field: skip tutorial if the player already built rooms. */
  static inferCompleteFromSave(
    rooms: PlacedRoom[],
    saved?: boolean,
  ): boolean {
    if (saved === true) return true;
    if (saved === false) return false;
    return rooms.length > 0;
  }

  load(
    savedComplete: boolean | undefined,
    rooms: PlacedRoom[],
    savedStep?: TutorialStepId,
  ): void {
    this.tutorialComplete = TutorialSystem.inferCompleteFromSave(rooms, savedComplete);
    if (!this.tutorialComplete) {
      this.currentStep =
        savedStep && STEP_ORDER.includes(savedStep) ? savedStep : 'welcome';
    }
  }

  isActive(): boolean {
    return !this.tutorialComplete && this.currentStep !== 'complete';
  }

  getStepIndex(): number {
    const idx = STEP_ORDER.indexOf(this.currentStep);
    return idx < 0 ? 0 : Math.min(idx, TUTORIAL_STEP_COUNT);
  }

  advance(): void {
    const idx = STEP_ORDER.indexOf(this.currentStep);
    if (idx >= 0 && idx < STEP_ORDER.length - 1) {
      this.currentStep = STEP_ORDER[idx + 1]!;
    }
  }

  skip(): void {
    this.tutorialComplete = true;
    this.currentStep = 'complete';
  }

  onKitchenBuilt(): void {
    if (this.currentStep === 'buildKitchen') this.advance();
  }

  onFoodArcadeStarted(): void {
    if (this.currentStep === 'foodArcade') this.advance();
  }

  onWorldMapVisited(): boolean {
    if (this.currentStep !== 'worldMap') return false;
    this.currentStep = 'complete';
    return true;
  }

  completeWithReward(): { food: number; money: number } {
    this.tutorialComplete = true;
    return { food: 50, money: 30 };
  }
}
