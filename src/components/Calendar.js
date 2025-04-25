import React, { useState } from 'react';
import './Calendar.css'; // Ensure this path is correct and the enhanced CSS is being used
import AddStudentForm from './AddStudentForm';
import StudentList from './StudentList';
import AllStudentList from './AllStudentList';
import StudentManagement from './StudentManagement';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import MoneyCollected from './MoneyCollected';



const Calendar = () => {
    const navigate = useNavigate();
    const [searchResults, setSearchResults] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [isSearchOverlayVisible, setIsSearchOverlayVisible] = useState(false); // Controls overlay visibility
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [selectedDateForList, setSelectedDateForList] = useState(null);
    const [isStudentListVisible, setIsStudentListVisible] = useState(false); // Likely redundant if using StudentManagement? Review if needed.
    const [students, setStudents] = useState([]); // State for students added in *this session*? Review purpose.
    const [isAllStudentsVisible, setIsAllStudentsVisible] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [loadingAllStudents, setLoadingAllStudents] = useState(false);
    const [errorAllStudents, setErrorAllStudents] = useState(null);
    const [isStudentManagementVisible, setIsStudentManagementVisible] = useState(false); // Controls StudentManagement modal/view
    const [selectedDay, setSelectedDay] = useState(null); // State to track the visually selected day

    // Utility Functions (unchanged)
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    // Navigation Handlers (unchanged)
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDay(null); // Clear selection when changing month
    };
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDay(null); // Clear selection when changing month
    };
    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDay(null); // Clear selection when going to today
    };

    // Date Interaction
        // Date Interaction
        const handleDateClick = (date) => {
            // --- Previous console logs for understanding (keep or remove as needed) ---
            console.log('Raw Date Object:', date);
            console.log('Clicked Date (Locale):', date.toLocaleDateString());
            console.log('Clicked Date (Local Parts): Year=', date.getFullYear(), 'Month=', date.getMonth() + 1, 'Day=', date.getDate());
            console.log('Clicked Date (ISO String - UTC):', date.toISOString()); // Shows UTC conversion
            // const formattedDateUTC = date.toISOString().slice(0, 10); // The old way (UTC date)
            // console.log('Formatted Date for Navigation (YYYY-MM-DD from UTC):', formattedDateUTC);
    
            // --- >>> THE FIX: Construct YYYY-MM-DD from Local Date <<< ---
            const year = date.getFullYear();
            // getMonth() is 0-indexed (0=Jan, 11=Dec), so add 1
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Ensure 2 digits (e.g., '04')
            const day = date.getDate().toString().padStart(2, '0'); // Ensure 2 digits (e.g., '10')
    
            // This variable now holds the local date string in the desired format
            const localFormattedDate = `${year}-${month}-${day}`; // e.g., "2025-04-10"
    
            console.log('Formatted LOCAL Date for Navigation:', localFormattedDate); // Verify the new format
    
            // --- Update state and navigate using the LOCAL date string ---
            setSelectedDateForList(date); // Store the full Date object (still useful)
            setSelectedDay(date.getDate()); // Update visual selection state (highlights the day number)
    
            // Navigate using the locally constructed date string
            navigate(`/students?date=${localFormattedDate}`); // Use localFormattedDate here
        };
     // If navigation handles it, you might not need setIsStudentManagementVisible(true) here.
        // setIsStudentManagementVisible(true); // Commenting out assuming navigation handles the view change
    
    // View Collection Navigation (unchanged)
    const handleViewCollection = (date) => {
        const formattedDate = date.toISOString().slice(0, 10);
        navigate(`/collection/${formattedDate}`);
    };

    // --- >>> ADDED MISSING FUNCTION DEFINITION HERE <<< ---
    const handleAddStudent = () => {
        console.log("Opening Add Student Form"); // Optional: for debugging
        setIsAddingStudent(true); // Set the state to make the form visible
    };
    // --- >>> END OF ADDED FUNCTION <<< ---


    // Modal/Overlay Close Handlers
    const handleCloseStudentList = () => {
        setIsStudentListVisible(false);
        // setSelectedDateForList(null); // Keep selected date if needed for other UI elements?
    };
    const handleCloseStudentManagement = () => {
        setIsStudentManagementVisible(false);
        // setSelectedDateForList(null);
    };
    const handleCloseAddStudentForm = () => setIsAddingStudent(false); // This closes the AddStudentForm
    const handleCloseAllStudents = () => setIsAllStudentsVisible(false);

    const handleClearSearchResults = () => {
        setIsSearchOverlayVisible(false); // Hide the overlay (triggers CSS transition)
        setSearchResults(null);
        setSearchError(null);
    };

    // Data Fetching / Handling
    const handleStudentAdded = (newStudent) => {
        console.log('New Student Added (in Calendar component):', newStudent);
        // Close the form after successful addition
        setIsAddingStudent(false);
        // Optionally trigger a refetch of all students if the list needs immediate update
        // handleShowAllStudents(true); // Pass flag to avoid toggling visibility if already visible
    };

    const handleShowAllStudents = (keepVisible = false) => {
        // If not forced open and already visible, close it. Otherwise, open/fetch.
        if (!keepVisible && isAllStudentsVisible) {
             setIsAllStudentsVisible(false);
             return;
        }

        setIsAllStudentsVisible(true);
        setLoadingAllStudents(true);
        setErrorAllStudents(null);
        fetch('/api/students')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                setAllStudents(data);
                setLoadingAllStudents(false);
            })
            .catch(error => {
                console.error('Error fetching all students:', error);
                setErrorAllStudents(error.message);
                setLoadingAllStudents(false);
            });
    };

    const handleStudentSearch = async (searchTerm) => {
        if (!searchTerm.trim()) {
            handleClearSearchResults();
            return;
        }
        setIsSearchOverlayVisible(true); // Show the overlay (triggers CSS transition)
        setSearchResults(null);
        setSearchError(null);
        try {
            const response = await fetch(`/api/students/search?name=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error searching students:', error);
            setSearchError('Failed to search for students.');
        }
    };

    // Rendering Functions
    const renderDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = getFirstDayOfMonth(year, month);
        const daysArray = [];
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        // Pad start of month with empty divs
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysArray.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Render actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = selectedDay === day; // Check if this day is the selected one

            // Combine classes conditionally
            const dayClasses = [
                'calendar-day',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
            ].filter(Boolean).join(' '); // Filter out empty strings and join

            daysArray.push(
                <div
                    key={day}
                    className={dayClasses}
                    onClick={() => handleDateClick(date)}
                    //onClick={() => onDayClick(format(currentDate, "yyyy-MM-dd"))}

                    role="button" // Improve accessibility
                    tabIndex={0} // Make it focusable
                    aria-label={`Select day ${day}`}
                >
                    {day}
                </div>
            );
        }
        return daysArray;
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date);
    };

    // Main Component Return
    return (
        <div className="calendar-page-container">
            <div className="calendar-container">
                {/* Search Bar remains at the top */}
                <SearchBar onSearch={handleStudentSearch} onClearSearch={handleClearSearchResults} />

                {/* Search Results Overlay - CORRECT PLACEMENT & CLASS BINDING */}
                {isSearchOverlayVisible && (
                     <div
                        className={`search-overlay ${isSearchOverlayVisible ? 'visible' : ''}`} // Conditionally add 'visible' class
                        onClick={handleClearSearchResults} // Click outside closes
                    >
                        <div className="search-results-overlay" onClick={(e) => e.stopPropagation()}> {/* Prevent clicks inside from closing */}
                            <h3>Search Results</h3>
                            {searchError && <p className="error">{searchError}</p>}
                            {!searchError && searchResults === null && <p>Searching...</p>}
                            {!searchError && searchResults && searchResults.length === 0 && <p>No students found matching that name.</p>}
                            {!searchError && searchResults && searchResults.length > 0 && (
                                searchResults.map(student => (
                                    <div key={student.id || student._id} className="student-detail-overlay"> {/* Use _id if from MongoDB */}
                                        <p><strong>Name:</strong> {student.name}</p>
                                        {/* Ensure consistent date formatting */}
                                        <p><strong>Admission Date:</strong> {student.admission_da ? new Date(student.admission_da).toLocaleDateString() : 'N/A'}</p>
                                        {/* Add other relevant details */}
                                         <p><strong>ID:</strong> {student.id || student._id}</p>
                                    </div>
                                ))
                            )}
                            <button className="button-secondary" onClick={handleClearSearchResults}>Close Search</button> {/* Use button class */}
                        </div>
                    </div>
                )}

                {/* Main Calendar Content - Blur applied when overlay is visible */}
                <div className={isSearchOverlayVisible ? 'calendar-content-blurred' : ''}>
                    {/* Corrected Calendar Header using string literals */}
                    <div className="calendar-header">
                        <button onClick={prevMonth} aria-label="Previous month"> {'<'} </button>
                        <h2>{formatDate(currentDate)}</h2>
                        <button onClick={nextMonth} aria-label="Next month"> {'>'} </button>
                    </div>

                    {/* Calendar Controls */}
                    <div className="calendar-controls">
                        <button onClick={goToToday}>Today</button>
                        {/* Conditionally show View Collection button only if a date is visually selected */}
                        {selectedDateForList && (
                            <button onClick={() => handleViewCollection(selectedDateForList)}>
                                View Collection {/* Keep text concise */}
                            </button>
                        )}
                    </div>

                    {/* Calendar Grid */}
                    <div className="calendar-grid">
                        <div className="calendar-day-name" aria-hidden="true">Sun</div>
                        <div className="calendar-day-name" aria-hidden="true">Mon</div>
                        <div className="calendar-day-name" aria-hidden="true">Tue</div>
                        <div className="calendar-day-name" aria-hidden="true">Wed</div>
                        <div className="calendar-day-name" aria-hidden="true">Thu</div>
                        <div className="calendar-day-name" aria-hidden="true">Fri</div>
                        <div className="calendar-day-name" aria-hidden="true">Sat</div>
                        {renderDays()}
                    </div>

                    {/* Action Buttons - APPLYING MULTI-CLASS APPROACH */}
                    <div className="add-student-section">
                        {/* Apply base 'section-button' and modifier 'button-primary' */}
                        {/* This button now correctly calls the handleAddStudent function defined above */}
                        <button className="section-button button-primary" onClick={handleAddStudent}>Add Student</button>
                    </div>
                    <div className="all-students-section">
                         {/* Apply base 'section-button' and modifier 'button-secondary' */}
                        <button className="section-button button-secondary" onClick={() => handleShowAllStudents()}>View All Students</button>
                    </div>

                    {/* --- Modals / Popups --- */}

                    {/* This now renders correctly when isAddingStudent becomes true */}
                    {isAddingStudent && (
                        <AddStudentForm
                            onClose={handleCloseAddStudentForm} // Pass function to close
                            onStudentAdded={handleStudentAdded} // Pass function to handle success
                        />
                    )}

                    {/* Render StudentManagement if its state is true */}
                    {isStudentManagementVisible && selectedDateForList && (
                         <StudentManagement
                            date={selectedDateForList.toISOString().slice(0, 10)}
                            onClose={handleCloseStudentManagement}
                        />
                     )}

                    {/* Render AllStudentList if its state is true */}
                    {isAllStudentsVisible && (
                        <AllStudentList
                            students={allStudents}
                            loading={loadingAllStudents}
                            error={errorAllStudents}
                            onClose={handleCloseAllStudents}
                        />
                    )}

                    {/* StudentList component - Review if still needed */}
                    {isStudentListVisible && selectedDateForList && (
                        <StudentList
                            selectedDate={selectedDateForList}
                            students={students} // Pass the correct student list here
                            onClose={handleCloseStudentList}
                        />
                    )}

                </div> {/* End of calendar-content-blurred */}
            </div> {/* End of calendar-container */}

            {/* Money Collected Component - positioned via CSS */}
            <div className="money-collected-container-on-calendar">
                <MoneyCollected />
            </div>

        </div> // End of calendar-page-container
    );
};

export default Calendar;