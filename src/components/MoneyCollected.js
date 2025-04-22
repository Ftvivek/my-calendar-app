// MoneyCollected.js
import React, { useState, useEffect } from 'react';
import './MoneyCollected.css'; // Make sure you have this CSS file for styling

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
    // Using 'en-CA' locale is a common trick to get YYYY-MM-DD
    // Alternatively:
    // const today = new Date();
    // const year = today.getFullYear();
    // const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    // const day = String(today.getDate()).padStart(2, '0');
    // return `${year}-${month}-${day}`;
    return new Date().toLocaleDateString('en-CA');
};

const MoneyCollected = () => {
    // State for counts (fetched from API)
    const [onlineCount, setOnlineCount] = useState(0);
    const [cashCount, setCashCount] = useState(0);

    // State for loading and errors during fetch
    const [isLoading, setIsLoading] = useState(false); // Start as false, set true during fetch
    const [error, setError] = useState(null);

    // State for the selected date, initialized to today
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());

    // Constant for payment amount per student
    const paymentPerStudent = 500;

    // Fetch data whenever selectedDate changes
    useEffect(() => {
        const fetchCollectionData = async () => {
            // Prevent fetch if date is somehow invalid (though type="date" helps)
            if (!selectedDate) {
                setError("Please select a valid date.");
                setOnlineCount(0); // Reset counts
                setCashCount(0);
                return;
            }

            setIsLoading(true);
            setError(null); // Clear previous errors
            setOnlineCount(0); // Reset counts before fetching new data
            setCashCount(0);

            // Construct the URL using the selected date
            // Your backend endpoint /api/collection/:date expects YYYY-MM-DD
            const apiUrl = `/api/collection/${selectedDate}`;
            console.log(`Fetching collection data from: ${apiUrl}`); // Log for debugging

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    // Try to parse error message from backend if available
                    let errorMsg = `HTTP error! Status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorMsg; // Use backend error if present
                    } catch (parseError) {
                        // Ignore if response wasn't JSON, use the HTTP status message
                    }
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                // Update counts based on fetched data, default to 0 if missing
                setOnlineCount(parseInt(data.onlineCount) || 0);
                setCashCount(parseInt(data.cashCount) || 0);

            } catch (err) {
                console.error("Failed to fetch collection data:", err);
                setError(err.message || 'Failed to fetch collection data.');
                // Counts are already reset at the start of the try block
            } finally {
                setIsLoading(false); // Loading finished
            }
        };

        fetchCollectionData(); // Call the fetch function

    }, [selectedDate]); // Re-run this effect WHENEVER selectedDate changes

    // Handler for the date input change
    const handleDateChange = (event) => {
        setSelectedDate(event.target.value); // Input value is already YYYY-MM-DD
    };

    // Calculate amounts based on current counts
    const cashAmount = cashCount * paymentPerStudent;
    const onlineAmount = onlineCount * paymentPerStudent;

    // Determine the display title based on the selected date
    const displayTitle = selectedDate === getTodayDateString()
        ? "Today's Collection"
        : `Collection for ${selectedDate}`;

    return (
        <div className="money-collected-container">
            {/* Header section with title and date picker */}
            <div className="money-collected-header">
                <h3>{displayTitle}</h3>
                {/* Position this div using CSS (e.g., float: right, or flexbox) */}
                <div className="date-selector">
                     <label htmlFor="collection-date">Select Date: </label>
                     <input
                        type="date"
                        id="collection-date"
                        value={selectedDate} // Bind input value to state
                        onChange={handleDateChange} // Update state on change
                        aria-label="Select collection date"
                        disabled={isLoading} // Disable date picker while loading
                     />
                 </div>
            </div>

            {/* Body section with counts or loading/error message */}
            <div className="money-collected-body">
                {isLoading && <p>Loading data for {selectedDate}...</p>}
                {error && <p className="error-message">Error: {error}</p>}
                {!isLoading && !error && (
                    <> {/* Use Fragment to group elements */}
                        <div className="collection-section"> {/* Use class from your previous code */}
                            <h4>Cash</h4>
                            {/* Display calculated amount */}
                            <p>Amount Collected: ₹{cashAmount.toFixed(2)}</p>
                            <p className="count-details">({cashCount} student{cashCount !== 1 ? 's' : ''})</p>
                        </div>
                        <div className="collection-section"> {/* Use class from your previous code */}
                             <h4>Online</h4>
                             {/* Display calculated amount */}
                             <p>Amount Collected: ₹{onlineAmount.toFixed(2)}</p>
                             <p className="count-details">({onlineCount} student{onlineCount !== 1 ? 's' : ''})</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MoneyCollected;