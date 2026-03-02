import { StepProps } from '../types';

interface PromptProps extends StepProps {
  onFinishManually: () => void;
  onStartSmartSetup: () => void;
}

export default function OnboardingPrompt({ onFinishManually, onStartSmartSetup }: PromptProps) {
  return (
    <div class="step-container">
      <h2>Success! Project Created.</h2>
      <div class="wizard-content center-text">
        <p>Do you want to run the <b>Smart Setup Wizard</b> to configure your components?</p>
      </div>
      <div class="wizard-actions">
        <button class="btn-secondary" onClick={onFinishManually}>I'll do it manually</button>
        <button class="btn-primary" onClick={onStartSmartSetup}>Start Smart Setup</button>
      </div>
    </div>
  );
}