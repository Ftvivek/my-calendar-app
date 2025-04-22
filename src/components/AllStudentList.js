import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import './AllStudentList.css';
import { FaTimes } from 'react-icons/fa';

const AllStudentList = ({ onClose }) => {
    const [students, setStudents] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAllStudents = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/students');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setStudents(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching all students:', err);
                setError('Failed to load students.');
                setLoading(false);
            }
        };

        fetchAllStudents();
    }, []);

    const handleSearch = async (searchTerm) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/students/search?name=${searchTerm}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setSearchResults(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching search results:', err);
            setError('Failed to fetch search results.');
            setLoading(false);
            setSearchResults([]);
        }
    };

    const handleClearSearch = () => {
        setSearchResults([]);
    };

    return (
        <div className="all-students-list-overlay" onClick={onClose}>
            <div className="all-students-list-container" onClick={(e) => e.stopPropagation()}>
                <h2>All Students</h2>
                <button onClick={onClose} className="close-button" aria-label="Close">
                    <FaTimes />
                </button>

                <SearchBar onSearch={handleSearch} onClearSearch={handleClearSearch} />

                {loading ? (
                    <p>Loading students...</p>
                ) : error ? (
                    <p>Error loading students: {error}</p>
                ) : searchResults.length > 0 ? (
                    <div className="search-results-overlay">
                        <h3>Search Results</h3>
                        <ul className="student-list">
                            {searchResults.map(student => (
                                <li
                                    key={student.id || Math.random()}
                                    className="student-item"
                                    onClick={() => navigate(`/student-profile/${student.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span className="student-name">{student.name}</span>
                                    <span className="student-info">Grade: {student.grade}</span>
                                    <span className="student-info">Admission: {new Date(student.admission_date).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : students.length > 0 ? (
                    <ul className="student-list">
                        {students.map(student => (
                            <li key={student.id || Math.random()} className="student-item">
                                <Link to={`/student-profile/${student.id}`} className="student-name-link">
                                    <span className="student-name">{student.name}</span>
                                </Link>
                                <span className="student-info">Grade: {student.grade}</span>
                                <span className="student-info">Admission: {new Date(student.admission_date).toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No students found.</p>
                )}
            </div>
        </div>
    );
};

export default AllStudentList;