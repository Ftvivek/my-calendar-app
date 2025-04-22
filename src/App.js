import React from 'react';
import './App.css'; // You might still have some global styles here
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Calendar from './components/Calendar'; // Adjust path if needed
import StudentManagement from './components/StudentManagement';
import StudentProfile from './components/StudentProfile'; // Adjust path if needed
import MoneyCollected from './components/MoneyCollected'; // Import the MoneyCollected component

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route path="/students" element={<StudentManagement />} />
          <Route path="/student-profile/:studentId" element={<StudentProfile />} />
          <Route path="/collection/:date" element={<MoneyCollected />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;