import { StepProps } from '../types';

interface PromptProps extends StepProps {
  onFinishManually: () => void;
  onStartTutorial: () => void;
}

export default function OnboardingPrompt({ onFinishManually, onStartTutorial }: PromptProps) {
  return (
    <div class="step-container">
      <div class="wizard-content wizard-prompt-copy">
        <p class="wizard-lead">
          Do you want to run the <strong>Tutorial</strong> to configure your components?
        </p>
      </div>
      <div class="wizard-actions wizard-actions-onboarding">
        <button type="button" class="btn-secondary" onClick={onFinishManually}>
          I'll do it manually
        </button>
        <button type="button" class="btn-primary" onClick={onStartTutorial}>
          Start Tutorial
        </button>
      </div>
    </div>
  );
}
