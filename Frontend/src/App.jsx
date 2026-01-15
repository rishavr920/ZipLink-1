import React from 'react';
import UrlShortener from './components/UrlShortener';
import BulkUpload from './components/BulkUpload';

function App() {
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', justifyContent: 'center', width: '100vw', overflowX: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '800px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: '800', margin: '0', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ZipLink
          </h1>
          <p style={{ color: '#94a3b8' }}>Distributed & Scalable URL Engine</p>
        </div>

        <UrlShortener />
        <div style={{ margin: '40px 0', width: '100%', borderTop: '1px dashed #334155' }} />
        <BulkUpload />
        
      </div>
    </div>
  );
}
export default App;