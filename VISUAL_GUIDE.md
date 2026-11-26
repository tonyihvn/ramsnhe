# Quick Visual Guide - Interactive Stats Enhancements

## 🎯 What Changed

### Before
```
ReportViewPage:
- Questions showed as "Question 123"
- No way to customize stat labels
- No font size control

ActivityDashboardPage:
- Same limitation for customization
```

### After
```
ReportViewPage & ActivityDashboardPage:
✅ Questions show with actual text
✅ Custom labels for each stat
✅ 5 font size options
✅ Dynamic display scaling
```

---

## 📱 User Interface Changes

### Interactive Stats Settings Modal

#### BEFORE:
```
┌─────────────────────────────────┐
│ Interactive Stats Settings      │
├─────────────────────────────────┤
│                                 │
│ Aggregate Type: [dropdown]      │
│ Select Question: [dropdown]     │
│                                 │
│ [WHERE clause section]          │
│                                 │
│          [Add Stat]             │
│                                 │
│          [Save Stats Config]    │
└─────────────────────────────────┘
```

#### AFTER:
```
┌─────────────────────────────────────────┐
│ Interactive Stats Settings              │
├─────────────────────────────────────────┤
│                                         │
│ Aggregate Type: [dropdown]              │
│ Select Question: [dropdown]             │
│ ├─ Are the facility team...             │
│ ├─ Is this a priority area?             │
│ └─ How many visits occurred?            │
│                                         │
│ [WHERE clause section]                  │
│                                         │
│ Label (Optional)                        │
│ [________________] ← NEW                │
│ Leave blank to show aggregate + question│
│                                         │
│ Label Font Size                         │
│ [Base (16px)]      ▼ ← NEW             │
│ Applies to both label and stat value    │
│                                         │
│          [Add Stat]  [Save Stats Config]│
└─────────────────────────────────────────┘
```

---

## 🎨 Stat Card Display Examples

### Example 1: Default Display (No Label)
```
┌────────────────────────────┐
│ COUNT DISTINCT             │
│ Are the facility team and  │
│ relevant service points    │
│ represented during MSV?    │
│                            │
│            42              │
└────────────────────────────┘
```

### Example 2: Custom Label - Base Font Size
```
┌────────────────────────────┐
│ Total Facility Teams       │
│                            │
│            42              │
└────────────────────────────┘
```

### Example 3: Custom Label - Extra Large Font
```
┌────────────────────────────┐
│ Total Facility Teams       │
│ (larger, bolder text)      │
│                            │
│            42              │
│        (even larger)       │
└────────────────────────────┘
```

### Example 4: Custom Label - 2X Large Font
```
┌────────────────────────────┐
│                            │
│ Total Facility Teams       │
│    (very large, bold)      │
│                            │
│          42                │
│      (huge number)         │
│                            │
└────────────────────────────┘
```

---

## 📊 Font Size Comparison

```
Label Size          Value Size          Use Case
─────────────────────────────────────────────────
Small (12px)        Small (12px)        Space-constrained
Base (16px)         2XL (24px)          Default, balanced
Large (18px)        3XL (30px)          Important metrics
Extra Large (20px)  4XL (36px)          Key metrics
2X Large (24px)     5XL (48px)          Highlight main metric
```

---

## 🔄 Workflow

### Creating a Stat with Custom Label

1️⃣ **Click Settings Gear** on Interactive Stats card
   ```
   ┌─────────────────────────────────────┐
   │  Interactive Stats           [⚙️]  ← Click here
   │  Configured statistics appear...    │
   └─────────────────────────────────────┘
   ```

2️⃣ **Configure Aggregate Type**
   ```
   Aggregate Type: [Count Distinct ▼]
   ```

3️⃣ **Select Question**
   ```
   Select Question: [Are the facility team... ▼]
   ```

4️⃣ **Add Custom Label** (Optional)
   ```
   Label: [Total Facility Teams________]
   ```

5️⃣ **Choose Font Size**
   ```
   Label Font Size: [Extra Large ▼]
   ```

6️⃣ **Click Add Stat**
   ```
   [Add Stat]  [Save Stats Config]
   ```

7️⃣ **Result Appears**
   ```
   ┌────────────────────────┐
   │ Total Facility Teams   │
   │        (20px bold)     │
   │                        │
   │          42            │
   │       (36px bold)      │
   └────────────────────────┘
   ```

8️⃣ **Save Configuration**
   ```
   [Save Stats Config]  ← Persists to database
   ```

---

## 💾 Data Saved to Database

### Without Custom Label
```json
{
  "statKey": "q-5-count_distinct",
  "questionId": "5",
  "aggregateType": "count_distinct",
  "conditions": [],
  "label": "",
  "fontSize": "base"
}
```

### With Custom Label
```json
{
  "statKey": "q-5-count_distinct",
  "questionId": "5",
  "aggregateType": "count_distinct",
  "conditions": [],
  "label": "Total Facility Teams",
  "fontSize": "xl"
}
```

---

## 🔧 Technical Details

### Questions Fetching
```
OLD: /api/questions?activityId=...
NEW: /api/activity_dashboard/{id}

Benefit: Consistent data structure with question_text field
```

### Font Size CSS Classes
```
sm   → text-sm (label) + text-sm (value)
base → text-base (label) + text-2xl (value)
lg   → text-lg (label) + text-3xl (value)
xl   → text-xl (label) + text-4xl (value)
2xl  → text-2xl (label) + text-5xl (value)
```

### Type Definition
```typescript
type InteractiveStatItem = {
  statKey: string;
  questionId: string;
  aggregateType: string;
  conditions: StatCondition[];
  label?: string;      // NEW - custom display text
  fontSize?: string;   // NEW - font size selector
};
```

---

## ✅ Backward Compatibility

```
Existing Stats
├─ Continue to work without labels
├─ Use default font size 'base'
├─ Show aggregate type + question name
└─ Database migration NOT needed

Updated Stats
├─ Support custom labels
├─ Support custom font sizes
├─ Show label if provided
└─ Fall back to default if not
```

---

## 🎯 Key Benefits

✨ **Better Readability**
   - Custom labels make stats self-explanatory
   - No need to read long question text

📏 **Flexible Sizing**
   - Emphasize key metrics with larger fonts
   - Compact display with small fonts

🎨 **Professional Dashboard**
   - Consistent look with other UI elements
   - Clear visual hierarchy

🔄 **Persistent Configuration**
   - Settings saved to database
   - Restored on page load

🚀 **Backward Compatible**
   - Old stats still work
   - No data loss or migration needed

---

## 📋 Checklist for Testing

- [ ] Questions display correctly in modals (not "Question {id}")
- [ ] Can enter custom label text
- [ ] Font size dropdown has 5 options
- [ ] Stats card shows custom label when added
- [ ] Font sizes apply correctly to both label and value
- [ ] Very long labels are truncated appropriately
- [ ] Configuration saves after clicking "Save Stats Config"
- [ ] Labels persist after page reload
- [ ] Font sizes persist after page reload
- [ ] Default display works when label is empty
- [ ] WHERE conditions display below custom label
- [ ] Remove button (×) still works with custom labels
- [ ] Multiple stats with different labels/sizes work together
- [ ] Works on both ReportViewPage and ActivityDashboardPage

---

## 🆘 Troubleshooting

### Questions Still Show as "Question {id}"
```
CHECK: Browser console for error messages
FIX:   Verify API returns /api/activity_dashboard/{id} data
```

### Custom Label Not Displaying
```
CHECK: Label field has text (not empty)
FIX:   Save configuration and reload page
```

### Font Size Not Applied
```
CHECK: Font size was selected before adding stat
FIX:   Try different size, save, and reload
```

### WHERE Conditions Hidden
```
CHECK: Conditions should appear below custom label
FIX:   Ensure WHERE section was filled (for COUNT aggregate)
```

---

## 📞 Support

For questions or issues:
1. Check browser console for error messages
2. Verify data in Network tab (API responses)
3. Reload page and try again
4. Check Database: `report_stats_config` / `activity.dashboard_stats_config`
