import { StepProps } from '../types';

interface NameStepProps extends StepProps {
  setData: any; // Using explicit prop for setting full state if needed
  onClose: () => void;
}

export default function NameStep({ data, setData, nextStep, onClose }: NameStepProps) {
  return (
    <div class="step-container">
      <h2>Let's start a new project.</h2>
      <div class="wizard-content">
        <label>Project Name</label>
        <input 
          type="text" 
          value={data.name} 
          class="big-input"
          onInput={(e) => setData({ ...data, name: e.currentTarget.value })}
          placeholder="My Microgrid Project" 
          autoFocus 
        />
      </div>
      <div class="wizard-actions">
        <button class="btn-secondary" onClick={onClose}>Cancel</button>
        <button class="btn-primary" onClick={() => nextStep('ONBOARDING_PROMPT')} disabled={!data.name}>
          Create Project
        </button>
      </div>
    </div>
  );
}