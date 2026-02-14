import React, { useState } from 'react';
import axios from 'axios';

const UrlShortener = () => {
  const [longUrl, setLongUrl] = useState('');
  const [password, setPassword] = useState('');
  const [expiryHours, setExpiryHours] = useState('');
  const [isOneTime, setIsOneTime] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Use empty string to use relative URLs (works with nginx proxy)
  const API_URL = import.meta.env.VITE_API_URL || '';
  const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;

  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    const link = `${BASE_URL}/${result.shortCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const payload = { 
        longUrl,
        ...(password && { password }),
        ...(expiryHours && { expiryHours: parseInt(expiryHours) }),
        ...(isOneTime && { isOneTime: true })
      };
      
      const { data } = await axios.post(`${API_URL}/api/shorten`, payload);
      setResult(data);
      // Reset form
      setLongUrl('');
      setPassword('');
      setExpiryHours('');
      setIsOneTime(false);
    } catch (err) {
      if (err.response?.data?.details) {
        setError(err.response.data.details.map(d => d.message).join(', '));
      } else {
        setError(err.response?.data?.error || 'Failed to shorten URL. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
      <h3 style={{ marginBottom: '15px' }}>Single URL Shortener</h3>
      
      {error && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '12px', 
          background: '#7f1d1d', 
          border: '1px solid #991b1b', 
          borderRadius: '8px', 
          color: '#fca5a5' 
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          type="url" 
          value={longUrl} 
          onChange={(e) => setLongUrl(e.target.value)}
          placeholder="Paste URL (http:// or https://)..." 
          required
          style={{ padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
        />
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (optional)" 
            style={{ flex: 1, minWidth: '150px', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
          />
          <input 
            type="number" 
            value={expiryHours} 
            onChange={(e) => setExpiryHours(e.target.value)}
            placeholder="Expiry (hours)" 
            min="1"
            max="8760"
            style={{ flex: 1, minWidth: '150px', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
          />
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={isOneTime} 
            onChange={(e) => setIsOneTime(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>One-time link (deletes after first use)</span>
        </label>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px 20px', 
            background: loading ? '#475569' : '#3b82f6', 
            border: 'none', 
            borderRadius: '8px', 
            color: 'white', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Shortening...' : 'Shorten URL'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '20px', textAlign: 'center', padding: '15px', background: '#0f172a', borderRadius: '8px' }}>
          <a 
            href={`${BASE_URL}/${result.shortCode}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: '#38bdf8', 
              fontWeight: 'bold', 
              fontSize: '18px', 
              wordBreak: 'break-all',
              textDecoration: 'none',
              display: 'block',
              marginBottom: '10px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {BASE_URL}/{result.shortCode}
          </a>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={handleCopy} 
              style={{ 
                padding: '8px 20px', 
                background: copySuccess ? '#10b981' : '#334155', 
                border: 'none', 
                borderRadius: '5px', 
                color: copySuccess ? 'white' : '#38bdf8', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 'bold'
              }}
            >
              {copySuccess ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <img src={result.qrCode} width="120" style={{ border: '4px solid white', borderRadius: '8px' }} alt="QR Code" />
            
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
              {result.isPasswordProtected && <span style={{ color: '#fbbf24' }}>🔒 Password Protected</span>}
              {result.isOneTime && <span style={{ color: '#f87171' }}> ⚠️ One-Time Link</span>}
              {result.expiresAt && (
                <div style={{ marginTop: '5px' }}>
                  Expires: {new Date(result.expiresAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UrlShortener;