# Map Dashboard Context Error Fix

## Problem
When navigating to the `/map-dashboard` route, the application threw the following error:

```
Warning: Rendering <Context> directly is not supported and will be removed in a future major release. 
Did you mean to render <Context.Consumer> instead?
```

Followed by:
```
Warning: A context consumer was rendered with multiple children, or a child that isn't a function.
Uncaught TypeError: render2 is not a function
```

The error occurred because the `ClusterLayer` component was rendering popup content in a detached DOM tree (outside the React component hierarchy), and that content tried to use React hooks that depend on context providers.

## Root Cause
The issue was in the `ClusterLayer.tsx` component. When `popupRenderer` content was rendered via `createRoot()` directly into a Leaflet popup container, the new React root didn't have access to the `MetadataProvider` and `DataProvider` contexts.

The `FacilityCard` component uses the `useMetadata()` hook, which requires being wrapped with a `MetadataProvider`. When rendered in an isolated React root (created by `createRoot`), it didn't have access to that provider, causing context errors.

## Solution
Wrapped the popup content with the required providers (`DataProvider` and `MetadataProvider`) when rendering it in the isolated React root created by `ClusterLayer`.

### Changes Made

**File: `components/ClusterLayer.tsx`**

1. **Added imports for providers:**
   ```jsx
   import { DataProvider } from '../hooks/useData';
   import { MetadataProvider } from '../contexts/MetadataContext';
   ```

2. **Wrapped popup content with providers:**
   ```jsx
   // BEFORE (failed - no context providers in isolated root):
   root.render(React.createElement(React.Fragment, null, popupRenderer(loc) as any));

   // AFTER (success - provides required context):
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
   ```

**File: `pages/MapView.tsx`**

1. **Removed now-unnecessary provider imports** (since they're now in ClusterLayer):
   ```jsx
   // REMOVED:
   import { DataProvider } from '../hooks/useData';
   import { MetadataProvider } from '../contexts/MetadataContext';
   ```

2. **Simplified popupRenderer** (no longer needs to wrap with providers):
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

## Impact
- ✅ Fixes the Context error when rendering popups in isolated React roots
- ✅ `FacilityCard` now has proper access to metadata and data contexts
- ✅ Cleaner `MapView` component (providers moved to where they're needed)
- ✅ Proper separation of concerns - popup content renders with its required context

## How It Works
1. `MapContainer` and `ClusterLayer` operate in the main React component tree (have access to providers via hooks)
2. When a popup opens, `ClusterLayer` creates an isolated React root via `createRoot()`
3. That isolated root is wrapped with `DataProvider` and `MetadataProvider` so components rendered into it have access to required contexts
4. `FacilityCard` and other components can now use `useMetadata()` and `useData()` hooks without errors

## Testing
After the fix, navigating to `/map-dashboard` should display the map without console errors. Clicking on facility markers will open popups with properly rendered `FacilityCard` content.
