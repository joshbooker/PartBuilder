# Technical Documentation: Part Number Generator

## Overview

This document details the implementation of the interactive part number configurator, including JSON data structure handling, part number generation rules, attribute sequencing, and inclusion/exclusion logic.

---

## JSON Data Structure

### Hierarchy

```
MasterClass[]
└── SubClass[]
    └── Attribute[]
        └── Options[]
```

### MasterClass Object
```json
{
  "MasterClassCode": "string",
  "MasterClassDescription": "string",
  "SubClass": []
}
```

### SubClass Object
```json
{
  "SubClassCode": "string",
  "SubClassDescription": "string",
  "Attribute": []
}
```

### Attribute Object
```json
{
  "AttributeID": "string",
  "Code": "string",
  "Description": "string",
  "PartPosition": number,
  "DescPosition": number,
  "Indent": number,
  "ControlType": "DD" | "other",
  "Required": "Y" | "N",
  "DefaultCode": "string",
  "Options": []
}
```

### Option Object
```json
{
  "Code": "string",
  "Description": "string",
  "ExcludeAttributeID": "string",
  "ExcludeCode": "string",
  "ExcludeIndicator": "1" | "2",
  "RangeIndicator": "0" | "1",
  "RangeMin": "string",
  "RangeMax": "string"
}
```

---

## Part Number (PartNum) Generation

### Concatenation Sequence

The part number is built by concatenating attribute codes in the following order:

1. **Master Class Code** (CCode)
2. **Metallurgy Code** (always 2nd position)
3. **All other attributes** (sorted by PartPosition)
4. **Sub Class Code** (SCode) - only if both CCode and SCode exist

### Special Rules

#### Metallurgy Positioning
- **AttributeID**: "METALLURGY"
- **Position**: Always 2nd in part number
- **Logic**: Extracted from attribute list and inserted after Master Class Code
- **Implementation**:
  ```javascript
  const metallurgy = selections.find(s => s.attrId === 'METALLURGY');
  if (metallurgy && metallurgy.code) {
    codes.push(metallurgy.code);
  }
  ```

#### CCode/SCode Logic
- **CCode** (Master Class Code): Always first
- **SCode** (Sub Class Code): Appended at end only if both CCode and SCode exist
- **Implementation**:
  ```javascript
  let pnum = CCode;
  // ... add other codes ...
  if (CCode && SCode) {
    pnum += SCode;
  }
  ```

#### Code Ordering
- Attributes sorted by `PartPosition` property
- Empty codes are skipped (not concatenated)
- Codes concatenated directly with no delimiter: `CODE1CODE2CODE3`

### Example

```
Master Class: PP (Pipe)
Metallurgy: 625 (Inconel 625)
Sub Class: 042 (Schedule 40)
Diameter: 1200 (12.00")

Result: PP6250421200
```

---

## Description (Desc) Generation

### Concatenation Sequence

The description is built by concatenating attribute descriptions in the following order:

1. **Master Class Description** (CDesc)
2. **Sub Class Description** (SDesc)
3. **All other attributes** (sorted by DescPosition)
4. **Metallurgy Description** (always last)

### Special Rules

#### Metallurgy Positioning
- **Position**: Always last in description
- **Logic**: Extracted from attribute list and appended at end
- **Implementation**:
  ```javascript
  const metallurgy = selections.find(s => s.attrId === 'METALLURGY');
  // ... add other descriptions ...
  if (metallurgy && metallurgy.desc) {
    descs.push(metallurgy.desc);
  }
  ```

#### Blank Description Filtering
- Empty or whitespace-only descriptions are automatically skipped
- **Implementation**:
  ```javascript
  .filter(d => d && d.trim() !== '')
  ```

#### Description Ordering
- Attributes sorted by `DescPosition` property
- Descriptions joined with comma delimiter: `DESC1, DESC2, DESC3`

### Example

```
Master Class Desc: "PIPE"
Sub Class Desc: "SCH 40"
Diameter Desc: "12.00 OD"
Metallurgy Desc: "INCONEL 625"

Result: "PIPE, SCH 40, 12.00 OD, INCONEL 625"
```

---

## Attribute Sequencing

### Display Order

Attributes are displayed in the UI based on their natural JSON order, with special handling for:

1. **Master Class Dropdown**: Always first
2. **Sub Class Dropdown**: Always second
3. **Metallurgy Dropdown**: Always third
4. **Remaining Attributes**: Displayed in JSON order

### Implementation

```javascript
function renderAttributeDropdowns(subclass) {
  // Separate metallurgy from other attributes
  const metallurgyAttr = attrs.find(a => a.AttributeID === 'METALLURGY');
  const otherAttrs = attrs.filter(a => a.AttributeID !== 'METALLURGY');
  
  // Render in sequence: Metallurgy first, then others
  if (metallurgyAttr) renderDropdown(metallurgyAttr);
  otherAttrs.forEach(attr => renderDropdown(attr));
}
```

### Position Properties

- **PartPosition**: Determines order in part number concatenation
- **DescPosition**: Determines order in description concatenation
- **Note**: Display order is independent of these position values

---

## Inclusion/Exclusion Logic

### Overview

Options can be dynamically excluded based on the values of other selected attributes. This is controlled by four option properties:

1. `ExcludeAttributeID` - Which attribute to check
2. `ExcludeCode` - Which code value triggers the rule
3. `ExcludeIndicator` - Type of exclusion (1=whitelist, 2=blacklist)
4. `RangeIndicator` - Whether to use range comparison (0=exact, 1=range)

### Exclusion Indicators

#### ExcludeIndicator="2" (Blacklist)
- **Meaning**: "Exclude this option IF the specified attribute has the specified code"
- **Logic**: Option is **hidden** when condition matches
- **Example**:
  ```json
  {
    "Code": "040",
    "ExcludeAttributeID": "OD",
    "ExcludeCode": "0400",
    "ExcludeIndicator": "2"
  }
  ```
  Translation: "Hide Schedule 040 if OD is 0400"

#### ExcludeIndicator="1" (Whitelist)
- **Meaning**: "Only show this option IF the specified attribute has the specified code"
- **Logic**: Option is **shown** only when condition matches
- **Note**: Not commonly used in current implementation

### Range Indicator

#### RangeIndicator="1" (Range Whitelist)
- **Meaning**: "Only show this option IF the specified attribute's code falls within RangeMin to RangeMax"
- **Properties Required**:
  - `RangeMin`: Minimum code value (inclusive)
  - `RangeMax`: Maximum code value (inclusive)
- **Comparison Type**: String comparison (supports zero-padded codes)
- **Example**:
  ```json
  {
    "Code": "040",
    "ExcludeAttributeID": "OD",
    "RangeIndicator": "1",
    "RangeMin": "1200",
    "RangeMax": "9999"
  }
  ```
  Translation: "Only show Schedule 040 if OD is between 1200 and 9999"

#### RangeIndicator="0" (No Range)
- **Meaning**: Use exact code matching
- **Logic**: Standard ExcludeCode comparison

### Implementation

```javascript
function isOptionExcluded(option, attributeID) {
  if (!option.ExcludeAttributeID) return false;
  
  const targetAttr = option.ExcludeAttributeID;
  const targetValue = getSelectedCode(targetAttr);
  
  // If no value selected for target attribute, don't exclude
  if (!targetValue) return false;
  
  // Handle range-based exclusion
  if (option.RangeIndicator === '1' && option.RangeMin && option.RangeMax) {
    const isInRange = (targetValue >= option.RangeMin && targetValue <= option.RangeMax);
    return !isInRange; // Exclude if NOT in range (whitelist)
  }
  
  // Handle exact match exclusion
  const matchesExcludeCode = (targetValue === option.ExcludeCode);
  
  if (option.ExcludeIndicator === '2') {
    return matchesExcludeCode; // Blacklist: exclude if matches
  } else if (option.ExcludeIndicator === '1') {
    return !matchesExcludeCode; // Whitelist: exclude if doesn't match
  }
  
  return false;
}
```

### String Comparison for Zero-Padded Codes

All codes are compared as strings, which correctly handles zero-padded numeric codes:

```javascript
"0400" < "1200" < "9999"  // ✓ Correct ordering
```

This avoids issues with numeric conversion:
```javascript
parseFloat("0400") // 400 (loses leading zero)
"0400" // "0400" (preserves format)
```

---

## Real-Time Refresh Mechanism

### Trigger

Exclusion logic is re-evaluated **on every attribute change** to ensure the options panel always reflects current exclusions.

### Implementation

```javascript
function onAttributeChange(attributeID) {
  // Update selection
  updateSelection(attributeID);
  
  // Refresh part number/description
  showPartNumber();
  
  // Re-render options panel with updated exclusions
  refreshCurrentOptionsPanel();
}
```

### refreshCurrentOptionsPanel()

This function re-renders the currently visible options table whenever selections change:

```javascript
function refreshCurrentOptionsPanel() {
  const panelDiv = document.getElementById('optionsPanelContainer');
  if (!panelDiv || !currentOptionsPanel.attributeID) return;
  
  // Find the attribute
  const attr = findAttributeByID(currentOptionsPanel.attributeID);
  if (!attr) return;
  
  // Re-render with fresh exclusion calculations
  renderOptionsPanel(attr);
}
```

### Visual Feedback

Excluded options are styled with:
- **Strikethrough text**: `text-decoration: line-through`
- **Gray color**: `color: #999`
- **Disabled state**: Not selectable

```css
.excluded-row {
  text-decoration: line-through;
  color: #999;
  cursor: not-allowed;
}
```

---

## Complete Flow Example

### Scenario
User selects:
1. Master Class: PP (Pipe)
2. Sub Class: 042 (Schedule 40)
3. Metallurgy: 625 (Inconel 625)
4. OD: 1200 (12.00")

### Processing

#### Step 1: Attribute Selection
```javascript
selections = [
  { attrId: 'MASTER', code: 'PP', desc: 'PIPE' },
  { attrId: 'SUB', code: '042', desc: 'SCH 40' },
  { attrId: 'METALLURGY', code: '625', desc: 'INCONEL 625' },
  { attrId: 'OD', code: '1200', desc: '12.00 OD' }
]
```

#### Step 2: Part Number Generation
```javascript
// CCode first
pnum = "PP"

// Metallurgy second
pnum += "625"

// Other attributes by PartPosition
pnum += "0421200"

// SCode at end (if both exist)
// In this case, SCode is "042" which is already included above

Result: "PP6250421200"
```

#### Step 3: Description Generation
```javascript
// CDesc first
desc = "PIPE"

// SDesc
desc += ", SCH 40"

// Other attributes by DescPosition (excluding Metallurgy)
desc += ", 12.00 OD"

// Metallurgy last
desc += ", INCONEL 625"

Result: "PIPE, SCH 40, 12.00 OD, INCONEL 625"
```

#### Step 4: Exclusion Check (for next attribute)

When rendering Schedule dropdown options:
```javascript
// Option with range exclusion
{
  "Code": "160",
  "ExcludeAttributeID": "OD",
  "RangeIndicator": "1",
  "RangeMin": "0400",
  "RangeMax": "1000"
}

// Check: Is OD=1200 in range [0400, 1000]?
isInRange = ("1200" >= "0400" && "1200" <= "1000")
isInRange = false

// Exclude this option (show only if in range)
isExcluded = !isInRange = true

// Result: Schedule 160 is grayed out and strikethrough
```

---

## Key Design Decisions

### 1. String vs Numeric Comparison
- **Decision**: Use string comparison for all code values
- **Reason**: Preserves zero-padding (e.g., "0400" stays "0400")
- **Impact**: Range comparisons work correctly with zero-padded codes

### 2. Metallurgy Special Handling
- **Decision**: Hardcode Metallurgy position (2nd in PNum, last in Desc)
- **Reason**: Business rule requirement
- **Impact**: Cannot be changed via JSON configuration

### 3. Real-Time Exclusion Refresh
- **Decision**: Re-render options panel on every selection change
- **Reason**: User needs immediate visual feedback
- **Impact**: Slight performance overhead, but negligible for typical data sizes

### 4. CCode/SCode Append Logic
- **Decision**: Only append SCode if both CCode and SCode exist
- **Reason**: Prevents orphan SCode in part number
- **Impact**: Part numbers always start with CCode

### 5. Blank Description Filtering
- **Decision**: Automatically filter empty descriptions
- **Reason**: Cleaner output, avoids extra spaces
- **Impact**: No manual cleanup needed in JSON data

---

## Error Handling

### Missing Required Attributes
- Required attributes (`Required="Y"`) are indicated with red asterisk
- No validation prevents submission (user can generate incomplete part numbers)

### Invalid JSON
- File picker validates JSON.parse() success
- Displays error message if parsing fails
- Preserves existing data on error

### Missing Exclusion Targets
- If `ExcludeAttributeID` references non-existent attribute, option is not excluded
- No error thrown, graceful degradation

### Empty Options Array
- Dropdown shows "No options available" message
- User cannot select value, but can proceed with other attributes

---

## Performance Considerations

### Data Loading
- Single fetch on page load: `fetch('attributes.json')`
- File picker allows runtime data replacement
- No server-side processing required

### Exclusion Calculation
- Runs on every selection change
- O(n) complexity where n = number of options
- Typical performance: <10ms for ~100 options

### DOM Updates
- Full options panel re-render on each change
- Acceptable for <50 options per attribute
- Could be optimized with virtual DOM if needed

---

## Future Enhancements

### Potential Improvements
1. **Validation**: Enforce required attribute selection before generating part number
2. **Export**: Add button to copy/export generated part number
3. **History**: Track recently generated part numbers
4. **Search**: Filter options by code or description
5. **Mobile**: Enhanced touch-friendly UI for mobile devices
6. **Accessibility**: ARIA labels and keyboard navigation
7. **Performance**: Implement virtual scrolling for large option lists

---

## Version History

- **v1.0** - Initial implementation with embedded data
- **v1.1** - Added Epicor Kinetic styling
- **v1.2** - Fixed numeric range comparison bug (string comparison)
- **v1.3** - Added real-time exclusion refresh
- **v2.0** - Modular architecture for GitHub Pages deployment

---

## References

### Related Files
- [index.html](index.html) - Main UI structure
- [app.js](app.js) - Complete implementation
- [styles.css](styles.css) - Styling and layout
- [README.md](README.md) - Setup instructions

### Key Functions
- `initHorizontalBuilder()` - Entry point
- `renderAttributeDropdowns()` - Attribute UI rendering
- `onAttributeChange()` - Selection handler with refresh
- `showPartNumber()` - PNum/Desc generation
- `isOptionExcluded()` - Exclusion logic
- `refreshCurrentOptionsPanel()` - Real-time UI update

---

*Last Updated: January 16, 2026*
