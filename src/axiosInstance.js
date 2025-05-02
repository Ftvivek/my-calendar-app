// src/api/axiosInstance.js
// (Make sure this file is located inside the 'src' folder, ideally in 'src/api/')

import axios from 'axios';

// 1. Create the Axios instance
const axiosInstance = axios.create({
    // 2. Set the base URL using the environment variable
    //    This will correctly read REACT_APP_API_URL when the file is inside 'src'.
    baseURL: process.env.REACT_APP_API_URL,

    // 3. Optional: Set default headers if needed globally
    // headers: {
    //   'Content-Type': 'application/json',
    // },

    // 4. Optional: Set a default timeout
    // timeout: 10000, // milliseconds
});

/*
// == OPTIONAL: Interceptors (Advanced Configuration) ==

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        // Modify config before request is sent (e.g., add auth token)
        // const token = localStorage.getItem('authToken');
        // if (token) {
        //     config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        // Handle request setup errors
        return Promise.reject(error);
    }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        // Process successful responses (status code 2xx)
        return response;
    },
    (error) => {
        // Handle global errors for responses outside 2xx range
        console.error('API Error:', error.response || error.message || error);
        // Example: Redirect on 401
        // if (error.response && error.response.status === 401) {
        //    window.location.href = '/login';
        // }
        return Promise.reject(error); // Propagate the error
    }
);
*/

// 5. Export the configured instance
export default axiosInstance;