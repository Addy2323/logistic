// Centralized API configuration
// This file provides the base URLs for all API calls

export const IS_LOCAL = (() => {
    const hostname = window.location.hostname;
    return (
        hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.endsWith('.local')
    );
})();

const getApiUrl = () => {
    if (IS_LOCAL) {
        return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    }

    return `${window.location.origin}/api`;
};

export const API_URL = getApiUrl();
export const API_HOST = API_URL.replace('/api', '');
