import React, { useState } from 'react'; // Quotes aur curly braces sahi tarika hai
import axios from 'axios';

const BulkUpload = () => {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  // Use empty string to use relative URLs (works with nginx proxy)
  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleBulkShorten = async () => {
    setLoading(true);
    const urlArray = urls.split('\n').filter(url => url.trim() !== '');
    let fileContent = "ZIPLINK BULK EXPORT\n-------------------\n\n";

    try {
      const BASE_URL = window.location.origin;
      for (const url of urlArray) {
        const { data } = await axios.post(`${API_URL}/api/shorten`, { longUrl: url.trim() });
        fileContent += `Original: ${url}\nShort: ${BASE_URL}/${data.shortCode}\n\n`;
      }

      // Create and download file
      const element = document.createElement("a");
      const file = new Blob([fileContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = "shortened_links.txt";
      document.body.appendChild(element);
      element.click();
    } catch (err) {
      alert("Bulk processing failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100%', background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
      <h3>Bulk URL Shortener (Batch Processing)</h3>
      <textarea 
        placeholder="Paste multiple URLs (one per line)..." 
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        style={{ width: '100%', height: '120px', marginTop: '10px', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', boxSizing: 'border-box' }}
      />
      <button 
        onClick={handleBulkShorten} 
        disabled={loading}
        style={{ marginTop: '15px', width: '100%', padding: '12px', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {loading ? 'Processing Batch...' : 'Shorten All & Download File'}
      </button>
    </div>
  );
};
export default BulkUpload;