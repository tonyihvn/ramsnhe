import React from 'react';
import usePermissions from '../hooks/usePermissions';

const DownloadBundle: React.FC<{ facility: any }> = ({ facility }) => {
  const { hasPermission } = usePermissions();
  const canDownload = hasPermission('DOWNLOAD_BUNDLE');

  const handleDownload = () => {
    if (!canDownload) return;
    // In production this would call an API to generate and sign the bundle
    const payload = { facilityId: facility?.id, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify({ bundle: payload }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${facility?.id || 'bundle'}-verification-bundle.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={!canDownload} title={!canDownload ? 'You do not have permission to download bundles' : 'Download verification bundle'} style={{ padding: '6px 10px', borderRadius: 6, background: canDownload ? '#2563eb' : '#e5e7eb', color: canDownload ? '#fff' : '#9ca3af', border: 'none', cursor: canDownload ? 'pointer' : 'not-allowed' }}>
        Download Verification Bundle
      </button>
      {!canDownload && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Request access to download bundles from the Controller.</div>}
    </div>
  );
};

export default DownloadBundle;
