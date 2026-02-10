import { useState } from 'preact/hooks';
import { StepProps } from '../types';
import CostInputs from './CostInputs';

export default function GeneratorStep({ data, updateSection, updateNested, nextStep, onSkip }: StepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
     <div class="step-container">
      <div class="step-header">
        <h2>Diesel Generator</h2>
        <span class="live-cost">Est. Cost: ${data.generator.costs.capital.toLocaleString()}</span>
      </div>
      <div class="wizard-content">
         <label>Capacity (kW)</label>
         <input type="number" class="big-input" placeholder="0.0" 
            value={data.generator.capacityKw || ''}
            onInput={(e) => {
               const val = Number(e.currentTarget.value);
               updateSection('generator','capacityKw', val); 
               updateSection('generator','enabled',true);
               updateNested('generator', 'costs', 'capital', val * 500);
            }}/>

         <button class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide Details' : 'Fine Tune (Fuel & Costs)'}
         </button>

         {showAdvanced && (
            <div>
               <div class="advanced-section" style={{marginBottom: '10px'}}>
                  <label>Fuel Price ($/Liter)</label>
                  <input type="number" placeholder="1.50" 
                    value={data.generator.costs.fuelPrice}
                    onInput={(e) => updateNested('generator', 'costs', 'fuelPrice', e.currentTarget.value)} />
               </div>
               <CostInputs section="generator" data={data} updateSection={updateSection} updateNested={updateNested} />
            </div>
         )}
      </div>
      <div class="wizard-actions">
         <button class="btn-skip" onClick={onSkip}>Skip</button>
         <button class="btn-primary" onClick={() => nextStep('LOADS')}>Next: Loads</button>
      </div>
    </div>
  );
}