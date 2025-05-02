import React, { useState } from 'react';
import './AddStudentForm.css';

// --- CHANGE: Import the centralized Axios instance ---
import apiClient from '../axiosInstance.js'; // Adjust path if necessary

// SVG Icon Component (remains the same)
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 4.095 0 5.555 0 7.318 0 9.366 1.708 11 3.781 11H7.5V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11h4.188C14.502 11 16 9.57 16 7.773c0-1.636-1.242-2.969-2.834-3.194C12.923 1.999 10.69 0 8 0zm-.5 14.5V11h1v3.5a5.5 0 0 1-1 0z"/>
    </svg>
);

const AddStudentForm = ({ onClose, onStudentAdded }) => {
    // State variables (remain the same)
    const [name, setName] = useState('');
    const [admissionDate, setAdmissionDate] = useState('');
    const [mobileNo, setMobileNo] = useState('');
    const [address, setAddress] = useState('');
    const [studentPhoto, setStudentPhoto] = useState(null);
    const [idProof, setIdProof] = useState(null);
    const [photoName, setPhotoName] = useState('');
    const [idProofName, setIdProofName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submissionError, setSubmissionError] = useState('');

    // Handlers (handleMobileChange, handleFileChange - remain the same)
    const handleMobileChange = (event) => {
        const value = event.target.value;
        if (/^\d*$/.test(value) && value.length <= 10) {
            setMobileNo(value);
        }
    };

    const handleFileChange = (event, setFile, setNameDisplay) => {
        const file = event.target.files[0];
        if (file) {
            setFile(file);
            setNameDisplay(file.name);
        } else {
            setFile(null);
            setNameDisplay('');
        }
    };


    // Handler for form submission (Refactored)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmissionError('');

        // Trim and validate inputs (logic remains the same)
        const trimmedName = name.trim();
        const trimmedAddress = address.trim();
        const missingFields = [];
        if (!trimmedName) missingFields.push('Name');
        if (!mobileNo) missingFields.push('Mobile No.');
        if (!trimmedAddress) missingFields.push('Address');
        if (!admissionDate) missingFields.push('Admission Date');

        if (missingFields.length > 0) {
            setSubmissionError(`Please fill in all required fields: ${missingFields.join(', ')}.`);
            return;
        }
        if (mobileNo.length !== 10 || !/^\d+$/.test(mobileNo)) {
            setSubmissionError('Mobile number must be a 10-digit number.');
            return;
        }

        setUploading(true);

        // Create FormData (logic remains the same)
        const formData = new FormData();
        formData.append('name', trimmedName);
        formData.append('admissionDate', admissionDate);
        formData.append('mobile_no', mobileNo);
        formData.append('address', trimmedAddress);
        if (studentPhoto) formData.append('student_photo', studentPhoto);
        if (idProof) formData.append('id_proof', idProof);

        // --- CHANGE: Define relative endpoint ---
        const endpoint = '/api/students';

        try {
            // --- CHANGE: Use apiClient.post ---
            // Axios automatically detects FormData and sets the correct Content-Type header
            // with the appropriate boundary.
            const response = await apiClient.post(endpoint, formData, {
                // Optional: Add an onUploadProgress handler if needed
                // onUploadProgress: progressEvent => {
                //     const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                //     console.log(`Upload Progress: ${percentCompleted}%`);
                // }
            });

            // --- CHANGE: Access data from response.data ---
            const newStudent = response.data; // Successful response data
            console.log('Student added successfully:', newStudent);
            onStudentAdded(newStudent);
            onClose();

        } catch (error) {
            // --- CHANGE: Handle Axios error ---
            console.error('Error adding student:', error);
            // Extract specific error message from backend if available
            const errorMessage = error.response?.data?.error // Check for specific 'error' field in response data
                              || error.response?.data?.message // Check for specific 'message' field
                              || error.message // Fallback to general Axios error message
                              || 'Failed to add student due to an unknown error.'; // Final fallback

            if (error.response) {
                // Server responded with a status code outside the 2xx range
                 console.error(`Server Error (${error.response.status}):`, error.response.data);
                 setSubmissionError(`Failed to add student. ${errorMessage} (Status: ${error.response.status})`);
            } else if (error.request) {
                // Request was made but no response received (e.g., network error)
                 console.error('Network Error:', error.request);
                 setSubmissionError('Failed to connect to the server. Please check your network connection.');
            } else {
                // Something happened in setting up the request that triggered an Error
                 console.error('Request Setup Error:', error.message);
                 setSubmissionError(`An error occurred: ${errorMessage}`);
            }
        } finally {
            setUploading(false);
        }
    };

    // --- JSX Rendering (remains the same) ---
    return (
        <div className="add-student-form-overlay" onClick={onClose}>
            <div className="add-student-form-container" onClick={(e) => e.stopPropagation()}>
                <h2>Add New Student</h2>
                <button className="close-button" onClick={onClose} aria-label="Close form">×</button>

                <form onSubmit={handleSubmit} noValidate>
                    {/* Name Field */}
                    <div className="form-group">
                        <label htmlFor="name">Full Name <span className="required">*</span></label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter student's full name" aria-required="true" />
                    </div>
                    {/* Mobile No Field */}
                    <div className="form-group">
                        <label htmlFor="mobile_no">Mobile No. <span className="required">*</span></label>
                        <input type="tel" id="mobile_no" value={mobileNo} onChange={handleMobileChange} required maxLength="10" pattern="\d{10}" placeholder="Enter 10-digit mobile number" aria-required="true" />
                    </div>
                    {/* Admission Date Field */}
                    <div className="form-group">
                        <label htmlFor="admissionDate">Admission Date <span className="required">*</span></label>
                        <input type="date" id="admissionDate" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} required aria-required="true" />
                    </div>
                    {/* Address Field */}
                    <div className="form-group">
                        <label htmlFor="address">Address <span className="required">*</span></label>
                        <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required rows="3" placeholder="Enter full address" aria-required="true"></textarea>
                    </div>
                    {/* Student Photo Field */}
                    <div className="form-group file-group">
                        <label>Student Photo</label>
                        <label htmlFor="student_photo" className="file-label">
                            <UploadIcon />
                            <span>{photoName || 'Choose Photo...'}</span>
                        </label>
                        <input type="file" id="student_photo" onChange={(e) => handleFileChange(e, setStudentPhoto, setPhotoName)} accept="image/jpeg, image/png, image/webp" className="file-input-hidden" />
                    </div>
                    {/* ID Proof Field */}
                    <div className="form-group file-group">
                        <label>ID Proof (Aadhaar/PAN etc.)</label>
                        <label htmlFor="id_proof" className="file-label">
                            <UploadIcon />
                            <span>{idProofName || 'Choose ID Proof...'}</span>
                        </label>
                        <input type="file" id="id_proof" onChange={(e) => handleFileChange(e, setIdProof, setIdProofName)} accept="application/pdf, image/jpeg, image/png, image/webp" className="file-input-hidden" />
                    </div>
                    {/* Submission Error Display */}
                    {submissionError && <p className="error-message">{submissionError}</p>}
                    {/* Form Actions */}
                    <div className="form-actions">
                        <button type="button" className="button-cancel" onClick={onClose} disabled={uploading}>Cancel</button>
                        <button type="submit" className="button-submit" disabled={uploading}>
                            {uploading ? 'Adding...' : 'Add Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudentForm;