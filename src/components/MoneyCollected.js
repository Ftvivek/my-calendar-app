// MoneyCollected.js
import React, { useState, useEffect } from 'react';
import './MoneyCollected.css'; // Make sure you have this CSS file

// --- CHANGE: Import the centralized Axios instance ---
import apiClient from '../axiosInstance'; // Adjust path if necessary

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
    // Using 'en-CA' format (YYYY-MM-DD) which is suitable for date inputs
    return new Date().toLocaleDateString('en-CA');
};

const MoneyCollected = () => {
    const [onlineCount, setOnlineCount] = useState(0);
    const [cashCount, setCashCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const paymentPerStudent = 500; // Assuming this is constant

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
            setOnlineCount(0); // Reset counts before fetching
            setCashCount(0);

            // --- *** START OF CORRECTION (Using apiClient) *** ---

            // 1. Define the specific endpoint path for this request
            const endpoint = `/api/collection/${selectedDate}`;
            console.log(`Fetching collection data from endpoint: ${endpoint}`); // Log relative path

            try {
                // 2. Use the apiClient instance (.get) with the relative endpoint path
                //    The base URL (REACT_APP_API_URL) is automatically prepended by the instance.
                const response = await apiClient.get(endpoint);

                // 3. Access data directly from response.data (Axios specific)
                const data = response.data;

                // Process the data (remains the same)
                setOnlineCount(parseInt(data.onlineCount) || 0);
                setCashCount(parseInt(data.cashCount) || 0);

            } catch (err) {
                // 4. Handle Axios errors (more structured than fetch errors)
                console.error("Failed to fetch collection data:", err);
                // Try to get a specific error message from the response, fallback to general message
                const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch collection data.';
                setError(errorMessage);
            } finally {
                // 5. Ensure loading state is always turned off
                setIsLoading(false);
            }
            // --- *** END OF CORRECTION (Using apiClient) *** ---
        };

        fetchCollectionData();

    }, [selectedDate]); // Dependency array is correct

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

    // --- Return JSX (unchanged structure) ---
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