// MoneyCollected.js
import React, { useState, useEffect } from 'react';
import './MoneyCollected.css'; // Make sure you have this CSS file for styling

// Helper function to get today's date in YYYY-MM-DD format (remains the same)
const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-CA');
};

const MoneyCollected = () => {
    // State declarations (remain the same)
    const [onlineCount, setOnlineCount] = useState(0);
    const [cashCount, setCashCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const paymentPerStudent = 500;

    // Fetch data whenever selectedDate changes
    useEffect(() => {
        const fetchCollectionData = async () => {
            if (!selectedDate) {
                setError("Please select a valid date.");
                setOnlineCount(0);
                setCashCount(0);
                return;
            }

            setIsLoading(true);
            setError(null);
            setOnlineCount(0);
            setCashCount(0);

            // --- *** START OF CORRECTION *** ---

            // 1. Get the Base API URL from the environment variable configured in SWA
            const baseApiUrl = process.env.REACT_APP_API_URL;

            // 2. IMPORTANT: Check if the environment variable is set.
            //    If not, the build didn't get it, and API calls cannot work.
            if (!baseApiUrl) {
                 console.error("FATAL: REACT_APP_API_URL environment variable is not defined!");
                 setError("Application configuration error: API URL missing.");
                 setIsLoading(false);
                 return; // Stop execution if URL is missing
            }

            // 3. Construct the FULL absolute API URL
            const apiUrl = `${baseApiUrl}/api/collection/${selectedDate}`;

            // --- *** END OF CORRECTION *** ---

            console.log(`Fetching collection data from: ${apiUrl}`); // Log the full URL for debugging

            try {
                // 4. Use the full absolute apiUrl in the fetch call
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    let errorMsg = `HTTP error! Status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorMsg;
                    } catch (parseError) {
                        // Ignore if response wasn't JSON
                    }
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                setOnlineCount(parseInt(data.onlineCount) || 0);
                setCashCount(parseInt(data.cashCount) || 0);

            } catch (err) {
                console.error("Failed to fetch collection data:", err);
                setError(err.message || 'Failed to fetch collection data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollectionData();

    }, [selectedDate]); // Dependency array remains the same

    // Handler for date input change (remains the same)
    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
    };

    // Calculations and JSX return (remain the same)
    const cashAmount = cashCount * paymentPerStudent;
    const onlineAmount = onlineCount * paymentPerStudent;
    const displayTitle = selectedDate === getTodayDateString()
        ? "Today's Collection"
        : `Collection for ${selectedDate}`;

    return (
        <div className="money-collected-container">
            <div className="money-collected-header">
                <h3>{displayTitle}</h3>
                <div className="date-selector">
                     <label htmlFor="collection-date">Select Date: </label>
                     <input
                        type="date"
                        id="collection-date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        aria-label="Select collection date"
                        disabled={isLoading}
                     />
                 </div>
            </div>
            <div className="money-collected-body">
                {isLoading && <p>Loading data for {selectedDate}...</p>}
                {error && <p className="error-message">Error: {error}</p>}
                {!isLoading && !error && (
                    <>
                        <div className="collection-section">
                            <h4>Cash</h4>
                            <p>Amount Collected: ₹{cashAmount.toFixed(2)}</p>
                            <p className="count-details">({cashCount} student{cashCount !== 1 ? 's' : ''})</p>
                        </div>
                        <div className="collection-section">
                             <h4>Online</h4>
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