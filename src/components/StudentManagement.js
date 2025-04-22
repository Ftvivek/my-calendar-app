import React, { useState, useEffect } from 'react';
import './StudentManagement.css'; // Ensure this CSS file exists
import { useParams, Link, useSearchParams } from 'react-router-dom'; // Removed unused useNavigate
import { FaSpinner, FaExclamationCircle, FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';

// New, more descriptive API endpoint for initial load
const API_BASE_URL = '/api'; // Define base URL

const StudentManagement = () => {
    const { date: routeDate } = useParams();
    const [searchParams] = useSearchParams();
    const selectedDate = searchParams.get('date') || routeDate; // Prioritize query param

    // State for categorized student lists
    const [pendingStudents, setPendingStudents] = useState([]);
    const [paidStudents, setPaidStudents] = useState([]);
    const [suspendedStudents, setSuspendedStudents] = useState([]);

    // State for tracking initial fetched state (for potential reverts on error)
    const [initialState, setInitialState] = useState({ pending: [], paid: [], suspended: [] });

    // State for loading and errors during fetch/update
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState({}); // Tracks status per student name: true (loading), false (done), 'error'

    // --- Fetch Initial Data ---
    useEffect(() => {
        if (!selectedDate) {
            setError("No date selected.");
            setLoading(false);
            return;
        }

        console.log("Fetching manageable students for date:", selectedDate);
        setLoading(true);
        setError(null);
        setPendingStudents([]);
        setPaidStudents([]);
        setSuspendedStudents([]);
        setUpdatingStatus({});
        setInitialState({ pending: [], paid: [], suspended: [] }); // Reset initial state

        // Use the NEW specific endpoint for this page's logic
        fetch(`${API_BASE_URL}/students/manageable-on-date/${selectedDate}`)
            .then(response => {
                if (!response.ok) {
                    // Attempt to parse error message from backend response
                    return response.json().catch(() => null).then(errData => {
                        throw new Error(`HTTP error! status: ${response.status}${errData?.error ? ` - ${errData.error}` : ''}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("Data received from /manageable-on-date:", data);

                // Validate received data structure
                const pending = Array.isArray(data?.pending) ? data.pending : [];
                const paid = Array.isArray(data?.paid) ? data.paid : [];
                const suspended = Array.isArray(data?.suspended) ? data.suspended : [];

                // Set state for rendering - directly use the categorized data
                setPendingStudents(pending.map(s => ({ ...s, status: 'pending' }))); // Add status for consistency if needed later
                setPaidStudents(paid.map(s => ({ ...s, status: 'paid', paymentType: s.paymentType }))); // Ensure paymentType is present
                setSuspendedStudents(suspended.map(s => ({ ...s, status: 'suspended' })));

                // Store the fetched categorized state for potential reverts
                setInitialState({
                    pending: pending.map(s => ({ ...s, status: 'pending' })),
                    paid: paid.map(s => ({ ...s, status: 'paid', paymentType: s.paymentType })),
                    suspended: suspended.map(s => ({ ...s, status: 'suspended' })),
                });

                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching manageable students:', err);
                setError(err.message || 'Failed to fetch student data.');
                setLoading(false);
            });

    }, [selectedDate]); // Re-run only if selectedDate changes

    // --- Handle Status Updates ---
    const handleStatusChange = async (studentName, studentId, statusType, isChecked) => { // Added studentId
        setUpdatingStatus(prev => ({ ...prev, [studentName]: true }));

        // Simplified payload calculation: Start fresh based on action
        let payload = { cash: false, online: false, suspend: false };

        if (statusType === 'cash' && isChecked) {
            payload.cash = true;
            // Assume setting paid overrides suspension
        } else if (statusType === 'online' && isChecked) {
            payload.online = true;
            // Assume setting paid overrides suspension
        } else if (statusType === 'suspend' && isChecked) {
            payload.suspend = true;
            // Assume setting suspended overrides payment
        }
        // If unchecking, all payload flags remain false unless another is explicitly set.

        try {
            // Use the existing PUT endpoint which correctly targets the specific date
            const response = await fetch(`${API_BASE_URL}/student-payment-status/${selectedDate}/${encodeURIComponent(studentName)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMsg = `Update failed (HTTP ${response.status})`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            // --- Optimistic UI Update on Success ---
            // Find student in ANY current list (more robust)
            const studentData = pendingStudents.find(s => s.name === studentName) ||
                                paidStudents.find(s => s.name === studentName) ||
                                suspendedStudents.find(s => s.name === studentName) ||
                                { id: studentId, name: studentName }; // Fallback if not found (unlikely)


            // Create copies and filter out the student
            let nextPending = pendingStudents.filter(s => s.name !== studentName);
            let nextPaid = paidStudents.filter(s => s.name !== studentName);
            let nextSuspended = suspendedStudents.filter(s => s.name !== studentName);

            // Add student to the new correct list based on the payload sent
            if (payload.suspend) {
                nextSuspended.push({ ...studentData, status: 'suspended' });
            } else if (payload.cash || payload.online) {
                nextPaid.push({ ...studentData, status: 'paid', paymentType: payload.cash ? 'cash' : 'online' });
            } else { // Neither paid nor suspended -> becomes pending
                nextPending.push({ ...studentData, status: 'pending' });
            }

            // Update state (sort for consistency)
            setPendingStudents(nextPending.sort((a, b) => a.name.localeCompare(b.name)));
            setPaidStudents(nextPaid.sort((a, b) => a.name.localeCompare(b.name)));
            setSuspendedStudents(nextSuspended.sort((a, b) => a.name.localeCompare(b.name)));

            // Also update the initial state snapshot to reflect the successful change
            setInitialState({ pending: nextPending, paid: nextPaid, suspended: nextSuspended });

            setUpdatingStatus(prev => ({ ...prev, [studentName]: false })); // Clear loading

        } catch (err) {
            console.error(`Error updating status for ${studentName}:`, err);
            setUpdatingStatus(prev => ({ ...prev, [studentName]: 'error' })); // Set error state

            // --- Revert UI on Error ---
            // Simply reset state to the last known *good* state stored in initialState
            // This avoids complex logic of finding original state if multiple updates happened quickly
            setPendingStudents([...initialState.pending]);
            setPaidStudents([...initialState.paid]);
            setSuspendedStudents([...initialState.suspended]);

            // Optional: Add a timeout to clear the error icon after a few seconds
            // setTimeout(() => {
            //     setUpdatingStatus(prev => ({ ...prev, [studentName]: false }));
            // }, 5000);
        }
    };

    // --- Render Action Checkboxes ---
    // This now renders actions for PENDING students only, as per your requirement interpretation
    const renderStudentActions = (student) => {
        const updateState = updatingStatus[student.name];

        // Show spinner or error first if applicable
        if (updateState === true) return <FaSpinner className="icon-spinner" aria-label="Processing..." />;
        if (updateState === 'error') {
            return (
                <div className="action-error-state">
                    <FaExclamationCircle className="icon-error" title={`Update failed for ${student.name}`} />
                    {/* Optionally add a manual retry button instead of checkboxes */}
                    {/* <button onClick={() => handleStatusChange(student.name, student.id, 'retry', true)}>Retry</button> */}
                </div>
            );
        }

        // Only show checkboxes for students currently in the pending list
        if (pendingStudents.some(p => p.name === student.name)) {
            return (
                <div className="action-checkboxes">
                    <label title={`Mark ${student.name} as Paid via Cash`}>
                        <input type="checkbox" onChange={(e) => handleStatusChange(student.name, student.id, 'cash', e.target.checked)} checked={false} /> Cash
                    </label>
                    <label title={`Mark ${student.name} as Paid Online`}>
                        <input type="checkbox" onChange={(e) => handleStatusChange(student.name, student.id, 'online', e.target.checked)} checked={false} /> Online
                    </label>
                    <label title={`Mark ${student.name} as Suspended`}>
                        <input type="checkbox" onChange={(e) => handleStatusChange(student.name, student.id, 'suspend', e.target.checked)} checked={false} /> Suspend
                    </label>
                </div>
            );
        }

        // Return null or empty if student is not pending (already paid/suspended)
        return null;
    };

    // --- Main Render ---
    return (
        <div className="student-management-container">
            <Link to="/" className="btn btn-info back-link mb-3">
                <FaArrowLeft /> Back to Calendar
            </Link>
            <h2>Student Actions for Day {selectedDate || '...'}</h2>

            {/* Loading State */}
            {loading && <div className="loading-state"><FaSpinner className="icon-spinner" /> Loading student data...</div>}

            {/* Error State */}
            {error && <div className="error-state alert alert-danger"><FaExclamationCircle /> Error: {error}</div>}

            {/* Content */}
            {!loading && !error && selectedDate && (
                <>
                    {/* Pending Students Section */}
                    <section className="status-section card mb-3">
                        <div className="card-header"><h3>Pending Action</h3></div>
                        <div className="card-body">
                            {pendingStudents.length === 0 ? (
                                <p className="text-muted">No students require action for this day.</p>
                            ) : (
                                <table className="table table-striped table-hover student-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingStudents.map(student => (
                                            <tr key={student.id}> {/* Use ID as key */}
                                                <td data-label="Name">
                                                    <Link to={`/student-profile/${student.id}`} className="student-name-link">
                                                        {student.name}
                                                    </Link>
                                                </td>
                                                <td data-label="Actions">{renderStudentActions(student)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>

                    {/* Paid Students Section */}
                     <section className="status-section card mb-3">
                         <div className="card-header bg-success text-white"><h3><FaCheckCircle /> Paid Students</h3></div>
                        <div className="card-body">
                            {paidStudents.length === 0 ? (
                                <p className="text-muted">No students marked as paid for this day.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {paidStudents.map(student => (
                                        <li key={student.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <Link to={`/student-profile/${student.id}`} className="student-name-link">
                                                {/* Display payment type */}
                                                {student.name} ({student.paymentType || 'Paid'})
                                            </Link>
                                            {/* Show spinner/error only if this paid student is being updated */}
                                            {updatingStatus[student.name] === true && <FaSpinner className="icon-spinner list-icon" />}
                                            {updatingStatus[student.name] === 'error' && <FaExclamationCircle className="icon-error list-icon" title="Update failed"/>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>

                    {/* Suspended Students Section */}
                     <section className="status-section card mb-3">
                        <div className="card-header bg-danger text-white"><h3><FaTimesCircle /> Suspended Students</h3></div>
                         <div className="card-body">
                            {suspendedStudents.length === 0 ? (
                                <p className="text-muted">No students marked as suspended for this day.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {suspendedStudents.map(student => (
                                         <li key={student.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <Link to={`/student-profile/${student.id}`} className="student-name-link">
                                                {student.name}
                                            </Link>
                                            {/* Show spinner/error only if this suspended student is being updated */}
                                            {updatingStatus[student.name] === true && <FaSpinner className="icon-spinner list-icon" />}
                                            {updatingStatus[student.name] === 'error' && <FaExclamationCircle className="icon-error list-icon" title="Update failed"/>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default StudentManagement;