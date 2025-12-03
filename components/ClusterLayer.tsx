import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

type Location = { id: string; lat: number; lng: number; popupHtml?: string; payload?: any };

const ClusterLayer: React.FC<{ locations: Location[]; popupRenderer?: (loc: Location) => React.ReactNode; getIcon?: (loc: Location) => L.Icon }> = ({ locations, popupRenderer, getIcon }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const clusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup() : L.layerGroup();

    // Keep track of roots for cleanup
    const roots = new Map();

    locations.forEach(loc => {
      try {
        const icon = (getIcon && typeof getIcon === 'function') ? getIcon(loc) : undefined;
        const marker = icon ? L.marker([loc.lat, loc.lng], { icon, riseOnHover: true, riseOffset: 250 }) : L.marker([loc.lat, loc.lng], { riseOnHover: true, riseOffset: 250 });
        // create an empty div as popup container so we can mount React into it
        const popupContainer = document.createElement('div');
        // make the popup container roomy by default so long code blocks and the
        // indicators panel can fit without causing Leaflet to aggressively pan.
        popupContainer.className = 'nherams-popup-container';
        popupContainer.style.minWidth = '280px';
        popupContainer.style.maxWidth = '520px';
        popupContainer.style.width = 'auto';
        popupContainer.style.overflow = 'visible';
        // Bind popup with explicit sizing options and gentle autoPan padding
        marker.bindPopup(popupContainer, { autoPan: true, keepInView: true, minWidth: 280, maxWidth: 520, autoPanPadding: [40, 40] });

        if (popupRenderer) {
          marker.on('popupopen', (e: any) => {
            try {
              const container = e.popup.getContent();
              if (container && !roots.has(marker)) {
                const root: Root = createRoot(container);
                root.render(React.createElement(React.Fragment, null, popupRenderer(loc) as any));
                roots.set(marker, root);
              }
            } catch (er) {
              // ignore
            }
          });

          marker.on('popupclose', (e: any) => {
            try {
              const root = roots.get(marker);
              if (root) {
                root.unmount();
                roots.delete(marker);
              }
            } catch (er) {
              // ignore
            }
          });
        } else if (loc.popupHtml) {
          // fallback: set simple html
          marker.bindPopup(loc.popupHtml);
        }

        // ensure marker element has pointer cursor when available and bring to front on click
        try {
          marker.on('add', () => {
            try {
              const el = (marker as any)._icon || (marker as any).getElement && (marker as any).getElement();
              if (el && el.style) el.style.cursor = 'pointer';
            } catch (e) { /* ignore */ }
          });
          marker.on('click', () => {
            try {
              // ensure popup opens immediately on click rather than relying on default
              // behaviour which may be interfered with by cluster or map handlers
              marker.bringToFront && marker.bringToFront();
              marker.openPopup && marker.openPopup();
            } catch (e) { }
          });
        } catch (e) { /* ignore */ }

        clusterGroup.addLayer(marker);
      } catch (e) {
        // ignore invalid coords
      }
    });

    map.addLayer(clusterGroup);
    return () => {
      try { map.removeLayer(clusterGroup); } catch (e) { }
      // unmount any roots
      roots.forEach((r: Root) => {
        try { r.unmount(); } catch (e) { }
      });
      roots.clear();
    };
  }, [map, locations, popupRenderer]);

  return null;
};

export default ClusterLayer;
