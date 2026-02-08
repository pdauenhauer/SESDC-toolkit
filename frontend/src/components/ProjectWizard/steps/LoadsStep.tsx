import { StepProps } from '../types';

interface LoadsStepProps extends StepProps {
  setData: any;
  onFinish: () => void;
}

export default function LoadsStep({ data, setData, onFinish }: LoadsStepProps) {

  const generateLoadProfile = (type: 'residential' | 'commercial', peak: number) => {
    let curve: number[] = [];
    if (type === 'residential') {
      curve = [0.2, 0.2, 0.2, 0.2, 0.3, 0.4, 0.6, 0.6, 0.5, 0.4, 0.4, 0.4, 0.4, 0.4, 0.5, 0.6, 0.8, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.3];
    } else {
      curve = [0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1];
    }
    const scaled = curve.map(v => Math.round(v * peak));
    setData({ ...data, loads: scaled });
  };

  return (
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
           {data.loads.map((val: number, i: number) => (
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
         <button class="btn-skip" onClick={onFinish}>Finish</button>
         <button class="btn-primary" onClick={onFinish}>Create Project</button>
      </div>
    </div>
  );
}