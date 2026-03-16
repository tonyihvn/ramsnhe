import React, { useEffect, useRef, useState } from 'react';

type Props = {
  children: React.ReactNode;
  storageKey: string;
  defaultLeft?: number;
  defaultTop?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
};

const FloatingCard: React.FC<Props> = ({ children, storageKey, defaultLeft = 40, defaultTop = 40, defaultWidth = 360, defaultHeight = 420, minWidth = 240, minHeight = 120 }) => {
  const [pos, setPos] = useState<{ left: number; top: number }>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw).pos || { left: defaultLeft, top: defaultTop };
    } catch (e) { }
    return { left: defaultLeft, top: defaultTop };
  });
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw).size || { width: defaultWidth, height: defaultHeight };
    } catch (e) { }
    return { width: defaultWidth, height: defaultHeight };
  });

  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const [zIndex, setZIndex] = useState<number>(9999);

  useEffect(() => {
    const onMove = (e: MouseEvent | PointerEvent) => {
      if (dragging.current) {
        const x = (e as any).clientX - dragOffset.current.x;
        const y = (e as any).clientY - dragOffset.current.y;
        setPos(p => ({ left: Math.max(8, x), top: Math.max(8, y) }));
      } else if (resizing.current) {
        setSize(s => {
          const newW = Math.max(minWidth, (e as any).clientX - (pos.left || 0));
          const newH = Math.max(minHeight, (e as any).clientY - (pos.top || 0));
          return { width: newW, height: newH };
        });
      }
    };
    const onUp = (ev?: MouseEvent | PointerEvent) => {
      dragging.current = false;
      resizing.current = false;
      // release pointer capture if we captured one
      try {
        const capId = pointerIdRef.current;
        if (capId !== null) {
          // try release on document.activeElement or the dialog element
          try { (document as any).releasePointerCapture && (document as any).releasePointerCapture(capId); } catch (e) { }
          pointerIdRef.current = null;
        }
      } catch (e) { }
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (e) { }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('pointermove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('pointerup', onUp as any);
    window.addEventListener('pointercancel', onUp as any);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointermove', onMove as any);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('pointerup', onUp as any);
      window.removeEventListener('pointercancel', onUp as any);
    };
  }, [pos.left, pos.top, minWidth, minHeight]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ pos, size })); } catch (e) { }
  }, [pos, size, storageKey]);

  const onHeaderDown = (e: React.MouseEvent) => {
    // only react to left mouse button
    if ((e as any).button !== 0) return;
    bringToFront();
    dragging.current = true;
    // compute offset relative to the card's positioned left/top (this aligns with the inline style left/top)
    // using the `pos` state ensures we match the coordinates used in the element's layout
    dragOffset.current.x = e.clientX - pos.left;
    dragOffset.current.y = e.clientY - pos.top;
    // also stop propagation so map or other global handlers don't interfere with the drag start
    try { e.stopPropagation(); } catch (err) { }
    // prevent text selection while dragging
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (err) { }
    e.preventDefault();
  };

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    // unify pointer-based drag start (touch/pen/mouse) with mouse drag
    if ((e as any).button && (e as any).button !== 0) return;
    bringToFront();
    dragging.current = true;
    pointerIdRef.current = (e as any).pointerId || null;
    dragOffset.current.x = (e as any).clientX - pos.left;
    dragOffset.current.y = (e as any).clientY - pos.top;
    try { (e.target as Element).setPointerCapture((e as any).pointerId); } catch (err) { }
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (err) { }
    try { e.stopPropagation(); } catch (err) { }
    (e as any).preventDefault?.();
  };

  const onResizeDown = (e: React.MouseEvent) => {
    bringToFront();
    resizing.current = true;
    e.preventDefault();
    e.stopPropagation();
  };

  const bringToFront = () => {
    try {
      const w = window as any;
      if (!w.__floating_card_zindex_counter) w.__floating_card_zindex_counter = 10000;
      w.__floating_card_zindex_counter += 1;
      setZIndex(w.__floating_card_zindex_counter);
    } catch (e) {
      setZIndex(prev => prev + 1);
    }
  };

  return (
    <div
      role="dialog"
      onMouseDown={() => bringToFront()}
      style={{
        position: 'fixed', left: pos.left, top: pos.top, zIndex: zIndex,
        width: 'auto', maxWidth: size.width, height: size.height,
        background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}
    >
      <div onMouseDown={onHeaderDown} onPointerDown={onHeaderPointerDown} style={{ cursor: 'grab', padding: '8px 10px', borderBottom: '1px solid #eee', background: 'linear-gradient(180deg,#ffffff,#fafafa)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>Map Dashboard</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Drag / Resize</div>
      </div>
      <div style={{ padding: 10, overflow: 'auto', flex: 1 }}>{children}</div>
      <div onMouseDown={onResizeDown} style={{ width: 18, height: 18, position: 'absolute', right: 6, bottom: 6, cursor: 'nwse-resize', background: 'transparent' }} />
    </div>
  );
};

export default FloatingCard;
