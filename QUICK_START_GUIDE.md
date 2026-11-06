# Quick Start Guide - Form Builder Enhancements

## 🚀 In 60 Seconds

Three new features added to the form builder. Here's how to use them:

### Feature 1: Default Values (TEXT/TEXTAREA)
**Where to find it**: Form Builder → Edit Question → "Default Value" section

**Steps**:
1. Add a TEXT or TEXTAREA question
2. Scroll to "Default Value" section
3. Enter the value you want pre-filled
4. Save

**Result**: When users open the form, they see your default text

---

### Feature 2: Selected Values (DROPDOWN/RADIO)
**Where to find it**: Form Builder → Edit Question → "Default/Selected Value" section

**Steps**:
1. Add a DROPDOWN or RADIO question with options
2. Scroll to "Default/Selected Value" section
3. Choose which option should be pre-selected
4. Save

**Result**: When users open the form, that option is already selected

---

### Feature 3: Read-Only Fields (ALL TYPES)
**Where to find it**: Form Builder → Edit Question → "Make this field read-only" checkbox

**Steps**:
1. Edit any question
2. Find checkbox: "Make this field read-only"
3. Check the box
4. Save

**Result**: When users open the form, that field appears greyed out and cannot be edited

---

## 📸 Visual Guide

### Default Value Control
```
┌─────────────────────────────────┐
│ Default Value                   │
│ This value will be pre-filled... │
│ ┌───────────────────────────┐  │
│ │ [Enter default value...]  │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Selected Value Control
```
┌─────────────────────────────────┐
│ Default/Selected Value          │
│ Select the option that should...│
│ ┌───────────────────────────┐  │
│ │ ▼ -- No default select -- │  │
│ │ ├─ Option 1              │  │
│ │ ├─ Option 2              │  │
│ │ └─ Option 3              │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Read-Only Toggle
```
┌─────────────────────────────────┐
│ ☑ Make this field read-only     │
│ Read-only fields display data   │
│ but cannot be edited            │
└─────────────────────────────────┘
```

---

## 💡 Common Use Cases

### Use Case 1: Speed Up Data Entry
**Problem**: Users always fill "Status" with "Active"
**Solution**: Use Selected Value feature
- Set DROPDOWN "Status" with "Active" pre-selected
- Users see it's already selected
- They only change if needed

### Use Case 2: Show Reference Information
**Problem**: Need to display reference ID that users can see
**Solution**: Use Read-Only feature
- Set TEXT field with reference number
- Check "Make this field read-only"
- Users see it but can't change it

### Use Case 3: Suggest Common Answer
**Problem**: Most facilities type the same organization name
**Solution**: Use Default Value feature
- Set TEXT field with organization name as default
- Users see it pre-filled
- They can change if different facility

---

## ✅ What Each Feature Does

### Default Value
| Aspect | Behavior |
|--------|----------|
| When | When form loads |
| What | Shows value in field |
| User Can | Change it to something else |
| If Changed | New value submits, not default |
| Works With | TEXT, TEXTAREA, NUMBER |

### Selected Value
| Aspect | Behavior |
|--------|----------|
| When | When form loads |
| What | That option appears selected |
| User Can | Click different option |
| If Changed | New choice submits, not default |
| Works With | DROPDOWN, RADIO |

### Read-Only
| Aspect | Behavior |
|--------|----------|
| When | Form loads and always |
| What | Field appears greyed out |
| User Can | See value but cannot edit |
| If Submitted | Value still submits |
| Works With | ALL field types |

---

## 🔍 Quick Troubleshooting

**Q: Default value doesn't appear?**
A: Make sure field type is TEXT, TEXTAREA, or NUMBER

**Q: Can't see selected value option?**
A: Field must be DROPDOWN or RADIO and have at least one option defined

**Q: Read-only field still editable?**
A: Refresh page and try again. Check checkbox is checked.

**Q: Values not submitting?**
A: All values submit automatically. Check form validation.

---

## 🎬 Try It Now

### Create a Demo Form (5 minutes)

1. **Go to Form Builder**
   - Navigate to Activities → Build Activity Form

2. **Add a TEXT field with default**
   - Label: "Organization Name"
   - Default Value: "Main Hospital"
   - Save

3. **Add a DROPDOWN with selected value**
   - Label: "Status"
   - Options: Pending, Active, Completed
   - Selected Value: Active
   - Save

4. **Add a read-only field**
   - Label: "Reference ID"
   - Default Value: "REF-12345"
   - Check: Make this field read-only
   - Save

5. **Open the form**
   - You should see:
     - "Main Hospital" pre-filled (can change)
     - "Active" pre-selected (can change)
     - "REF-12345" displayed but greyed out (cannot change)

---

## 📋 Feature Checklist

- [x] Default values for text fields
- [x] Default values for textarea fields
- [x] Selected values for dropdowns
- [x] Selected values for radio buttons
- [x] Read-only toggle for all field types
- [x] Works in form builder
- [x] Works in form filling
- [x] Backward compatible
- [x] No data loss
- [x] Ready to use

---

## 🆘 Need Help?

### For More Details
- See **FORM_BUILDER_FEATURES_GUIDE.md** for comprehensive guide
- See **FEATURE_SUMMARY.md** for complete overview

### For Developers
- See **IMPLEMENTATION_SUMMARY.md** for technical details
- See **DEPLOYMENT_CHECKLIST.md** for testing procedures

### For Troubleshooting
- Check browser console for errors
- Try in different browser
- Clear browser cache and refresh

---

## 📞 Support

- Check documentation in repo
- Review examples provided
- Contact development team if needed

---

**Ready to use!** Start creating smarter forms today! ✨
