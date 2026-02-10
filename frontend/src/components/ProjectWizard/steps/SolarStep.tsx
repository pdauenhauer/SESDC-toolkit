// src/components/ProjectWizard/steps/SolarStep.tsx

import { useState } from 'preact/hooks';
import { StepProps } from '../types';
import { SOLAR_PRESETS } from '../constants';
import CostInputs from './CostInputs';

export default function SolarStep({ data, updateSection, updateNested, nextStep, onSkip }: StepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local helper specific to Solar Logic
  const applySolarPreset = (type: 'standard' | 'premium') => {
    const p = SOLAR_PRESETS[type];
    const currentSize = data.solar.sizeKw || 1;
    const estimatedCost = currentSize * p.costPerKw;
    
    // We manually update the nested state using the functions passed from parent
//Upgraded bulk function in future is possible
    updateSection('solar', 'losses', p.losses);
    updateNested('solar', 'costs', 'capital', estimatedCost);
  };

  return (
    <div class="step-container">
      <div class="step-header">
        <h2>Solar Configuration</h2>
        <span class="live-cost">Est. Cost: ${data.solar.costs.capital.toLocaleString()}</span>
      </div>
      
      <div class="wizard-content">
        <label>Quick Presets</label>
        <div class="preset-cards">
           <div class="card" onClick={() => applySolarPreset('standard')}>
              <strong>Standard</strong><small>Avg Efficiency</small>
           </div>
           <div class="card" onClick={() => applySolarPreset('premium')}>
              <strong>Premium</strong><small>High Efficiency</small>
           </div>
        </div>

        <label style={{marginTop: '15px'}}>System Size (kW) <span style={{color:'red'}}>*</span></label>
        <input type="number" class="big-input" placeholder="0.0" 
          value={data.solar.sizeKw || ''}
          onInput={(e) => { 
            const val = Number(e.currentTarget.value);
            updateSection('solar', 'sizeKw', val); 
            updateSection('solar', 'enabled', true);
            // Auto-calculate cost based on a default $1000/kw if user types manually
            updateNested('solar', 'costs', 'capital', val * 1000);
          }} 
        />

        <button class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? 'Hide Advanced Settings' : 'Fine Tune (Losses & Detailed Costs)'}
        </button>

        {showAdvanced && (
          <div>
            <div class="advanced-section" style={{marginBottom: '10px'}}>
               <h4>System Losses (%)</h4>
               <div class="grid-3">
                  <label>Wire: <input type="number" value={data.solar.losses.wire} onChange={(e) => updateNested('solar','losses','wire',e.currentTarget.value)}/></label>
                  <label>Dust: <input type="number" value={data.solar.losses.dust} onChange={(e) => updateNested('solar','losses','dust',e.currentTarget.value)}/></label>
                  <label>Mismatch: <input type="number" value={data.solar.losses.mismatch} onChange={(e) => updateNested('solar','losses','mismatch',e.currentTarget.value)}/></label>
               </div>
            </div>
            
            {}
            <CostInputs 
                section="solar" 
                data={data} 
                updateSection={updateSection} 
                updateNested={updateNested} 
            />
          </div>
        )}
      </div>

      <div class="wizard-actions">
        <button class="btn-skip" onClick={onSkip}>Skip Solar</button>
        <button class="btn-primary" onClick={() => nextStep('BATTERY')}>Next: Battery</button>
      </div>
    </div>
  );
}