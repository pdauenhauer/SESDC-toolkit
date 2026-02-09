import { useState } from 'preact/hooks';
import { StepProps } from '../types';
import { BATTERY_PRESETS } from '../constants';

import CostInputs from './CostInputs';

export default function BatteryStep({ data, updateSection, updateNested, nextStep, onSkip }: StepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div class="step-container">
      <div class="step-header">
         <h2>Battery Storage</h2>
         <span class="live-cost">Est. Cost: ${data.battery.costs.capital.toLocaleString()}</span>
      </div>
      <div class="wizard-content">
         <label>Battery Technology</label>
         <div class="preset-cards">
           <div class="card" onClick={() => {
              updateSection('battery', 'type', 'Lithium-Ion');
              updateNested('battery', 'costs', 'capital', (data.battery.storageKwh || 1) * BATTERY_PRESETS.lithium.costPerKwh);
           }}>
              <strong>Lithium-Ion</strong><small>High perf, 10yr life</small>
           </div>
           <div class="card" onClick={() => {
              updateSection('battery', 'type', 'Lead-Acid');
              updateNested('battery', 'costs', 'capital', (data.battery.storageKwh || 1) * BATTERY_PRESETS.lead.costPerKwh);
           }}>
              <strong>Lead-Acid</strong><small>Cheap, 5yr life</small>
           </div>
         </div>
         
         <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
            <div>
              <label>Capacity (kWh)</label>
              <input type="number" class="big-input" placeholder="0.0" 
                 value={data.battery.storageKwh || ''}
                 onInput={(e) => {
                    const val = Number(e.currentTarget.value);
                    updateSection('battery','storageKwh', val);
                    updateSection('battery','enabled', true);
                    const price = data.battery.type === 'Lithium-Ion' ? BATTERY_PRESETS.lithium.costPerKwh : BATTERY_PRESETS.lead.costPerKwh;
                    updateNested('battery', 'costs', 'capital', val * price);
                 }}/>
            </div>
            <div>
              <label>Charge Rate (kW)</label>
              <input type="number" class="big-input" placeholder="0.0" 
                value={data.battery.chargeKw || ''}
                onInput={(e) => updateSection('battery','chargeKw', Number(e.currentTarget.value))}/>
            </div>
         </div>
         
         <button class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? 'Hide Details' : 'Fine Tune Details'}</button>
         {showAdvanced && <CostInputs section="battery" data={data} updateSection={updateSection} updateNested={updateNested} />}
      </div>
      <div class="wizard-actions">
         <button class="btn-skip" onClick={onSkip}>Skip Battery</button>
         <button class="btn-primary" onClick={() => nextStep('WIND')}>Next: Wind</button>
      </div>
    </div>
  );
}