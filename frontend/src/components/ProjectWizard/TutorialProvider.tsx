import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import { useState } from 'preact/hooks';

type TutorialMode = 'tour' | 'help';

interface TutorialContextValue {
  showTutorial: boolean;
  tutorialMode: TutorialMode;
  tutorialOverlayStepIndex: number;
  tutorialRunId: number;
  startTour: () => void;
  startHelp: () => void;
  stopTutorial: () => void;
  setTutorialOverlayStepIndex: (index: number) => void;
  bumpTutorialRunId: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: ComponentChildren }) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<TutorialMode>('help');
  const [tutorialOverlayStepIndex, setTutorialOverlayStepIndex] = useState(0);
  const [tutorialRunId, setTutorialRunId] = useState(0);

  const bumpTutorialRunId = () => {
    setTutorialRunId((v) => v + 1);
  };

  const startTour = () => {
    setTutorialMode('tour');
    setTutorialOverlayStepIndex(0);
    bumpTutorialRunId();
    setShowTutorial(true);
  };

  const startHelp = () => {
    setTutorialMode('help');
    setTutorialOverlayStepIndex(0);
    bumpTutorialRunId();
    setShowTutorial(true);
  };

  const stopTutorial = () => {
    setShowTutorial(false);
  };

  return (
    <TutorialContext.Provider
      value={{
        showTutorial,
        tutorialMode,
        tutorialOverlayStepIndex,
        tutorialRunId,
        startTour,
        startHelp,
        stopTutorial,
        setTutorialOverlayStepIndex,
        bumpTutorialRunId
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return ctx;
}
