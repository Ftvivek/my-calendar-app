import React, { useEffect } from 'react'; // Added useEffect import
import './App.css'; // You might still have some global styles here
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Calendar from './components/Calendar'; // Adjust path if needed
import StudentManagement from './components/StudentManagement';
import StudentProfile from './components/StudentProfile'; // Adjust path if needed
import MoneyCollected from './components/MoneyCollected'; // Import the MoneyCollected component

function App() {

  // +++ Add this useEffect block +++
  useEffect(() => {
    console.log("--- App Component Mounted: Environment Variable Check ---");
    console.log("Value for REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
    console.log("Value for NODE_ENV:", process.env.NODE_ENV);
    console.log("Value for REACT_APP_TEST_VAR:", process.env.REACT_APP_TEST_VAR); // <<< ADD THIS LINE
    console.log("------------------------------------------------------");
  }, []);

  return (
    <Router>
      <div className="App">
        {/* Your existing header/navigation could go here if needed */}
        <Routes>
          {/* Define the application routes */}
          <Route path="/" element={<Calendar />} />
          <Route path="/students" element={<StudentManagement />} />
          <Route path="/student-profile/:studentId" element={<StudentProfile />} />
          {/* Assuming MoneyCollected should be shown via Calendar, maybe this route isn't directly needed?
              Or perhaps adjust path if it's meant to be standalone */}
          <Route path="/collection/:date" element={<MoneyCollected />} />

          {/* You might want a default/fallback route as well */}
          {/* <Route path="*" element={<div>404 Page Not Found</div>} /> */}
        </Routes>
        {/* Your existing footer could go here if needed */}
      </div>
    </Router>
  );
}

export default App;