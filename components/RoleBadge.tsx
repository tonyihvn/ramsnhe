import React from 'react';
import { useMetadata } from '../contexts/MetadataContext';
import { useMockData } from '../hooks/useMockData';

const RoleBadge: React.FC<{ small?: boolean }> = ({ small = false }) => {
  const { meta } = useMetadata();
  const { currentUser } = useMockData();

  if (!currentUser) return null;

  const roleKey = currentUser.role;
  // Try id match first, then name match
  const roleMeta = meta.roles?.find(r => r.id === roleKey) || meta.roles?.find(r => String(r.name).toLowerCase() === String(roleKey).toLowerCase());
  const display = roleMeta ? roleMeta.name : currentUser.role;

  const style: React.CSSProperties = {
    display: 'inline-block',
    padding: small ? '2px 6px' : '4px 8px',
    borderRadius: 12,
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: small ? 11 : 12,
    fontWeight: 600
  };

  return <span style={style} title={display}>{display}</span>;
};

export default RoleBadge;
