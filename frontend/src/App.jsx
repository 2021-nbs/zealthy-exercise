// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Wizard from './components/Wizard';
import Admin from './components/Admin';
import DataDisplay from './components/DataDisplay';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Wizard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/data" element={<DataDisplay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;