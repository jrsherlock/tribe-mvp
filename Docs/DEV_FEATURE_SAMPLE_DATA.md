# Development Feature: Sample Data Auto-Fill

## Overview
Added a development-only feature to the Daily Check-in page (`/checkin`) that allows quick population of form fields with realistic sample data for testing purposes.

## Implementation Details

### Location
- **Component**: `src/components/DailyCheckin.tsx`
- **Route**: `http://localhost:5173/checkin`

### Features Added

#### 1. Sample Data Pools
Created comprehensive sample data pools for each MEPSS dimension and gratitude:

- **Mental**: 5 sample entries focused on clarity, focus, cognitive recovery
- **Emotional**: 5 sample entries about emotional regulation, processing feelings
- **Physical**: 5 sample entries covering energy, sleep, exercise, physical healing
- **Social**: 5 sample entries about community, relationships, connection
- **Spiritual**: 5 sample entries on purpose, meaning, spiritual practice
- **Gratitude**: 15 sample gratitude items related to recovery journey

All sample text is:
- Contextually appropriate for addiction recovery check-ins
- 2-3 sentences in length
- References sobriety, recovery journey, wellness, support systems
- Realistic and therapeutic in tone

#### 2. UI Controls

**MEPSS Notes Sections** (Mental, Emotional, Physical, Social, Spiritual):
- Small purple button with wand icon (🪄) positioned to the right of each textarea
- Hover effect: icon rotates slightly
- Tooltip: "DEV: Fill with sample data"
- Clicking fills the textarea with a randomly selected sample from that dimension's pool

**Gratitude Section**:
- Larger "Fill Sample" button with wand icon in the section header
- Positioned to the right of the "Gratitude" heading
- Clicking adds 2-3 random gratitude items to the list
- Items are appended to existing gratitude entries (doesn't replace)

#### 3. Visual Design
- **Color**: Purple theme (`bg-purple-100`, `text-purple-700`, `border-purple-300`)
- **Purpose**: Clearly distinguishable as a development feature
- **Placement**: Non-intrusive, doesn't interfere with normal check-in flow
- **Icon**: Wand2 from lucide-react (magic wand) to indicate "auto-fill"

### Code Structure

```typescript
// Sample data pools
const sampleData = {
  mental: [...],
  emotional: [...],
  physical: [...],
  social: [...],
  spiritual: [...],
  gratitude: [...]
};

// Fill function
const fillSampleData = (category: string) => {
  if (category === 'gratitude') {
    // Add 2-3 random items
  } else {
    // Fill notes with random sample
  }
};
```

### Usage

1. Navigate to `/checkin` page
2. For any MEPSS dimension:
   - Click the purple wand button next to the notes textarea
   - The field will populate with a random sample text
   - Click again to get a different random sample (replaces previous)

3. For gratitude:
   - Click "Fill Sample" button in the gratitude section header
   - 2-3 random gratitude items will be added to your list
   - Click again to add more items (appends, doesn't replace)

### Production Considerations

**To remove/hide for production:**

Option 1 - Environment Variable:
```typescript
const isDev = import.meta.env.DEV;

{isDev && (
  <button onClick={() => fillSampleData(category.key)}>
    <Wand2 size={16} />
  </button>
)}
```

Option 2 - Feature Flag:
```typescript
const ENABLE_DEV_FEATURES = false; // Set to false for production
```

Option 3 - Remove entirely:
- Delete the `sampleData` object
- Delete the `fillSampleData` function
- Remove all buttons with `fillSampleData` onClick handlers

### Benefits

1. **Faster Testing**: No need to manually type realistic check-in data
2. **Consistent Test Data**: Standardized samples ensure consistent testing
3. **Realistic Content**: Sample data reflects actual recovery check-in language
4. **Time Savings**: Reduces manual testing time significantly
5. **Easy to Remove**: Clear visual indicator and isolated code make it easy to remove for production

### Sample Data Examples

**Mental**:
> "Feeling clear-headed today after a good night's sleep. My focus has improved significantly since I started my recovery journey. Still working on managing racing thoughts in the evening."

**Emotional**:
> "Feeling more emotionally stable than last week. Had a moment of sadness but was able to sit with it without turning to old habits. Progress, not perfection."

**Physical**:
> "Energy levels are improving steadily. Went for a 30-minute walk and felt great afterward. My body is healing and I can feel the difference."

**Social**:
> "Attended my recovery group meeting and felt truly connected. Shared my story and received so much support. Community is essential to my healing."

**Spiritual**:
> "Spent time in meditation this morning and felt a deep sense of peace. My spiritual practice is becoming the foundation of my recovery."

**Gratitude**:
- "My sobriety and the clarity it brings"
- "My sponsor who answers the phone at any hour"
- "The support of my recovery community"

## Testing

To test the feature:
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:5173/checkin`
3. Click the purple wand buttons to populate fields
4. Verify random selection works (click multiple times)
5. Submit the form to ensure data saves correctly

## Notes

- This is a **development-only** feature
- Sample data is randomized on each click
- Gratitude items are appended (not replaced)
- MEPSS notes are replaced with new random sample on each click
- All sample text respects field validation and character limits

