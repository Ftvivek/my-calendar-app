import React, { useState, useEffect } from 'react';
import './StudentManagement.css';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { FaSpinner, FaExclamationCircle, FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';

// --- CHANGE: Import the centralized Axios instance ---
//import apiClient from '../api/axiosInstance';
 // Adjust path if necessary
import apiClient from '../axiosInstance.js';
// --- CHANGE: Removed API_BASE_URL constant, as apiClient handles the base ---

const StudentManagement = () => {
    const { date: routeDate } = useParams();
    const [searchParams] = useSearchParams();
    const selectedDate = searchParams.get('date') || routeDate;

    // State declarations (remain the same)
    const [pendingStudents, setPendingStudents] = useState([]);
    const [paidStudents, setPaidStudents] = useState([]);
    const [suspendedStudents, setSuspendedStudents] = useState([]);
    const [initialState, setInitialState] = useState({ pending: [], paid: [], suspended: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState({});

    // --- Fetch Initial Data (Refactored) ---
    useEffect(() => {
        if (!selectedDate) {
            setError("No date selected.");
            setLoading(false);
            return;
        }

        const fetchManageableStudents = async () => { // Using async/await for cleaner look
            console.log("Fetching manageable students for date:", selectedDate);
            setLoading(true);
            setError(null);
            setPendingStudents([]);
            setPaidStudents([]);
            setSuspendedStudents([]);
            setUpdatingStatus({});
            setInitialState({ pending: [], paid: [], suspended: [] });

            // --- CHANGE: Define relative endpoint ---
            const endpoint = `/students/manageable-on-date/${selectedDate}`;

            try {
                // --- CHANGE: Use apiClient.get ---
                const response = await apiClient.get(endpoint);
                const data = response.data; // Axios puts data directly here

                console.log("Data received from /manageable-on-date:", data);

                // Validate and set state (logic remains the same)
                const pending = Array.isArray(data?.pending) ? data.pending : [];
                const paid = Array.isArray(data?.paid) ? data.paid : [];
                const suspended = Array.isArray(data?.suspended) ? data.suspended : [];

                const pendingWithStatus = pending.map(s => ({ ...s, status: 'pending' }));
                const paidWithStatus = paid.map(s => ({ ...s, status: 'paid', paymentType: s.paymentType }));
                const suspendedWithStatus = suspended.map(s => ({ ...s, status: 'suspended' }));

                setPendingStudents(pendingWithStatus);
                setPaidStudents(paidWithStatus);
                setSuspendedStudents(suspendedWithStatus);
                setInitialState({ pending: pendingWithStatus, paid: paidWithStatus, suspended: suspendedWithStatus });

            } catch (err) {
                // --- CHANGE: Handle Axios error ---
                console.error('Error fetching manageable students:', err);
                const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch student data.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchManageableStudents();

    }, [selectedDate]);

    // --- Handle Status Updates (Refactored) ---
    const handleStatusChange = async (studentName, studentId, statusType, isChecked) => {
        setUpdatingStatus(prev => ({ ...prev, [studentName]: true }));

        // Payload calculation (logic remains the same)
        let payload = { cash: false, online: false, suspend: false };
        if (statusType === 'cash' && isChecked) payload.cash = true;
        else if (statusType === 'online' && isChecked) payload.online = true;
        else if (statusType === 'suspend' && isChecked) payload.suspend = true;

        // --- CHANGE: Define relative endpoint for update ---
        const endpoint = `/student-payment-status/${selectedDate}/${encodeURIComponent(studentName)}`;

        try {
            // --- CHANGE: Use apiClient.put, passing payload directly ---
            // Axios automatically sets Content-Type: application/json and stringifies
            await apiClient.put(endpoint, payload);

            // --- Optimistic UI Update on Success (Logic remains the same) ---
            const studentData = pendingStudents.find(s => s.name === studentName) ||
                                paidStudents.find(s => s.name === studentName) ||
                                suspendedStudents.find(s => s.name === studentName) ||
                                { id: studentId, name: studentName };

            let nextPending = pendingStudents.filter(s => s.name !== studentName);
            let nextPaid = paidStudents.filter(s => s.name !== studentName);
            let nextSuspended = suspendedStudents.filter(s => s.name !== studentName);

            if (payload.suspend) {
                nextSuspended.push({ ...studentData, status: 'suspended' });
            } else if (payload.cash || payload.online) {
                nextPaid.push({ ...studentData, status: 'paid', paymentType: payload.cash ? 'cash' : 'online' });
            } else {
                nextPending.push({ ...studentData, status: 'pending' });
            }

            // Sorting for consistency
            nextPending.sort((a, b) => a.name.localeCompare(b.name));
            nextPaid.sort((a, b) => a.name.localeCompare(b.name));
            nextSuspended.sort((a, b) => a.name.localeCompare(b.name));

            // Update state and snapshot
            setPendingStudents(nextPending);
            setPaidStudents(nextPaid);
            setSuspendedStudents(nextSuspended);
            setInitialState({ pending: nextPending, paid: nextPaid, suspended: nextSuspended });

            setUpdatingStatus(prev => ({ ...prev, [studentName]: false })); // Clear loading

        } catch (err) {
            // --- CHANGE: Handle Axios error ---
            console.error(`Error updating status for ${studentName}:`, err);
            setUpdatingStatus(prev => ({ ...prev, [studentName]: 'error' }));

            // --- Revert UI on Error (Logic remains the same) ---
            setPendingStudents([...initialState.pending]);
            setPaidStudents([...initialState.paid]);
            setSuspendedStudents([...initialState.suspended]);

            // Optional: Add timeout to clear error icon
            // setTimeout(() => { setUpdatingStatus(prev => ({ ...prev, [studentName]: false })); }, 5000);
        }
    };

    // --- Render Action Checkboxes (Logic remains the same) ---
    const renderStudentActions = (student) => {
        const updateState = updatingStatus[student.name];

        if (updateState === true) return <FaSpinner className="icon-spinner" aria-label="Processing..." />;
        if (updateState === 'error') {
            return (
                <div className="action-error-state">
                    <FaExclamationCircle className="icon-error" title={`Update failed for ${student.name}`} />
                    {/* Optional retry logic could be added here */}
                </div>
            );
        }

        // Only show checkboxes if student is currently in the pending list
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
        return null; // No actions if not pending
    };

    // --- Main Render (JSX Structure remains the same) ---
    return (
        <div className="student-management-container">
            {/* Back Link, Title */}
            <Link to="/" className="btn btn-info back-link mb-3">
                <FaArrowLeft /> Back to Calendar
            </Link>
            <h2>Student Actions for Day {selectedDate || '...'}</h2>

            {/* Loading State */}
            {loading && <div className="loading-state"><FaSpinner className="icon-spinner" /> Loading student data...</div>}

            {/* Error State */}
            {error && <div className="error-state alert alert-danger"><FaExclamationCircle /> Error: {error}</div>}

            {/* Content Sections */}
            {!loading && !error && selectedDate && (
                <>
                    {/* Pending Section */}
                    <section className="status-section card mb-3">
                        <div className="card-header"><h3>Pending Action</h3></div>
                        <div className="card-body">
                            {pendingStudents.length === 0 ? (
                                <p className="text-muted">No students require action for this day.</p>
                            ) : (
                                <table className="table table-striped table-hover student-table">
                                    <thead><tr><th>Name</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {pendingStudents.map(student => (
                                            <tr key={student.id || student.name}> {/* Prefer ID if available */}
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

                    {/* Paid Section */}
                    <section className="status-section card mb-3">
                         <div className="card-header bg-success text-white"><h3><FaCheckCircle /> Paid Students</h3></div>
                        <div className="card-body">
                            {paidStudents.length === 0 ? (
                                <p className="text-muted">No students marked as paid for this day.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {paidStudents.map(student => (
                                        <li key={student.id || student.name} className="list-group-item d-flex justify-content-between align-items-center">
                                            <Link to={`/student-profile/${student.id}`} className="student-name-link">
                                                {student.name} ({student.paymentType || 'Paid'})
                                            </Link>
                                            {updatingStatus[student.name] === true && <FaSpinner className="icon-spinner list-icon" />}
                                            {updatingStatus[student.name] === 'error' && <FaExclamationCircle className="icon-error list-icon" title="Update failed"/>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>

                    {/* Suspended Section */}
                    <section className="status-section card mb-3">
                        <div className="card-header bg-danger text-white"><h3><FaTimesCircle /> Suspended Students</h3></div>
                         <div className="card-body">
                            {suspendedStudents.length === 0 ? (
                                <p className="text-muted">No students marked as suspended for this day.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {suspendedStudents.map(student => (
                                         <li key={student.id || student.name} className="list-group-item d-flex justify-content-between align-items-center">
                                            <Link to={`/student-profile/${student.id}`} className="student-name-link">
                                                {student.name}
                                            </Link>
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