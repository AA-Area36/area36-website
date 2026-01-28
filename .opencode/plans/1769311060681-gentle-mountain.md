# Feature Implementation Plan

## Summary
This plan covers enhancements to Events, Resources, and Recordings modules including individual calendar saves, multiple flyers with R2 upload, TBD options, multi-select event types, dark mode fixes, URL-persisted tabs, and password-protected recordings.

---

## Phase 1: Database Schema Changes

### 1.1 Add TBD Flags to Events Table
**File:** `lib/db/schema.ts` (line 91)

Add three boolean fields to the events table:
```typescript
timeTBD: integer("time_tbd", { mode: "boolean" }).notNull().default(false),
addressTBD: integer("address_tbd", { mode: "boolean" }).notNull().default(false),
meetingLinkTBD: integer("meeting_link_tbd", { mode: "boolean" }).notNull().default(false),
```

### 1.2 Create Event Flyers Table
**File:** `lib/db/schema.ts` (after events table)

```typescript
export const eventFlyers = sqliteTable("event_flyers", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
})
```

### 1.3 Create Event Types Junction Table
**File:** `lib/db/schema.ts`

```typescript
export const eventToTypes = sqliteTable(
  "event_to_types",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<EventType>(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.type] })]
)
```

### 1.4 Create Recording Folders Table
**File:** `lib/db/schema.ts`

```typescript
export const recordingFolders = sqliteTable("recording_folders", {
  id: text("id").primaryKey(),
  driveId: text("drive_id").notNull().unique(),
  folderName: text("folder_name").notNull(),
  password: text("password").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
})
```

### 1.5 Generate and Run Migrations
- Run `npx drizzle-kit generate`
- Run `npx drizzle-kit migrate` (or apply via Wrangler for production)

---

## Phase 2: Events Features

### 2.1 Add to Google Calendar Button
**Files to modify:**
- `app/events/events-client.tsx`

**Implementation:**
1. Add helper function to generate Google Calendar URL:
```typescript
function generateGoogleCalendarUrl(event: Event): string {
  // Format: YYYYMMDDTHHMMSS
  const startDateTime = `${event.date.replace(/-/g, '')}T${event.startTime.replace(':', '')}00`
  const endDateTime = event.endTime 
    ? `${(event.endDate || event.date).replace(/-/g, '')}T${event.endTime.replace(':', '')}00`
    : startDateTime

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDateTime}/${endDateTime}`,
    details: event.description,
    location: event.address || event.meetingLink || '',
    ctz: event.timezone,
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
```

2. Add button to event card (around line 1050, after flyer link):
```tsx
<Button variant="outline" size="sm" asChild>
  <a href={generateGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
    <CalendarPlus className="h-4 w-4 mr-2" />
    Add to Calendar
  </a>
</Button>
```

### 2.2 TBD Options for Start Time, Address, and Meeting Link
**Files to modify:**
- `lib/schemas/event.ts` - Update validation to make fields optional when TBD is true
- `app/events/events-client.tsx` - Add TBD checkboxes next to time/address/meetingLink fields
- `app/events/actions.ts` - Handle TBD fields in submission
- `app/admin/(dashboard)/events/edit-event-dialog.tsx` - Add TBD checkboxes in edit form

**Validation changes:**
- When `timeTBD: true`, `startTime` is optional
- When `addressTBD: true`, `address` is optional (even for in-person/hybrid)
- When `meetingLinkTBD: true`, `meetingLink` is optional (even for online/hybrid)

**UI changes:**
- Add checkbox with label "TBD" next to each field
- Disable the input when TBD is checked
- Display "TBD" in event cards when flag is true

### 2.3 Multi-select Event Type
**Files to modify:**
- `app/events/events-client.tsx` - Replace Select with MultiSelect for type field
- `app/events/actions.ts` - Save types to junction table
- `app/admin/(dashboard)/events/page.tsx` - Display multiple type badges
- `app/admin/(dashboard)/events/edit-event-dialog.tsx` - Use MultiSelect for types
- `app/admin/(dashboard)/events/actions.ts` - Update junction table on edit
- Event filtering logic - Check if any event type matches selected types

**Data fetching:**
Create helper function to fetch events with their types joined from the junction table.

### 2.4 Multiple Flyers per Event
**Files to modify:**
- `lib/r2/index.ts` - Add `uploadFlyer()` function supporting images + PDF (10MB max)
- `app/events/events-client.tsx` - Multi-file upload input, preview list with remove
- `app/events/actions.ts` - Handle file uploads to R2, create eventFlyers records
- `app/admin/(dashboard)/events/edit-event-dialog.tsx` - Display existing flyers, add/remove flyers
- Create `app/api/flyers/[id]/route.ts` - API route to serve flyers from R2

**R2 storage:**
```typescript
// Key format: event-flyers/{eventId}/{flyerId}.{ext}
```

### 2.5 Fix Dark Mode Checkbox Visibility
**File:** `components/multi-select.tsx` (lines 109-114)

**Current issue:** When checkbox is selected, the row has `bg-primary` and checkbox uses `data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary` which works in light mode but in dark mode the checkmark can disappear.

**Fix:** Add explicit dark mode styles:
```tsx
<Checkbox
  checked={isSelected}
  className={cn(
    "pointer-events-none",
    isSelected && "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-primary"
  )}
/>
```

---

## Phase 3: Resources Features

### 3.1 Remember Tab via Query Param
**File:** `app/resources/resources-content.tsx`

**Changes:**
1. Add imports: `import { useRouter, useSearchParams } from "next/navigation"`
2. Read initial tab from URL: `const initialTab = searchParams.get("tab") || "delegate"`
3. Initialize state with URL value: `useState<string>(initialTab)`
4. Update URL on tab change:
```typescript
const handleTabChange = (value: string) => {
  setCurrentCategory(value)
  const params = new URLSearchParams(searchParams.toString())
  if (value === "delegate") {
    params.delete("tab")
  } else {
    params.set("tab", value)
  }
  router.replace(`/resources${params.toString() ? `?${params}` : ''}`, { scroll: false })
}
```
5. Use `value={currentCategory}` and `onValueChange={handleTabChange}` on Tabs component

---

## Phase 4: Recordings Features

### 4.1 Session Management for Unlocked Folders
**New file:** `lib/recordings/session.ts`

Functions:
- `getUnlockedFolders(): Promise<string[]>` - Read from httpOnly cookie
- `setUnlockedFolder(folderId: string): Promise<void>` - Add to cookie, 24hr expiry
- `isFolderUnlocked(folderId: string): Promise<boolean>` - Check if unlocked

### 4.2 Password Verification Action
**File:** `app/recordings/actions.ts` (extend existing)

```typescript
export async function verifyFolderPassword(folderId: string, password: string) {
  // Query recordingFolders table
  // Compare password
  // If match, call setUnlockedFolder()
  // Return success/error
}

export async function getRegisteredFolderIds(): Promise<string[]> {
  // Return all driveIds from recordingFolders table
}
```

### 4.3 Filter Recordings to Registered Folders
**File:** `lib/gdrive/recordings.ts`

Modify `getRecordings()` to:
1. Accept `registeredFolderIds: string[]` parameter
2. Filter categoryFolders to only include those in the registered list

### 4.4 Password Dialog Component
**New file:** `components/password-dialog.tsx`

- Modal with password input
- Shows folder name being unlocked
- Calls `verifyFolderPassword()` action
- On success: triggers page refresh to update cookies

### 4.5 Update Recordings Page
**Files:**
- `app/recordings/page.tsx` - Pass `unlockedFolders` and `registeredFolderIds` to client
- `app/recordings/recordings-client.tsx`:
  - Show lock icon on locked categories
  - Intercept click on locked tab to show password dialog
  - Disable playback/download for recordings in locked folders

### 4.6 Admin Recordings Page
**New files:**
- `app/admin/(dashboard)/recordings/page.tsx` - List folders with passwords visible
- `app/admin/(dashboard)/recordings/actions.ts` - CRUD operations for recordingFolders
- `app/admin/(dashboard)/recordings/add-folder-dialog.tsx` - Form: driveId, folderName, password
- `app/admin/(dashboard)/recordings/edit-folder-dialog.tsx` - Edit name/password

**Update:** `app/admin/(dashboard)/layout.tsx` - Add "Recordings" nav link

---

## File Change Summary

### New Files
| Path | Purpose |
|------|---------|
| `lib/recordings/session.ts` | Cookie-based session for unlocked folders |
| `app/api/flyers/[id]/route.ts` | Serve flyer files from R2 |
| `components/password-dialog.tsx` | Password entry dialog |
| `app/admin/(dashboard)/recordings/page.tsx` | Admin folder management |
| `app/admin/(dashboard)/recordings/actions.ts` | Admin CRUD actions |
| `app/admin/(dashboard)/recordings/add-folder-dialog.tsx` | Add folder form |
| `app/admin/(dashboard)/recordings/edit-folder-dialog.tsx` | Edit folder form |

### Modified Files
| Path | Changes |
|------|---------|
| `lib/db/schema.ts` | Add TBD flags, eventFlyers, eventToTypes, recordingFolders tables |
| `lib/schemas/event.ts` | Update validation for TBD fields |
| `lib/r2/index.ts` | Add uploadFlyer() with PDF support |
| `lib/gdrive/recordings.ts` | Filter by registered folder IDs |
| `app/events/events-client.tsx` | Calendar button, TBD checkboxes, multi-type, file upload |
| `app/events/actions.ts` | Handle TBD, types, file uploads |
| `app/admin/(dashboard)/events/page.tsx` | Display multiple type badges |
| `app/admin/(dashboard)/events/edit-event-dialog.tsx` | TBD, multi-type, flyers |
| `app/admin/(dashboard)/events/actions.ts` | Update types junction table, manage flyers |
| `app/admin/(dashboard)/layout.tsx` | Add Recordings nav link |
| `app/resources/resources-content.tsx` | URL query param for tab state |
| `app/recordings/page.tsx` | Pass unlocked/registered folders to client |
| `app/recordings/recordings-client.tsx` | Password protection UI |
| `app/recordings/actions.ts` | Password verification action |
| `components/multi-select.tsx` | Fix dark mode checkbox visibility |

---

## Implementation Order

### Week 1: Foundation & Quick Wins
1. Database schema changes (Phase 1)
2. Dark mode checkbox fix (2.5)
3. Resources tab URL param (3.1)
4. Add to Google Calendar button (2.1)

### Week 2: Event Enhancements
5. TBD options (2.2)
6. Multi-select event type (2.3)

### Week 3: File Uploads
7. Multiple flyers per event (2.4)

### Week 4: Recordings
8. Admin recordings page (4.6)
9. Password protection backend (4.1-4.3)
10. Password gate UI (4.4-4.5)

---

## Verification

### Events Testing
- [ ] Add to Calendar generates correct Google Calendar URL for single/multi-day events
- [ ] TBD checkboxes disable corresponding inputs and display "TBD" in cards
- [ ] Multi-select event type saves and filters correctly
- [ ] Flyer upload works for images and PDFs (reject >10MB)
- [ ] Flyers display and download correctly
- [ ] Dark mode checkboxes visible when selected

### Resources Testing
- [ ] Navigate to `/resources?tab=forms` - Forms tab opens
- [ ] Change tabs - URL updates
- [ ] Refresh page - correct tab remains selected

### Recordings Testing
- [ ] Admin can add/edit/delete recording folders
- [ ] Only registered folders appear on recordings page
- [ ] Locked folders show lock icon
- [ ] Password dialog opens on locked folder click
- [ ] Correct password unlocks folder for 24 hours
- [ ] Wrong password shows error
- [ ] Unlocked state persists across page refreshes
