import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import '../css/ProjectWizard.scss';

interface ProjectWizardProps {
  onClose: () => void;
  onFinish: (projectData: any) => void;
}

type WizardStep = 'NAME' | 'ONBOARDING_PROMPT' | 'SOLAR' | 'BATTERY' | 'WIND' | 'GENERATOR' | 'LOADS';

// SMART PRESETS
const SOLAR_PRESETS = {
  standard: { losses: { wire: 2, mismatch: 5, aging: 0.5, dust: 3, converter: 4 }, costPerKw: 1000 },
  premium:  { losses: { wire: 1, mismatch: 2, aging: 0.3, dust: 1, converter: 2 }, costPerKw: 1500 },
};

const BATTERY_PRESETS = {
  lithium: { type: 'Lithium-Ion', lifespan: 10, costPerKwh: 400 },
  lead:    { type: 'Lead-Acid',    lifespan: 5,  costPerKwh: 150 },
};

export default function ProjectWizard({ onClose, onFinish }: ProjectWizardProps) {
  const [step, setStep] = useState<WizardStep>('NAME');
  const [showAdvanced, setShowAdvanced] = useState(false);

  //STATE
  const [data, setData] = useState({
    name: '',
    solar: {
      enabled: false,
      sizeKw: 0,
      losses: { wire: 2, mismatch: 5, aging: 0.5, dust: 3, converter: 4 },
      costs: { capital: 0, opPercent: 1, opDollar: 0, repPercent: 0, repDollar: 0 },
      lifespan: 25
    },
    battery: {
      enabled: false,
      type: 'Lithium-Ion',
      storageKwh: 0,
      chargeKw: 0,
      costs: { capital: 0, opPercent: 1, opDollar: 0, repPercent: 0, repDollar: 0 },
      lifespan: 10
    },
    wind: {
      enabled: false,
      nameplateKw: 0,
      powerPerTurbineKw: 0,
      speeds: { cutIn: 3, rated: 12, cutOut: 25 },
      costs: { capital: 0, opPercent: 1, opDollar: 0, repPercent: 0, repDollar: 0 },
      lifespan: 20
    },
    generator: {
      enabled: false,
      capacityKw: 0,
      costs: { capital: 0, opPercent: 5, opDollar: 0, repPercent: 0, repDollar: 0, fuelPrice: 1.50 },
      lifespan: 15
    },
    loads: Array(24).fill(0)
  });

  //LIVE COST CALCULATOR
  const totalCost = useMemo(() => {
    let total = 0;
    if (data.solar.enabled) total += Number(data.solar.costs.capital);
    if (data.battery.enabled) total += Number(data.battery.costs.capital);
    if (data.wind.enabled) total += Number(data.wind.costs.capital);
    if (data.generator.enabled) total += Number(data.generator.costs.capital);
    return total;
  }, [data]);

  //HELPERS
  const updateSection = (section: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section as keyof typeof prev], [field]: value }
    }));
  };

  const updateNested = (section: string, category: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { 
        ...prev[section as keyof typeof prev], 
        [category]: {
          // @ts-ignore
          ...prev[section][category],
          [field]: value
        } 
      }
    }));
  };

  const applySolarPreset = (type: 'standard' | 'premium') => {
    const p = SOLAR_PRESETS[type];
    const estimatedCost = (data.solar.sizeKw || 1) * p.costPerKw;
    setData(prev => ({
      ...prev,
      solar: {
        ...prev.solar,
        losses: p.losses,
        costs: { ...prev.solar.costs, capital: estimatedCost }
      }
    }));
  };

  const generateLoadProfile = (type: 'residential' | 'commercial' | 'industrial', peak: number) => {
    let curve: number[] = [];
    if (type === 'residential') {
      curve = [0.2, 0.2, 0.2, 0.2, 0.3, 0.4, 0.6, 0.6, 0.5, 0.4, 0.4, 0.4, 0.4, 0.4, 0.5, 0.6, 0.8, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.3];
    } else if (type === 'commercial') {
      curve = [0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1];
    } else {
      curve = Array(24).fill(0.8);
    }
    const scaled = curve.map(v => Math.round(v * peak));
    setData(prev => ({ ...prev, loads: scaled }));
  };

  const nextStep = (next: WizardStep) => {
    setShowAdvanced(false);
    setStep(next);
  };

  const handleFinalSubmit = () => {
    onFinish(data);
    onClose();
  };

  //REUSABLE COMPONENTS
  const renderCostInputs = (section: string) => (
    <div class="advanced-section fade-in">
      <h4 style={{marginTop:0, color: '#666'}}>💰 Financial & Lifecycle</h4>
      
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
        <div>
           <label>Capital Cost ($)</label>
           <input type="number" value={data[section as keyof typeof data].costs.capital} 
             onInput={(e) => updateNested(section, 'costs', 'capital', e.currentTarget.value)} />
        </div>
        <div>
           <label>Lifespan (Years)</label>
           <input type="number" value={data[section as keyof typeof data].lifespan}
             onInput={(e) => updateSection(section, 'lifespan', e.currentTarget.value)} />
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
        <div>
           <label>Op Cost ($/yr)</label>
           <input type="number" value={data[section as keyof typeof data].costs.opDollar} 
             onInput={(e) => updateNested(section, 'costs', 'opDollar', e.currentTarget.value)} />
        </div>
        <div>
           <label>Replace Cost ($)</label>
           <input type="number" value={data[section as keyof typeof data].costs.repDollar}
             onInput={(e) => updateNested(section, 'costs', 'repDollar', e.currentTarget.value)} />
        </div>
      </div>
    </div>
  );

  // --- STEPS ---

  const renderNameStep = () => (
    <div class="step-container">
      <h2>Let's start a new project.</h2>
      <div class="wizard-content">
        <label>Project Name</label>
        <input type="text" value={data.name} class="big-input"
          onInput={(e) => setData({ ...data, name: e.currentTarget.value })}
          placeholder="My Microgrid Project" autoFocus />
      </div>
      <div class="wizard-actions">
        <button class="btn-secondary" onClick={onClose}>Cancel</button>
        <button class="btn-primary" onClick={() => nextStep('ONBOARDING_PROMPT')} disabled={!data.name}>Create Project</button>
      </div>
    </div>
  );

  const renderPromptStep = () => (
    <div class="step-container">
      <h2>Success! Project Created.</h2>
      <div class="wizard-content center-text">
        <p>Do you want to run the <b>Smart Setup Wizard</b> to configure your components?</p>
      </div>
      <div class="wizard-actions">
        <button class="btn-secondary" onClick={handleFinalSubmit}>I'll do it manually</button>
        <button class="btn-primary" onClick={() => nextStep('SOLAR')}>Start Smart Setup</button>
      </div>
    </div>
  );

  const renderSolarStep = () => (
    <div class="step-container">
      <div class="step-header">
        <h2>Solar Configuration</h2>
        <span class="live-cost">Est. Cost: ${data.solar.costs.capital}</span>
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
            const val = e.currentTarget.value;
            updateSection('solar', 'sizeKw', val); 
            updateSection('solar', 'enabled', true);
            updateNested('solar', 'costs', 'capital', Number(val) * 1000);
          }} />

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
            {renderCostInputs('solar')}
          </div>
        )}
      </div>
      <div class="wizard-actions">
        <button class="btn-skip" onClick={() => { updateSection('solar', 'enabled', false); nextStep('BATTERY'); }}>Skip Solar</button>
        <button class="btn-primary" onClick={() => nextStep('BATTERY')}>Next: Battery</button>
      </div>
    </div>
  );

  const renderBatteryStep = () => (
    <div class="step-container">
      <div class="step-header">
         <h2>Battery Storage</h2>
         <span class="live-cost">Est. Cost: ${data.battery.costs.capital}</span>
      </div>
      <div class="wizard-content">
         <label>Battery Technology</label>
         <div class="preset-cards">
           <div class="card" onClick={() => {
              updateSection('battery', 'type', 'Lithium-Ion');
              updateNested('battery', 'costs', 'capital', (data.battery.storageKwh || 1) * 400);
           }}>
              <strong>Lithium-Ion</strong><small>High perf, 10yr life</small>
           </div>
           <div class="card" onClick={() => {
              updateSection('battery', 'type', 'Lead-Acid');
              updateNested('battery', 'costs', 'capital', (data.battery.storageKwh || 1) * 150);
           }}>
              <strong>Lead-Acid</strong><small>Cheap, 5yr life</small>
           </div>
         </div>
         
         <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
            <div>
              <label>Capacity (kWh)</label>
              <input type="number" class="big-input" placeholder="0.0" 
                 onInput={(e) => {
                    const val = e.currentTarget.value;
                    updateSection('battery','storageKwh', val);
                    updateSection('battery','enabled', true);
                    const price = data.battery.type === 'Lithium-Ion' ? 400 : 150;
                    updateNested('battery', 'costs', 'capital', Number(val) * price);
                 }}/>
            </div>
            <div>
              <label>Charge Rate (kW)</label>
              <input type="number" class="big-input" placeholder="0.0" onInput={(e) => updateSection('battery','chargeKw',e.currentTarget.value)}/>
            </div>
         </div>
         
         <button class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? 'Hide Details' : 'Fine Tune Details'}</button>
         {showAdvanced && renderCostInputs('battery')}
      </div>
      <div class="wizard-actions">
         <button class="btn-skip" onClick={() => { updateSection('battery', 'enabled', false); nextStep('WIND'); }}>Skip Battery</button>
         <button class="btn-primary" onClick={() => nextStep('WIND')}>Next: Wind</button>
      </div>
    </div>
  );

  const renderWindStep = () => (
    <div class="step-container">
      <div class="step-header">
        <h2>Wind Turbine</h2>
        <span class="live-cost">Est. Cost: ${data.wind.costs.capital}</span>
      </div>
      <div class="wizard-content">
         <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
            <div>
               <label>Nameplate (kW) <span style={{color:'red'}}>*</span></label>
               <input type="number" class="big-input" placeholder="0.0" 
                 onInput={(e) => {
                    updateSection('wind','nameplateKw',e.currentTarget.value); 
                    updateSection('wind','enabled',true);
                    updateNested('wind', 'costs', 'capital', Number(e.currentTarget.value) * 1200);
                 }}/>
            </div>
            <div>
               <label>Power/Turbine (kW)</label>
               <input type="number" class="big-input" placeholder="0.0" onInput={(e) => updateSection('wind','powerPerTurbineKw',e.currentTarget.value)}/>
            </div>
         </div>

         <button class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide Details' : 'Fine Tune (Speeds & Costs)'}
         </button>

         {showAdvanced && (
            <div>
               <div class="advanced-section" style={{marginBottom:'10px'}}>
                  <h4>🌬️ Wind Speeds (m/s)</h4>
                  <div class="grid-3">
                     <label>Cut-in: <input type="number" placeholder="3.0" onChange={(e)=>updateNested('wind','speeds','cutIn',e.currentTarget.value)}/></label>
                     <label>Rated: <input type="number" placeholder="12.0" onChange={(e)=>updateNested('wind','speeds','rated',e.currentTarget.value)}/></label>
                     <label>Cut-out: <input type="number" placeholder="25.0" onChange={(e)=>updateNested('wind','speeds','cutOut',e.currentTarget.value)}/></label>
                  </div>
               </div>
               {renderCostInputs('wind')}
            </div>
         )}
      </div>
      <div class="wizard-actions">
         <button class="btn-skip" onClick={() => { updateSection('wind', 'enabled', false); nextStep('GENERATOR'); }}>Skip Wind</button>
         <button class="btn-primary" onClick={() => nextStep('GENERATOR')}>Next: Generator</button>
      </div>
    </div>
  );

  const renderGeneratorStep = () => (
     <div class="step-container">
      <div class="step-header">
        <h2>Diesel Generator</h2>
        <span class="live-cost">Est. Cost: ${data.generator.costs.capital}</span>
      </div>
      <div class="wizard-content">
         <label>Capacity (kW)</label>
         <input type="number" class="big-input" placeholder="0.0" 
            onInput={(e) => {
               updateSection('generator','capacityKw',e.currentTarget.value); 
               updateSection('generator','enabled',true);
               updateNested('generator', 'costs', 'capital', Number(e.currentTarget.value) * 500);
            }}/>

         <button class="toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide Details' : 'Fine Tune (Fuel & Costs)'}
         </button>

         {showAdvanced && (
            <div>
               <div class="advanced-section" style={{marginBottom: '10px'}}>
                  <label>Fuel Price ($/Liter)</label>
                  <input type="number" placeholder="1.50" 
                    onInput={(e) => updateNested('generator', 'costs', 'fuelPrice', e.currentTarget.value)} />
               </div>
               {renderCostInputs('generator')}
            </div>
         )}
      </div>
      <div class="wizard-actions">
         <button class="btn-skip" onClick={() => { updateSection('generator', 'enabled', false); nextStep('LOADS'); }}>Skip</button>
         <button class="btn-primary" onClick={() => nextStep('LOADS')}>Next: Loads</button>
      </div>
    </div>
  );

  const renderLoadsStep = () => (
    <div class="step-container">
      <h2>Smart Load Profiler</h2>
      <div class="wizard-content">
        <label>Step 1: Choose a usage pattern</label>
        <div class="preset-cards">
           <div class="card" onClick={() => {
              const peak = Number(prompt("What is the Peak Load (kW)?", "50"));
              if(peak) generateLoadProfile('residential', peak);
           }}>
              <strong>Residential</strong><small>Peaks in evening</small>
           </div>
           <div class="card" onClick={() => {
              const peak = Number(prompt("What is the Peak Load (kW)?", "100"));
              if(peak) generateLoadProfile('commercial', peak);
           }}>
              <strong>Commercial</strong><small>Peaks in daytime</small>
           </div>
        </div>
        
        <label style={{marginTop: '20px', display: 'block'}}>Step 2: Manual Override (Hourly kW)</label>
        <div style={{
           display: 'grid', 
           gridTemplateColumns: 'repeat(6, 1fr)', 
           gap: '5px',
           maxHeight: '150px',
           overflowY: 'auto',
           border: '1px solid #eee',
           padding: '10px',
           background: '#fafafa'
        }}>
           {data.loads.map((val, i) => (
              <div key={i} style={{textAlign: 'center'}}>
                 <small style={{fontSize: '0.7rem', color: '#999'}}>{i}:00</small>
                 <input type="number" value={val} style={{width:'100%', padding: '2px', textAlign: 'center'}} 
                   onChange={(e) => {
                      const copy = [...data.loads];
                      copy[i] = Number(e.currentTarget.value);
                      setData({...data, loads: copy});
                   }}
                 />
              </div>
           ))}
        </div>
      </div>
      <div class="wizard-actions">
         <button class="btn-skip" onClick={handleFinalSubmit}>Finish</button>
         <button class="btn-primary" onClick={handleFinalSubmit}>Create Project</button>
      </div>
    </div>
  );

  return (
    <div class="wizard-overlay">
      <div class="wizard-card">
        <button class="close-btn" onClick={onClose}>&times;</button>
        {step === 'NAME' && renderNameStep()}
        {step === 'ONBOARDING_PROMPT' && renderPromptStep()}
        {step === 'SOLAR' && renderSolarStep()}
        {step === 'BATTERY' && renderBatteryStep()}
        {step === 'WIND' && renderWindStep()}
        {step === 'GENERATOR' && renderGeneratorStep()}
        {step === 'LOADS' && renderLoadsStep()}
      </div>
    </div>
  );
}