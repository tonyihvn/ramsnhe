# Custom Labels & Font Sizes for Interactive Stats

## Overview
Enhanced the Interactive Stats feature to allow admins to:
1. **Rename stats** with custom labels (e.g., "Total Facility Teams" instead of "COUNT DISTINCT Are the facility team...")
2. **Control font sizes** for both the label and stat value (5 size options from Small to 2X Large)

## Features

### 1. Custom Labels
- Optional custom display text for each stat
- **When provided**: Shows custom label instead of aggregate type + question name
- **When blank**: Shows default display (aggregate type + question name)
- Helps create more readable and intuitive dashboards

### 2. Font Size Selection
- 5 size options:
  - **Small (12px)** - Compact display for dashboards with many stats
  - **Base (16px)** - Default size
  - **Large (18px)** - Medium emphasis
  - **Extra Large (20px)** - High emphasis
  - **2X Large (24px)** - Maximum emphasis for key metrics
- Font size applies to both:
  - The label text (custom or default)
  - The stat value (the number being displayed)

## Implementation Details

### Type Definition
```typescript
type InteractiveStatItem = {
  statKey: string;
  questionId: string;
  aggregateType: string;
  conditions: StatCondition[];
  label?: string;           // NEW: Custom display text
  fontSize?: string;        // NEW: Font size (sm, base, lg, xl, 2xl)
};
```

### State Variables Added
```typescript
const [selectedStatLabel, setSelectedStatLabel] = useState<string>('');
const [selectedStatFontSize, setSelectedStatFontSize] = useState<string>('base');
```

### Updated Modal UI
The Interactive Stats Settings Modal now includes:

```
┌─ Interactive Stats Settings ───────────────────┐
│                                                 │
│ [Aggregate Type dropdown] [Question dropdown]  │
│                                                 │
│ [WHERE clause section]                         │
│                                                 │
│ Label (Optional - Custom Display Text)         │
│ ┌─────────────────────────────────────────┐   │
│ │ e.g., Total Facility Teams              │   │
│ └─────────────────────────────────────────┘   │
│ Leave blank to show aggregate type...          │
│                                                 │
│ Label Font Size                                │
│ ┌─────────────────────────────────────────┐   │
│ │ Base (16px)                        ▼   │   │
│ └─────────────────────────────────────────┘   │
│ Applies to both label and stat value           │
│                                                 │
│          [Add Stat]  [Save Stats Config]       │
└─────────────────────────────────────────────────┘
```

### Stats Card Display

**Without Custom Label:**
```
┌─────────────────────┐
│ COUNT DISTINCT      │
│ Are the facility... │
│                     │
│       42            │
└─────────────────────┘
```

**With Custom Label & Font Size:**
```
┌──────────────────────────┐
│ Total Facility Teams     │  (font-size: 20px)
│                          │
│          42              │  (font-size: 24px + font-size 2xl)
└──────────────────────────┘
```

## Files Modified

### C:\Users\Ogochukwu\Desktop\PROJECTS\REACTJS\oneapp\pages\ReportViewPage.tsx

#### 1. Type Definition (line ~27)
- Added `label?: string;` - Custom display text
- Added `fontSize?: string;` - Font size selector

#### 2. State Variables (line ~105)
- Added `selectedStatLabel` state
- Added `selectedStatFontSize` state

#### 3. handleAddStatClick() Function (line ~502)
- Passes `selectedStatLabel` and `selectedStatFontSize` to `handleAddStat()`
- Resets both values after adding stat

#### 4. handleAddStat() Function (line ~521)
- Updated signature to accept `label` and `fontSize` parameters
- Stores label and fontSize in the stat object when creating new stats

#### 5. Stats Restoration (line ~810)
- Restores saved `label` and `fontSize` from database
- Uses `s.label || ''` and `s.fontSize || 'base'` for backward compatibility

#### 6. Stats Card Rendering (line ~1472)
- Displays custom label (if provided) in larger, semibold text
- Falls back to aggregate type + question name if no label provided
- Applies font size scaling to both label and stat value
- Font size classes:
  - `sm`: text-sm (label) → text-sm (value)
  - `base`: text-base (label) → text-2xl (value)
  - `lg`: text-lg (label) → text-3xl (value)
  - `xl`: text-xl (label) → text-4xl (value)
  - `2xl`: text-2xl (label) → text-5xl (value)

#### 7. Modal UI (line ~3730)
- Added Label input field with placeholder example
- Added Font Size select dropdown with 5 options
- Helpful descriptions under each field

## Usage Workflow

### 1. Creating a Custom Stat
1. Click the settings gear icon on Interactive Stats card
2. Select **Aggregate Type** (e.g., COUNT DISTINCT)
3. Select **Question**
4. Add WHERE conditions if using COUNT
5. **NEW:** Enter a custom **Label** (optional)
   - Example: "Total Facility Teams"
   - Leave blank to use default display
6. **NEW:** Select **Label Font Size**
   - Choose from: Small, Base, Large, Extra Large, 2X Large
7. Click **Add Stat**

### 2. Viewing Results
- Custom label appears prominently in the stat card
- Font size applies to both label and the stat value
- WHERE conditions (if any) still display below the label
- Remove button (×) works as before

### 3. Persistence
- Label and font size are saved to `report.report_stats_config`
- Restored automatically when report page loads
- Survives page refreshes

## Backward Compatibility
- Existing stats without labels continue to work
- Default font size is 'base' for older stats
- UI gracefully handles missing label/fontSize properties
- Database migration not required (existing configs still load)

## Example JSON Structure

### Saved Config
```json
{
  "items": [
    {
      "statKey": "q-5-count_distinct",
      "questionId": "5",
      "aggregateType": "count_distinct",
      "conditions": [],
      "label": "Total Facility Teams",
      "fontSize": "xl"
    },
    {
      "statKey": "q-12-count-cond-filter",
      "questionId": "12",
      "aggregateType": "count",
      "conditions": [
        {
          "questionId": "8",
          "operator": "contains",
          "value": "Yes"
        }
      ],
      "label": "Positive Responses",
      "fontSize": "lg"
    },
    {
      "statKey": "q-3-sum",
      "questionId": "3",
      "aggregateType": "sum",
      "conditions": [],
      "label": "",
      "fontSize": "base"
    }
  ]
}
```

## Font Size Mapping

| Selection | Label Size | Value Size | Use Case |
|-----------|-----------|-----------|----------|
| Small | text-sm (12px) | text-sm (12px) | Space-constrained dashboards |
| Base | text-base (16px) | text-2xl (24px) | Default, balanced |
| Large | text-lg (18px) | text-3xl (30px) | Important metrics |
| Extra Large | text-xl (20px) | text-4xl (36px) | Key metrics |
| 2X Large | text-2xl (24px) | text-5xl (48px) | Highlighting main metric |

## Testing Checklist

- [ ] Open Interactive Stats Settings Modal
- [ ] Enter a custom label (e.g., "Total Teams")
- [ ] Select different font sizes and verify preview
- [ ] Create a stat with label and font size
- [ ] Verify custom label displays on stat card
- [ ] Verify font size applies to both label and value
- [ ] Remove label and re-add stat (should show default display)
- [ ] Save stats and reload page (should persist)
- [ ] Edit existing stat (can update label/fontSize)
- [ ] Test with WHERE conditions (should display below label)

## Notes
- Labels support all Unicode characters
- Very long labels are truncated with line-clamp-2
- Font size applies uniformly to label and value
- WHERE conditions always display at xs text size (unchanged)
- Remove button remains always visible in top right

## Future Enhancements
- Color customization for stat cards
- Label position (top/bottom)
- Value number formatting (decimals, thousands separator)
- Animation/transitions for stat value changes
