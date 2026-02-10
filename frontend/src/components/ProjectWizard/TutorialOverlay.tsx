// src/components/ProjectWizard/TutorialOverlay.tsx
import './TutorialOverlay.css';
import { TutorialStep } from './tutorialData';

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isVisible: boolean;
  onClose: () => void;
  mode: 'tour' | 'help';
}

export default function TutorialOverlay({ steps, isVisible, onClose, mode }: TutorialOverlayProps) {
  if (!isVisible) return null;

  return (
    <div class="tutorial-layer">
      {/* Dim the background only in 'tour' mode */}
      {mode === 'tour' && <div class="tutorial-backdrop" onClick={onClose} />}

      {steps.map((step, index) => (
        <div 
           key={index}
           class={`tutorial-bubble position-${step.position || 'center'}`}
        >
          <h4>{step.title}</h4>
          <p>{step.text}</p>
        </div>
      ))}
      
      <button class="tutorial-close-btn" onClick={onClose}>
        {mode === 'tour' ? 'Exit Tour' : 'Close Help'}
      </button>
    </div>
  );
}