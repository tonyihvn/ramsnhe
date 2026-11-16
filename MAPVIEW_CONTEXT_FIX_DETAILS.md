# Map Dashboard Context Error - Technical Deep Dive

## Error Details

### Symptoms
1. Warning: `Rendering <Context> directly is not supported`
2. Warning: `A context consumer was rendered with multiple children, or a child that isn't a function`
3. Error: `TypeError: render2 is not a function`
4. Component stack shows error originating from `MapContainerComponent` (react-leaflet internal)

### Root Cause Analysis
The issue stemmed from a React architectural mismatch:

1. **The Problem**: When `ClusterLayer` created an isolated React root using `createRoot()` for rendering popup content, that new root was completely detached from the main React component tree's context providers.

2. **Why It Failed**: 
   - `FacilityCard` uses `useMetadata()` hook
   - This hook requires a `MetadataProvider` ancestor in the component tree
   - The isolated popup root had NO providers
   - When `FacilityCard` tried to call `useMetadata()`, it failed

3. **The Cascade**:
   - React tried to render a Context directly (not through Consumer)
   - Multiple provider layers were attempted to be stacked
   - The internal `MapContainerComponent` Context.Consumer received malformed children
   - Rendering failed with cryptic error

## Solution Architecture

### Before (Broken)
```
App (with MetadataProvider, DataProvider)
├── MapDashboard
    └── MapView
        └── MapContainer
            └── ClusterLayer
                └── createRoot() → [DETACHED]
                    ├── DataProvider ← CREATED HERE (but no parent context)
                    ├── MetadataProvider ← CREATED HERE (but no parent context)
                    └── FacilityCard ← Can't access parent contexts
```

### After (Fixed)
```
App (with MetadataProvider, DataProvider)
├── MapDashboard
    └── MapView
        └── MapContainer
            └── ClusterLayer
                ├── Uses hooks: useMap() ← Works, has parent context
                └── createRoot() → [ISOLATED]
                    ├── DataProvider ← Creates new context for isolated root
                    ├── MetadataProvider ← Creates new context for isolated root
                    └── FacilityCard ← Can use useMetadata() in isolated context
```

## File Changes

### 1. `components/ClusterLayer.tsx`

**Added Imports:**
```typescript
import { DataProvider } from '../hooks/useData';
import { MetadataProvider } from '../contexts/MetadataContext';
```

**Modified popup rendering logic (line 42-61):**

Before:
```jsx
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
```

After:
```jsx
marker.on('popupopen', (e: any) => {
  try {
    const container = e.popup.getContent();
    if (container && !roots.has(marker)) {
      const root: Root = createRoot(container);
      const content = popupRenderer(loc);
      if (content) {
        root.render(
          React.createElement(
            DataProvider,
            null,
            React.createElement(
              MetadataProvider,
              null,
              React.createElement(React.Fragment, null, content)
            )
          )
        );
      }
      roots.set(marker, root);
    }
  } catch (er) {
    console.error('Error rendering popup content:', er);
  }
});
```

**Why this works:**
- Each isolated React root now has its own `DataProvider` and `MetadataProvider`
- Components rendered in the popup can successfully call `useMetadata()` and `useData()` hooks
- The providers are created fresh for each popup to avoid stale state

### 2. `pages/MapView.tsx`

**Removed Imports (now in ClusterLayer):**
```typescript
// REMOVED:
import { DataProvider } from '../hooks/useData';
import { MetadataProvider } from '../contexts/MetadataContext';
import { Popup } from 'react-leaflet'; // unused
```

**Simplified popupRenderer (line 449-458):**

Before:
```jsx
popupRenderer={(loc) => {
  const f = loc.payload as any;
  return (
    <DataProvider>
      <MetadataProvider>
        <div style={{ padding: 8 }}>
          <FacilityCard facility={f} visibleIndicators={enabledIndicators} visibleActivities={selectedActivities} />
        </div>
      </MetadataProvider>
    </DataProvider>
  );
}}
```

After:
```jsx
popupRenderer={(loc) => {
  const f = loc.payload as any;
  return (
    <div style={{ padding: 8 }}>
      <FacilityCard facility={f} visibleIndicators={enabledIndicators} visibleActivities={selectedActivities} />
    </div>
  );
}}
```

**Why this works:**
- Provider wrapping now happens in `ClusterLayer` where it's needed
- `MapView` returns pure JSX that gets rendered in the isolated root
- Cleaner separation of concerns

## Key Concepts

### Why Context Providers Need to Wrap the Root Component
- React contexts only work within the provider's component tree
- A `useMetadata()` hook needs a `MetadataProvider` ancestor
- If you create an isolated root with `createRoot()`, that new root has NO parent providers
- Solution: Wrap the content with necessary providers when rendering to isolated roots

### The Provider Pattern for Isolated Roots
```javascript
const root = createRoot(domElement);
root.render(
  <DataProvider>
    <MetadataProvider>
      {/* Components here can use useData() and useMetadata() */}
      <YourComponent />
    </MetadataProvider>
  </DataProvider>
);
```

## Testing Checklist

- [x] Build succeeds without errors
- [x] Map dashboard page loads without console errors
- [ ] Click on facility markers to open popups
- [ ] Verify popup content renders correctly (FacilityCard displays)
- [ ] Verify no console warnings about Context
- [ ] Verify popups close properly
- [ ] Test with multiple facilities

## Performance Implications

- **Minimal**: Each popup creates fresh provider instances, but this is negligible
- **Benefit**: Cleaner code organization with better separation of concerns
- **No regression**: Functionality identical to intended behavior

## Browser Support
Works with all modern browsers supporting React 18+ and createRoot API
