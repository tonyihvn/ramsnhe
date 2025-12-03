import React from 'react';
import DownloadBundle from './DownloadBundle';

const BundlePreview: React.FC<{ facility: any }> = ({ facility }) => {
  const tier = facility.tier || 'Unknown';
  const targets = facility?.resilience_targets || { energy: 'n/a' };
  const signoffs = facility?.signoffs || [{ by: 'Controller', date: 'synthetic' }];

  return (
    <div style={{ borderTop: '1px dashed #ddd', paddingTop: 8 }}>
      <div style={{ fontWeight: 700 }}>Verification Bundle Preview</div>
      <div style={{ marginTop: 6 }}><strong>Tier:</strong> {tier}</div>
      <div style={{ marginTop: 6 }}><strong>Resilience Targets:</strong>
        <ul>
          {Object.keys(targets).map(k => <li key={k}>{k}: {targets[k]}</li>)}
        </ul>
      </div>
      <div style={{ marginTop: 6 }}>
        <strong>Sign-offs</strong>
        <ul>
          {signoffs.map((s: any, i: number) => <li key={i}>{s.by} — {s.date}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: 8 }}>
        {/** Download bundle button — enabled only if user has DOWNLOAD_BUNDLE permission */}
        <DownloadBundle facility={facility} />
      </div>
    </div>
  );
}

export default BundlePreview;
