import { StepProps } from '../types';
import CostInputs from './CostInputs';

export default function GeneratorStep({ data, updateSection, updateNested, nextStep, onSkip, onBack, showAdvanced = false, setShowAdvanced}: StepProps) {

  return (
     <div class="step-container">
      <div class="wizard-content">
         <label>Capacity (kW)</label>
         <input id="input-generator-capacity" type="number" class="big-input" placeholder="0.0" 
            value={data.generator.capacityKw || ''}
            onInput={(e) => {
               const val = Number(e.currentTarget.value);
               updateSection('generator','capacityKw', val); 
               updateSection('generator','enabled',true);
               updateNested('generator', 'costs', 'capital', val * 500);
            }}/>

         <button class="toggle-advanced" onClick={() => setShowAdvanced?.(!showAdvanced)}>
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
         <button class="btn-secondary" onClick={onBack}>Previous</button>
         <button class="btn-skip" onClick={onSkip}>Skip</button>
         <button class="btn-primary" onClick={() => nextStep('LOADS')}>Next: Loads</button>
      </div>
    </div>
  );
}