// NetEnergyCalc.js
import React, { useState } from 'react';
import './NetEnergyCalc.css';

const NetEnergyCalc = () => {
  const [cutInSpeed, setCutInSpeed] = useState('');
  const [ratedSpeed, setRatedSpeed] = useState('');
  const [cutOutSpeed, setCutOutSpeed] = useState('');
  const [ratedPower, setRatedPower] = useState('');

  const handleInputChange = (e, setter) => {
    const value = e.target.value;
    // You can add validation or additional logic as needed
    setter(value);
  };

  const handleButtonClick = (setter) => {
    // You can add additional logic or actions when a button is clicked
    console.log(`Button for ${setter} clicked`);
  };

  return (
    <div>
      <h1>Wind Turbine Settings</h1>
      <div>
        <label htmlFor="cutInSpeed">Cut In Speed:</label>
        <input
          type="text"
          id="cutInSpeed"
          value={cutInSpeed}
          onChange={(e) => handleInputChange(e, setCutInSpeed)}
        />
        <button onClick={() => handleButtonClick('CUT_IN_SPEED')}>Set</button>
      </div>
      <div>
        <label htmlFor="ratedSpeed">Rated Speed:</label>
        <input
          type="text"
          id="ratedSpeed"
          value={ratedSpeed}
          onChange={(e) => handleInputChange(e, setRatedSpeed)}
        />
        <button onClick={() => handleButtonClick('RATED_SPEED')}>Set</button>
      </div>
      <div>
        <label htmlFor="cutOutSpeed">Cut Out Speed:</label>
        <input
          type="text"
          id="cutOutSpeed"
          value={cutOutSpeed}
          onChange={(e) => handleInputChange(e, setCutOutSpeed)}
        />
        <button onClick={() => handleButtonClick('CUT_OUT_SPEED')}>Set</button>
      </div>
      <div>
        <label htmlFor="ratedPower">Rated Power:</label>
        <input
          type="text"
          id="ratedPower"
          value={ratedPower}
          onChange={(e) => handleInputChange(e, setRatedPower)}
        />
        <button onClick={() => handleButtonClick('RATED_POWER')}>Set</button>
      </div>
    </div>
  );
};

export default NetEnergyCalc;
