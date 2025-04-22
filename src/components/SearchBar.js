import React, { useState } from 'react';
import { FaSearch, FaArrowLeft } from 'react-icons/fa';
import './SearchBar.css';

const SearchBar = ({ onSearch, onClearSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleInputChange = (event) => {
        setSearchTerm(event.target.value);
        if (event.target.value.trim() === '') {
            setIsSearching(false);
            if (onClearSearch) {
                onClearSearch();
            }
        } else {
            setIsSearching(true);
        }
    };

    const triggerSearch = () => {
        const trimmedSearchTerm = searchTerm.trim();
        if (trimmedSearchTerm) {
            setIsSearching(true);
            onSearch(trimmedSearchTerm);
        } else {
            setIsSearching(false);
            if (onClearSearch) {
                onClearSearch();
            }
        }
    };

    const handleSearchClick = () => {
        triggerSearch();
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            triggerSearch();
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setIsSearching(false);
        if (onClearSearch) {
            onClearSearch();
        }
    };

    return (
        <div className="search-bar-container">
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search Student Name..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="search-input"
                />
                {isSearching ? (
                    <button
                        onClick={handleClearSearch}
                        className="search-button clear-button"
                        aria-label="Clear Search"
                    >
                        <FaArrowLeft />
                    </button>
                ) : (
                    <button
                        onClick={handleSearchClick}
                        className="search-button"
                        aria-label="Search"
                    >
                        <FaSearch />
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchBar;