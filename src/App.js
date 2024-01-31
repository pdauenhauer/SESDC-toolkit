import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Login from './components/Login';
import NetEnergyCalc from './components/NetEnergyCalc';


function App() {
  return (
    <Router>
      <>
        <Navbar />
        <Routes>
          <Route path='/' element={<div> Home Page</div>} />
          <Route path='/log-in' element={<Login />} />
          <Route path='/net-load-calc' element={<div>Net Load Calculator</div>} />
          <Route path='/net-energy-calc' element={<NetEnergyCalc/>} />
        </Routes>
      </>
    </Router>
  );
}

export default App;