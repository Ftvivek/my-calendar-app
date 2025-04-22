// AddStudentForm.js
import React, { useState } from 'react';
import './AddStudentForm.css'; // Make sure this CSS file exists and is styled appropriately

// SVG Icon Component (remains the same)
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 4.095 0 5.555 0 7.318 0 9.366 1.708 11 3.781 11H7.5V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11h4.188C14.502 11 16 9.57 16 7.773c0-1.636-1.242-2.969-2.834-3.194C12.923 1.999 10.69 0 8 0zm-.5 14.5V11h1v3.5a5.5 0 0 1-1 0z"/>
    </svg>
);

// Main Form Component
const AddStudentForm = ({ onClose, onStudentAdded }) => {
    // State variables
    const [name, setName] = useState('');
    const [admissionDate, setAdmissionDate] = useState('');
    const [mobileNo, setMobileNo] = useState(''); // Changed from mobile to mobileNo
    const [address, setAddress] = useState('');
    const [studentPhoto, setStudentPhoto] = useState(null); // Changed from photo to studentPhoto
    const [idProof, setIdProof] = useState(null);
    const [photoName, setPhotoName] = useState('');
    const [idProofName, setIdProofName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submissionError, setSubmissionError] = useState('');

    // Handler for mobile number input (restricts to 10 digits)
    const handleMobileChange = (event) => {
        const value = event.target.value;
        // Allow only digits and limit length to 10
        if (/^\d*$/.test(value) && value.length <= 10) {
            setMobileNo(value);
        }
    };

    // Handler for file input changes
    const handleFileChange = (event, setFile, setNameDisplay) => {
        const file = event.target.files[0];
        if (file) {
            setFile(file);
            setNameDisplay(file.name); // Display the chosen file name
        } else {
            setFile(null);
            setNameDisplay(''); // Clear display if no file selected
        }
    };

    // Handler for form submission
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default form submission
        setSubmissionError(''); // Clear previous errors

        // --- DEBUGGING: Check values before validation ---
        console.log('Submitting with values:');
        console.log('Name:', `"${name}"`);
        console.log('Mobile No:', `"${mobileNo}"`);
        console.log('Address:', `"${address}"`);
        console.log('Admission Date:', `"${admissionDate}"`);
        // --- End Debugging ---

        // Trim string inputs to remove leading/trailing whitespace
        const trimmedName = name.trim();
        const trimmedAddress = address.trim();

        // --- Validation ---
        const missingFields = [];
        if (!trimmedName) missingFields.push('Name');
        if (!mobileNo) missingFields.push('Mobile No.');
        if (!trimmedAddress) missingFields.push('Address');
        if (!admissionDate) missingFields.push('Admission Date');

        if (missingFields.length > 0) {
            setSubmissionError(`Please fill in all required fields: ${missingFields.join(', ')}.`);
            console.error('Validation failed. Missing required fields:', missingFields.join(', '));
            return; // Stop submission
        }

        // Mobile number specific validation
        if (mobileNo.length !== 10 || !/^\d+$/.test(mobileNo)) {
            setSubmissionError('Mobile number must be a 10-digit number.');
            return; // Stop submission
        }

        // --- Submission Logic ---
        setUploading(true); // Indicate submission is in progress

        const formData = new FormData();
        // Append data using backend expected field names and trimmed values
        formData.append('name', trimmedName);
        formData.append('admissionDate', admissionDate);
        formData.append('mobile_no', mobileNo); // Backend expects 'mobile_no'
        formData.append('address', trimmedAddress);
        if (studentPhoto) {
            formData.append('student_photo', studentPhoto); // Backend expects 'student_photo'
        }
        if (idProof) {
            formData.append('id_proof', idProof); // Backend expects 'id_proof'
        }

        try {
            // API Request
            const response = await fetch('/api/students', {
                method: 'POST',
                body: formData,
                // Note: Don't set 'Content-Type': 'multipart/form-data' manually.
                // The browser does this automatically (and correctly includes the boundary)
                // when the body is a FormData object.
            });

            // Handle Response
            if (response.ok) {
                const newStudent = await response.json();
                console.log('Student added successfully:', newStudent);
                onStudentAdded(newStudent); // Notify parent component
                onClose(); // Close the form modal/overlay
            } else {
                // Handle HTTP errors (e.g., 400, 500)
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' })); // Attempt to parse JSON error, provide fallback
                console.error(`Error adding student (${response.status}):`, errorData);
                setSubmissionError(errorData.error || `Failed to add student. Server responded with status ${response.status}.`);
            }
        } catch (error) {
            // Handle network errors or other exceptions during fetch
            console.error('Network or submission error:', error);
            setSubmissionError('Failed to connect to the server. Please check your network connection.');
        } finally {
            // Runs whether success or error
            setUploading(false); // Submission finished
        }
    };

    // --- JSX Rendering ---
    return (
        <div className="add-student-form-overlay" onClick={onClose}>
            {/* Stop propagation prevents clicks inside the form from closing it */}
            <div className="add-student-form-container" onClick={(e) => e.stopPropagation()}>
                <h2>Add New Student</h2>
                <button className="close-button" onClick={onClose} aria-label="Close form">×</button>

                {/* Use noValidate to disable default browser validation */}
                <form onSubmit={handleSubmit} noValidate>
                    {/* Name Field */}
                    <div className="form-group">
                        <label htmlFor="name">Full Name <span className="required">*</span></label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Enter student's full name"
                            aria-required="true"
                         />
                    </div>

                    {/* Mobile No Field */}
                    <div className="form-group">
                        <label htmlFor="mobile_no">Mobile No. <span className="required">*</span></label>
                        <input
                            type="tel" // Use tel for semantic correctness
                            id="mobile_no"
                            value={mobileNo}
                            onChange={handleMobileChange}
                            required
                            maxLength="10"
                            pattern="\d{10}" // Pattern for visual cue (though JS validation is primary)
                            placeholder="Enter 10-digit mobile number"
                            aria-required="true"
                        />
                    </div>

                    {/* Admission Date Field */}
                    <div className="form-group">
                        <label htmlFor="admissionDate">Admission Date <span className="required">*</span></label>
                        <input
                            type="date"
                            id="admissionDate"
                            value={admissionDate}
                            onChange={(e) => setAdmissionDate(e.target.value)}
                            required
                            aria-required="true"
                        />
                    </div>

                    {/* Address Field */}
                    <div className="form-group">
                        <label htmlFor="address">Address <span className="required">*</span></label>
                        <textarea
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            rows="3"
                            placeholder="Enter full address"
                            aria-required="true"
                        ></textarea>
                    </div>

                    {/* Student Photo Field */}
                    <div className="form-group file-group">
                        <label>Student Photo</label> {/* Label for the group */}
                        <label htmlFor="student_photo" className="file-label"> {/* Clickable label */}
                            <UploadIcon />
                            <span>{photoName || 'Choose Photo...'}</span>
                        </label>
                        <input
                            type="file"
                            id="student_photo"
                            onChange={(e) => handleFileChange(e, setStudentPhoto, setPhotoName)}
                            accept="image/jpeg, image/png, image/webp" // Specify accepted image types
                            className="file-input-hidden" // Hide default ugly input
                        />
                    </div>

                    {/* ID Proof Field */}
                    <div className="form-group file-group">
                        <label>ID Proof (Aadhaar/PAN etc.)</label> {/* Label for the group */}
                        <label htmlFor="id_proof" className="file-label"> {/* Clickable label */}
                            <UploadIcon />
                            <span>{idProofName || 'Choose ID Proof...'}</span>
                        </label>
                        <input
                            type="file"
                            id="id_proof"
                            onChange={(e) => handleFileChange(e, setIdProof, setIdProofName)}
                            accept="application/pdf, image/jpeg, image/png, image/webp" // Specify accepted types
                            className="file-input-hidden" // Hide default ugly input
                        />
                    </div>

                    {/* Submission Error Display */}
                    {submissionError && <p className="error-message">{submissionError}</p>}

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button type="button" className="button-cancel" onClick={onClose} disabled={uploading}>
                            Cancel
                        </button>
                        <button type="submit" className="button-submit" disabled={uploading}>
                            {uploading ? 'Adding...' : 'Add Student'} {/* Change text/state when uploading */}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudentForm;