import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import './StudentProfile.css';
import { FaArrowLeft, FaUserCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

const StudentProfile = () => {
    const { studentId } = useParams();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // Initialize useNavigate

    useEffect(() => {
        const fetchStudentProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/students/${studentId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                setStudent(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching student profile:', err);
                setError('Failed to load student profile.');
                setLoading(false);
            }
        };

        fetchStudentProfile();
    }, [studentId]);

    const handleGoBack = () => {
        navigate(-1); // This navigates to the previous page in history
    };

    if (loading) {
        return (
            <div className="student-profile-container loading-state">
                <FaSpinner className="spinner-icon" />
                <p>Loading student profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="student-profile-container error-state">
                <FaExclamationTriangle className="error-icon" />
                <p>{error}</p>
                <button onClick={handleGoBack} className="back-link">
                    <FaArrowLeft /> Go Back
                </button>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="student-profile-container not-found-state">
                <FaUserCircle className="user-icon-large" />
                <p>Student profile not found.</p>
                <button onClick={handleGoBack} className="back-link">
                    <FaArrowLeft /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="student-profile-container">
            <button onClick={handleGoBack} className="back-link">
                <FaArrowLeft /> Go Back
            </button>
            <div className="profile-header">
                {student.student_photo ? (
                    <img src={student.student_photo} alt={student.name} className="profile-photo" />
                ) : (
                    <FaUserCircle className="user-icon-large" />
                )}
                <h2>{student.name}</h2>
            </div>
            <div className="profile-details">
                <div className="detail-item">
                    <strong>Grade:</strong>
                    <span>{student.grade || 'N/A'}</span>
                </div>
                <div className="detail-item">
                    <strong>Mobile No:</strong>
                    <span>{student.mobile_no || 'N/A'}</span>
                </div>
                <div className="detail-item">
                    <strong>Address:</strong>
                    <span>{student.address || 'N/A'}</span>
                </div>
                <div className="detail-item">
                    <strong>Admission Date:</strong>
                    <span>{student.admission_date || 'N/A'}</span>
                </div>
                {student.id_proof && (
                    <div className="detail-item">
                        <strong>ID Proof:</strong>
                        <span>
                            <a href={student.id_proof} target="_blank" rel="noopener noreferrer">
                                View Document
                            </a>
                        </span>
                    </div>
                )}
                {/* Add more student details as needed */}
            </div>
        </div>
    );
};

export default StudentProfile;