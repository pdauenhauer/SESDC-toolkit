import { useState } from 'preact/hooks';
import { StepProps } from '../types';
import CostInputs from './CostInputs';

export default function WindStep({ data, updateSection, updateNested, nextStep, onSkip, onBack }: StepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div class="step-container">
      <div class="step-header">
        <h2>Wind Turbine</h2>
        <span class="live-cost">Est. Cost: ${data.wind.costs.capital.toLocaleString()}</span>
      </div>
      <div class="wizard-content">
         <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            <div>
               <label>Nameplate (kW) <span style={{color:'red'}}>*</span></label>
               <input id="input-wind-nameplate" type="number" class="big-input" placeholder="0.0" 
                 value={data.wind.nameplateKw || ''}
                 onInput={(e) => {
                    const val = Number(e.currentTarget.value);
                    updateSection('wind','nameplateKw', val); 
                    updateSection('wind','enabled',true);
                    updateNested('wind', 'costs', 'capital', val * 1200);
                 }}/>
            </div>
            <div>
               <label>Power/Turbine (kW)</label>
               <input type="number" class="big-input" placeholder="0.0" 
                 value={data.wind.powerPerTurbineKw || ''}
                 onInput={(e) => updateSection('wind','powerPerTurbineKw', Number(e.currentTarget.value))}/>
            </div>
         </div>

         <button id="input-wind-advanced" class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide Details' : 'Fine Tune (Speeds & Costs)'}
         </button>

         {showAdvanced && (
            <div>
               <div class="advanced-section" style={{marginBottom:'10px'}}>
                  <h4>Wind Speeds (m/s)</h4>
                  <div class="grid-3">
                      <label>Cut-in: <input type="number" placeholder="3.0" value={data.wind.speeds.cutIn} onChange={(e)=>updateNested('wind','speeds','cutIn',e.currentTarget.value)}/></label>
                      <label>Rated: <input type="number" placeholder="12.0" value={data.wind.speeds.rated} onChange={(e)=>updateNested('wind','speeds','rated',e.currentTarget.value)}/></label>
                      <label>Cut-out: <input type="number" placeholder="25.0" value={data.wind.speeds.cutOut} onChange={(e)=>updateNested('wind','speeds','cutOut',e.currentTarget.value)}/></label>
                  </div>
               </div>
               <CostInputs section="wind" data={data} updateSection={updateSection} updateNested={updateNested} />
            </div>
         )}
      </div>
      <div class="wizard-actions"><button class="btn-secondary" onClick={onBack}>Previous</button>
         <button class="btn-skip" onClick={onSkip}>Skip Wind</button>
         <button class="btn-primary" onClick={() => nextStep('GENERATOR')}>Next: Generator</button>
      </div>
    </div>
  );
}