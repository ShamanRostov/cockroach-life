import type { PlacedRoom } from '../types';
import { TUTORIAL_COMPLETE_REWARD } from './GameBalance';

/**
 * Soft onboarding across ~10 minutes of play.
 * Steps advance by natural actions; tips are short and always skippable.
 * No fail-states are forced — counter-raids stay off while active.
 */
export type TutorialStepId =
  | 'welcome'
  | 'buildKitchen'
  | 'passiveTip'
  | 'buildBedroom'
  | 'foodArcade'
  | 'setTrap'
  | 'trySlipper'
  | 'upgradeTip'
  | 'worldMap'
  | 'complete';

const STEP_ORDER: TutorialStepId[] = [
  'welcome',
  'buildKitchen',
  'passiveTip',
  'buildBedroom',
  'foodArcade',
  'setTrap',
  'trySlipper',
  'upgradeTip',
  'worldMap',
  'complete',
];

/** Steps that only need "Got it" — no gameplay gate. */
export const TUTORIAL_DISMISSABLE_STEPS: TutorialStepId[] = [
  'welcome',
  'passiveTip',
  'upgradeTip',
];

export const TUTORIAL_STEP_COUNT = STEP_ORDER.length - 1;

const LEGACY_STEP_MAP: Record<string, TutorialStepId> = {
  welcome: 'welcome',
  buildKitchen: 'buildKitchen',
  foodArcade: 'foodArcade',
  worldMap: 'worldMap',
  complete: 'complete',
};

export class TutorialSystem {
  tutorialComplete = true;
  currentStep: TutorialStepId = 'welcome';

  /** Old saves without the field: skip tutorial if the player already built rooms. */
  static inferCompleteFromSave(rooms: PlacedRoom[], saved?: boolean): boolean {
    if (saved === true) return true;
    if (saved === false) return false;
    return rooms.length > 0;
  }

  load(
    savedComplete: boolean | undefined,
    rooms: PlacedRoom[],
    savedStep?: string,
  ): void {
    this.tutorialComplete = TutorialSystem.inferCompleteFromSave(rooms, savedComplete);
    if (!this.tutorialComplete) {
      const mapped = savedStep ? LEGACY_STEP_MAP[savedStep] ?? (STEP_ORDER.includes(savedStep as TutorialStepId) ? (savedStep as TutorialStepId) : null) : null;
      this.currentStep = mapped && STEP_ORDER.includes(mapped) ? mapped : 'welcome';
    }
  }

  isActive(): boolean {
    return !this.tutorialComplete && this.currentStep !== 'complete';
  }

  getStepIndex(): number {
    const idx = STEP_ORDER.indexOf(this.currentStep);
    return idx < 0 ? 0 : Math.min(idx, TUTORIAL_STEP_COUNT);
  }

  isDismissable(): boolean {
    return TUTORIAL_DISMISSABLE_STEPS.includes(this.currentStep);
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

  onBedroomBuilt(): void {
    if (this.currentStep === 'buildBedroom') this.advance();
  }

  onFoodArcadeStarted(): void {
    if (this.currentStep === 'foodArcade') this.advance();
  }

  onFoodArcadeCompleted(): void {
    if (this.currentStep === 'foodArcade') this.advance();
  }

  onTrapToggled(): void {
    if (this.currentStep === 'setTrap') this.advance();
  }

  onSlipperStarted(): void {
    if (this.currentStep === 'trySlipper') this.advance();
  }

  onBuildingUpgraded(): void {
    if (this.currentStep === 'upgradeTip' || this.currentStep === 'trySlipper') {
      if (this.currentStep === 'trySlipper') {
        // Allow skipping slipper by upgrading instead
        this.currentStep = 'worldMap';
        return;
      }
      this.advance();
    }
  }

  onWorldMapVisited(): boolean {
    if (this.currentStep !== 'worldMap') return false;
    this.currentStep = 'complete';
    return true;
  }

  completeWithReward(): { food: number; money: number } {
    this.tutorialComplete = true;
    this.currentStep = 'complete';
    return { ...TUTORIAL_COMPLETE_REWARD };
  }
}
