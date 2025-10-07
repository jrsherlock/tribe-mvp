# Tribe Community Hub - Integration Guide

## Quick Start

### 1. Run the Database Migration

First, apply the migration to your Supabase dev project:

```bash
# Navigate to your project root
cd /path/to/your/project

# Apply the migration using Supabase CLI
supabase db push

# OR manually run the SQL file in Supabase Dashboard
# Go to SQL Editor and paste the contents of:
# supabase/migrations/20250107000001_tribe_community_hub_schema.sql
```

### 2. Add Navigation Link

Add a link to the Tribe page from your GroupsManager component. Here's where to add it:

**In `src/components/GroupsManager.tsx`:**

Find the group card rendering section and add a "View Tribe" button:

```tsx
// Inside the group card, add this button:
<button
  onClick={() => navigate(`/tribe/${group.id}`)}
  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-600 text-white rounded-xl font-medium transition-colors"
>
  <Users className="w-4 h-4" />
  View Tribe
</button>
```

### 3. Test the Feature

1. **Navigate to Groups**: Go to `/groups` in your app
2. **Select a Group**: Click "View Tribe" on any group you're a member of
3. **Test Each Tab**:
   - **Profile**: View and edit group details (if admin)
   - **Members**: View members, search, manage roles (if admin)
   - **Events**: Create events, RSVP, download calendar files
   - **Photos**: Create albums, upload photos, view in lightbox

### 4. Verify Permissions

Test role-based access control:

- **As a Member**:
  - Can view all tabs
  - Can RSVP to events
  - Can upload photos
  - Can delete own photos
  - Cannot edit group details
  - Cannot manage members
  - Cannot create/delete events
  - Cannot delete others' photos

- **As an Admin**:
  - All member permissions PLUS:
  - Can edit group details
  - Can manage member roles
  - Can remove members
  - Can create/delete events
  - Can delete any photo
  - Can delete albums

- **As a Non-Member**:
  - Cannot access the tribe page at all
  - Redirected to groups list with error message

---

## Common Integration Points

### Adding Tribe Link to Navigation

If you have a main navigation component, add:

```tsx
import { Users } from 'lucide-react'

// In your navigation links:
<Link 
  to={`/tribe/${currentGroupId}`}
  className="nav-link"
>
  <Users className="w-5 h-5" />
  My Tribe
</Link>
```

### Showing Tribe in Group Cards

In your group list/grid, add a quick action:

```tsx
<div className="group-card">
  <h3>{group.name}</h3>
  <p>{group.description}</p>
  
  <div className="actions">
    <button onClick={() => navigate(`/tribe/${group.id}`)}>
      View Community
    </button>
  </div>
</div>
```

### Dashboard Widget

Create a "Upcoming Events" widget for your dashboard:

```tsx
import { getUpcomingEvents } from '../lib/services/events'

function UpcomingEventsWidget({ groupId }) {
  const [events, setEvents] = useState([])
  
  useEffect(() => {
    async function fetchEvents() {
      const { data } = await getUpcomingEvents(groupId)
      setEvents(data?.slice(0, 3) || []) // Show top 3
    }
    fetchEvents()
  }, [groupId])
  
  return (
    <div className="widget">
      <h3>Upcoming Events</h3>
      {events.map(event => (
        <div key={event.id}>
          <p>{event.title}</p>
          <p>{format(new Date(event.start_time), 'MMM d, h:mm a')}</p>
        </div>
      ))}
      <Link to={`/tribe/${groupId}?tab=events`}>View All Events</Link>
    </div>
  )
}
```

---

## Customization Options

### 1. Change Tab Order

In `TribePage.tsx`, modify the `tabs` array:

```tsx
const tabs = [
  { id: 'events' as TabType, label: 'Events', icon: Calendar },  // Events first
  { id: 'members' as TabType, label: 'Members', icon: Users },
  { id: 'photos' as TabType, label: 'Photos', icon: Image },
  { id: 'profile' as TabType, label: 'About', icon: Info },
]
```

### 2. Default Tab via URL

Support `?tab=events` in URL:

```tsx
const TribePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const defaultTab = (searchParams.get('tab') as TabType) || 'profile'
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)
  
  // ... rest of component
}
```

### 3. Customize Colors

The components use your existing design tokens. To customize:

```tsx
// Change gradient in GroupHeader.tsx:
<div className="bg-gradient-to-r from-blue-500 to-purple-600">

// Change event card colors in EventCard.tsx:
const gradientFrom = event.location_type === 'virtual' 
  ? 'from-purple-500'  // Your custom color
  : 'from-orange-500'
```

### 4. Add More Event Fields

To add custom fields to events:

1. **Update migration**: Add column to `group_events` table
2. **Update type**: Add field to `GroupEvent` type in `events.ts`
3. **Update service**: Add field to `createEvent` and `updateEvent` functions
4. **Update form**: Add input field to `EventFormModal.tsx`
5. **Update card**: Display field in `EventCard.tsx`

Example - Adding "max_attendees":

```sql
-- In migration:
ALTER TABLE group_events ADD COLUMN max_attendees INTEGER;
```

```typescript
// In events.ts:
export type GroupEvent = {
  // ... existing fields
  max_attendees?: number | null
}

export async function createEvent(params: {
  // ... existing params
  max_attendees?: number
}) {
  // ... implementation
}
```

---

## Troubleshooting

### Issue: "Access Restricted" message for group members

**Cause**: RLS policies not applied or user not in `group_memberships` table

**Fix**:
1. Verify migration ran successfully
2. Check user exists in `group_memberships`:
   ```sql
   SELECT * FROM group_memberships WHERE user_id = 'your-user-id';
   ```
3. Add user to group if missing:
   ```sql
   INSERT INTO group_memberships (group_id, user_id, role)
   VALUES ('group-id', 'user-id', 'MEMBER');
   ```

### Issue: Photos not uploading

**Cause**: Supabase Storage bucket not configured

**Fix**:
1. Create storage bucket named `group-photos` in Supabase Dashboard
2. Set bucket to public or configure RLS policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'group-photos');
   
   -- Allow public reads
   CREATE POLICY "Allow public reads"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'group-photos');
   ```

### Issue: Events not showing

**Cause**: Timezone issues with date filtering

**Fix**: Ensure dates are stored in UTC:
```typescript
// When creating events:
const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
const isoString = startDateTime.toISOString() // Always use ISO format
```

### Issue: RSVP counts not updating

**Cause**: Need to refresh after RSVP submission

**Fix**: Already handled in `EventCard.tsx` with `fetchRsvpData()` call after RSVP

---

## Performance Optimization

### 1. Add Indexes (Already in Migration)

The migration includes these indexes:
- `group_events(group_id, start_time)`
- `event_rsvps(event_id, status)`
- `group_photos(album_id)`

### 2. Implement Pagination

For large groups, add pagination to member list:

```tsx
// In MemberDirectory.tsx:
const [page, setPage] = useState(1)
const pageSize = 20

const paginatedMembers = filteredMembers.slice(
  (page - 1) * pageSize,
  page * pageSize
)
```

### 3. Image Optimization

Use Supabase image transformations:

```tsx
// In AlbumView.tsx:
const thumbnailUrl = `${photo.photo_url}?width=400&height=400`
const fullUrl = photo.photo_url
```

### 4. Lazy Load Tabs

Only load tab content when active:

```tsx
// Already implemented in TribePage.tsx with conditional rendering
{activeTab === 'events' && <EventsDashboard />}
```

---

## Security Checklist

- ✅ RLS policies on all tables
- ✅ Role-based UI (admin controls hidden from members)
- ✅ Server-side permission checks (RLS enforces this)
- ✅ Input validation in forms
- ✅ Confirmation dialogs for destructive actions
- ✅ File type validation for uploads
- ✅ Access control on tribe page (non-members redirected)

---

## Next Steps

1. **Run the migration** on your dev environment
2. **Test thoroughly** using the checklist in `TRIBE_COMMUNITY_HUB_IMPLEMENTATION.md`
3. **Add navigation links** from your existing group management UI
4. **Customize styling** to match your brand (if needed)
5. **Deploy to production** when ready

---

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase logs for RLS policy violations
3. Verify migration ran successfully
4. Review the implementation summary in `TRIBE_COMMUNITY_HUB_IMPLEMENTATION.md`

---

## Feature Enhancements (Future)

Consider adding these features later:

- **Notifications**: Email/push notifications for new events
- **Event Reminders**: Automated reminders before events
- **Photo Comments**: Allow members to comment on photos
- **Event Recurrence**: Support for recurring events
- **Member Invitations**: Invite non-members to join group
- **Activity Feed**: Show recent group activity
- **Event Check-in**: QR code check-in for in-person events
- **Photo Reactions**: Like/react to photos
- **Album Sharing**: Share albums outside the group
- **Event Capacity**: Limit attendees and waitlist

All of these can be built on top of the existing architecture!

