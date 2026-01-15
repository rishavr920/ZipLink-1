import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PasswordPrompt = ({ code }) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Use empty string to use relative URLs (works with nginx proxy)
  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/verify-password/${code}`, { password });
      
      if (data.success) {
        // Redirect to original URL
        window.location.href = data.originalUrl;
      } else {
        setError('Failed to verify password. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Incorrect password. Please try again.');
      } else if (err.response?.status === 404) {
        setError('Link not found or has been deleted.');
      } else if (err.response?.status === 410) {
        setError('This link has expired.');
      } else {
        setError('Failed to verify password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '500px', 
      margin: '0 auto',
      background: '#1e293b', 
      padding: '40px', 
      borderRadius: '16px', 
      border: '1px solid #334155' 
    }}>
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>🔒 Password Protected Link</h2>
      <p style={{ color: '#94a3b8', marginBottom: '25px', textAlign: 'center' }}>
        This link requires a password to access.
      </p>
      
      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          background: '#7f1d1d', 
          border: '1px solid #991b1b', 
          borderRadius: '8px', 
          color: '#fca5a5' 
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password" 
          required
          autoFocus
          style={{ 
            width: '100%', 
            padding: '12px', 
            borderRadius: '8px', 
            background: '#0f172a', 
            border: '1px solid #334155', 
            color: 'white',
            marginBottom: '15px',
            boxSizing: 'border-box'
          }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: loading ? '#475569' : '#3b82f6', 
            border: 'none', 
            borderRadius: '8px', 
            color: 'white', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Verifying...' : 'Access Link'}
        </button>
      </form>
    </div>
  );
};

export default PasswordPrompt;
