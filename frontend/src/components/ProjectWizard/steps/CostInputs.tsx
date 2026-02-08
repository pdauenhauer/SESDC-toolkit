// src/components/ProjectWizard/steps/CostInputs.tsx
import { StepProps } from '../types';

interface CostInputsProps {
  section: 'solar' | 'battery' | 'wind' | 'generator';
  data: StepProps['data'];
  updateSection: StepProps['updateSection'];
  updateNested: StepProps['updateNested'];
}

export default function CostInputs({ section, data, updateSection, updateNested }: CostInputsProps) {
  // Access the specific section data (e.g., data.solar or data.wind)
  const sectionData = data[section];

  return (
    <div class="advanced-section fade-in">
      <h4 style={{marginTop:0, color: '#666'}}>💰 Financial & Lifecycle</h4>
      
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
        <div>
           <label>Capital Cost ($)</label>
           <input type="number" 
             value={sectionData.costs.capital} 
             onInput={(e) => updateNested(section, 'costs', 'capital', e.currentTarget.value)} 
           />
        </div>
        <div>
           <label>Lifespan (Years)</label>
           <input type="number" 
             value={sectionData.lifespan}
             onInput={(e) => updateSection(section, 'lifespan', e.currentTarget.value)} 
           />
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
        <div>
           <label>Op Cost ($/yr)</label>
           <input type="number" 
             value={sectionData.costs.opDollar} 
             onInput={(e) => updateNested(section, 'costs', 'opDollar', e.currentTarget.value)} 
           />
        </div>
        <div>
           <label>Replace Cost ($)</label>
           <input type="number" 
             value={sectionData.costs.repDollar}
             onInput={(e) => updateNested(section, 'costs', 'repDollar', e.currentTarget.value)} 
           />
        </div>
      </div>
    </div>
  );
}