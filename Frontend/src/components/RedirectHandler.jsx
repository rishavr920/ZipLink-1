import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PasswordPrompt from './PasswordPrompt';

const RedirectHandler = ({ code }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  // Use window.location.origin to work with nginx proxy
  const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Call the API endpoint to get redirect info
        const apiUrl = API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/redirect/${code}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          
          if (response.status === 404) {
            setError(data.message || 'Link not found or has been deleted.');
            setLoading(false);
            return;
          }
          
          if (response.status === 410) {
            setError(data.message || 'This link has expired.');
            setLoading(false);
            return;
          }
          
          setError('Failed to redirect. Please try again.');
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.requiresPassword) {
          // Password protected - show password prompt
          setRequiresPassword(true);
          setLoading(false);
          return;
        }

        if (data.redirect && data.url) {
          // Redirect to original URL
          window.location.href = data.url;
          return;
        }

        // Fallback: try direct redirect
        window.location.href = `${apiUrl}/${code}`;
      } catch (err) {
        // Network error - try direct redirect as fallback
        console.error('Redirect error:', err);
        const apiUrl = API_URL || window.location.origin;
        window.location.href = `${apiUrl}/${code}`;
      }
    };

    handleRedirect();
  }, [code, API_URL]);

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div>Redirecting...</div>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return <PasswordPrompt code={code} />;
  }

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0f172a',
        color: 'white'
      }}>
        <div style={{ 
          background: '#1e293b', 
          padding: '40px', 
          borderRadius: '16px', 
          border: '1px solid #334155',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ marginBottom: '15px' }}>Error</h2>
          <p style={{ color: '#fca5a5', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default RedirectHandler;
