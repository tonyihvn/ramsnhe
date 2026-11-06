# Form Builder Features Guide

## New Features in Activity Form Builder

### Feature 1: Default Values for Text Input Fields

#### Location
Form Builder → Question Configuration → "Default Value" section (appears below "Visibility Condition")

#### When Available
- TEXT input fields
- TEXTAREA fields  
- NUMBER input fields

#### How to Use
1. Go to `.../activities/build/{activity_id}`
2. Add or edit a TEXT/TEXTAREA/NUMBER question
3. Scroll down to the "Default Value" section
4. Enter the value that should appear by default when a user opens the form

#### Example Use Cases
- Pre-populate an organization name that's typically the same
- Set a default quantity that users often accept
- Provide example text in descriptions

#### Form Behavior
- When a user opens the form, the field displays the default value
- User can override the default value by entering their own text
- If user clears the field, it remains empty (not restored to default)

---

### Feature 2: Default/Selected Values for Dropdown/Radio Fields

#### Location
Form Builder → Question Configuration → "Default/Selected Value" section (appears for DROPDOWN and RADIO types)

#### When Available
- DROPDOWN fields (with at least one option defined)
- RADIO button fields (with at least one option defined)

#### How to Use
1. Go to `.../activities/build/{activity_id}`
2. Add or edit a DROPDOWN or RADIO question with at least one option
3. Scroll down to the "Default/Selected Value" section
4. From the dropdown, select which option should be pre-selected
5. "-- No default selection --" means no option is selected by default

#### Example Use Cases
- Pre-select the most common answer
- Set a required status field to "Pending" by default
- Pre-check the most likely region/facility

#### Form Behavior
- When a user opens the form, the selected option appears checked/selected
- User can change the selection by clicking a different option
- For radio buttons, exactly one option is always selected (if default is set)
- For dropdowns, the default option appears in the dropdown

---

### Feature 3: Read-Only Fields

#### Location
Form Builder → Question Configuration → "Make this field read-only" checkbox (appears at the bottom of field settings)

#### When Available
- ALL field types
- TEXT, TEXTAREA, NUMBER, DATE, TIME
- DROPDOWN, RADIO, CHECKBOX
- FILE, LOCATION, COMPUTED, PARAGRAPH

#### How to Use
1. Go to `.../activities/build/{activity_id}`
2. Add or edit any question
3. Scroll down to find the "Make this field read-only" checkbox
4. Check the box to make the field read-only
5. Save the form

#### Example Use Cases
- Display pre-calculated values that shouldn't change
- Show reference information that's for reference only
- Lock fields that should be filled by the system, not by users
- Display audit information that needs to be seen but not modified

#### Form Behavior
- Field displays the value but appears disabled/greyed out
- User cannot interact with read-only fields
- Read-only fields still submit their data with the form
- Works in combination with default values:
  - Read-only text field with default value = displays default and user can't change it
  - Read-only dropdown with selected value = shows pre-selected option and user can't change it

---

## Combined Feature Examples

### Example 1: Pre-filled Read-Only Field
**Scenario**: Display the current date that was automatically determined

**Configuration**:
- Question Type: DATE
- Default Value: [current date calculated by system]
- Read-Only: ✓ Checked

**Result**: User sees the date but cannot edit it

---

### Example 2: Most-Common Option Pre-Selected but Changeable
**Scenario**: Most facilities are in the "Active" status, but some are inactive

**Configuration**:
- Question Type: DROPDOWN
- Options: Active, Inactive, Suspended
- Default/Selected Value: Active
- Read-Only: ☐ Unchecked

**Result**: "Active" appears selected, but user can change it if needed

---

### Example 3: Locked Pre-set Value
**Scenario**: Set a field to a specific value that must not change

**Configuration**:
- Question Type: DROPDOWN
- Options: Level 1, Level 2, Level 3
- Default/Selected Value: Level 2
- Read-Only: ✓ Checked

**Result**: "Level 2" appears but cannot be changed by user

---

### Example 4: Pre-filled Editable Text Field
**Scenario**: Suggest a facility name based on previous entry

**Configuration**:
- Question Type: TEXT
- Default Value: "Main Hospital"
- Read-Only: ☐ Unchecked

**Result**: "Main Hospital" appears pre-filled, but user can clear and type a different name

---

## Technical Notes

### Data Storage
- Default values are stored in `question.metadata.defaultValue`
- Selected values are stored in `question.metadata.selectedValue`
- Read-only status is stored in `question.metadata.isReadOnly`

### API Integration
- When forms are submitted, all values (including read-only field values) are included in the submission
- Default/selected values are applied only when user has not entered data
- Once user makes a change, the default/selected value is no longer applied

### Visibility Rules
- Default value controls appear/hide based on field type
- Read-only toggle is available for all field types
- Selecting value control appears when options are defined

---

## UI Screenshots (Text Descriptions)

### Form Builder - Text Field with Default Value
```
┌─────────────────────────────────┐
│ Default Value                   │
│ This value will be pre-filled... │
│ [_____________________]         │
│  "Enter default value"          │
└─────────────────────────────────┘
```

### Form Builder - Dropdown with Selected Value
```
┌─────────────────────────────────┐
│ Default/Selected Value          │
│ Select the option that should...│
│ ▼ [-- No default selection --] │
│   ├─ Option 1                   │
│   ├─ Option 2                   │
│   └─ Option 3                   │
└─────────────────────────────────┘
```

### Form Builder - Read-Only Toggle
```
┌─────────────────────────────────┐
│ ☑ Make this field read-only     │
│                                 │
│ Read-only fields display data   │
│ but cannot be edited by form    │
│ users                           │
└─────────────────────────────────┘
```

### Form Filling - Text with Default Value
```
Organization Name*
[Default Organization ____________]
```

### Form Filling - Read-Only Dropdown
```
Status*
[Pending ▼] (appears greyed out, cannot click)
```

---

## Troubleshooting

### Default value doesn't appear in form
- Ensure the field type is TEXT, TEXTAREA, or NUMBER
- Check that a value is entered in the "Default Value" field in form builder
- Verify the question is saved in the form definition

### Selected value doesn't appear in dropdown
- Ensure at least one option is defined for the field
- Check that the selected value matches one of the option values exactly
- The "Default/Selected Value" dropdown should show the option you want selected

### Read-only field still appears editable
- Verify the "Make this field read-only" checkbox is checked
- Try refreshing the form page
- Check browser console for any JavaScript errors

### Read-only field shows but data doesn't submit
- Read-only fields should still submit their data automatically
- Verify that the form submission is reaching the server
- Check that no validation rules are preventing submission

---

## Version Information
- Feature introduced: Current version
- Supported field types: All form field types
- Browser compatibility: All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile: Fully supported on mobile browsers

---

## Feature Limitations
- Default values cannot reference other fields (use computed fields for that)
- Selected values for checkboxes are not supported (checkboxes handle multiple selections)
- Read-only fields still display but cannot be edited via UI (API-based changes still work)
- Default/selected values are not applied retroactively to existing form submissions
