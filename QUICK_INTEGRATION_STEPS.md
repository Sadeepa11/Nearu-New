# SIMPLIFIED INTEGRATION STEPS

## What's Already Done ✅

- All 14 modals created in `app/components/modals/`
- Modal imports added to MapScreen.tsx

## What You Need to Do Manually

### Step 1: Add State Variables

Search for any existing `useState` in MapScreen.tsx and add these near them:

```typescript
// Add these modal state variables
const [isCirclesModalOpen, setIsCirclesModalOpen] = useState(false);
const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
const [isDriveDetectionModalOpen, setIsDriveDetectionModalOpen] = useState(false);
const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
const [isLocationSharingModalOpen, setIsLocationSharingModalOpen] = useState(false);
const [isSosModalOpen, setIsSosModalOpen] = useState(false);
const [isCircleManagementModalOpen, setIsCircleManagementModalOpen] = useState(false);
const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
const [addPlaceMode, setAddPlaceMode] = useState<'create' | 'edit'>('create');
const [editingLocation, setEditingLocation] = useState<any>(null);
```

### Step 2: Update Handlers (Find & Replace)

Use your IDE's find & replace to update these handlers:

**Find:** `router.push('/screens/NotificationsScreen' as any);`
**Replace:** `setIsNotificationsModalOpen(true);`

**Find:** `router.push('/screens/AccountScreen' as any);`
**Replace:** `setIsAccountModalOpen(true);`

**Find:** `router.push('/screens/SettingsScreen' as any);`
**Replace:** `setIsSettingsModalOpen(true);`

**Find:** `router.push('/screens/LocationSharingScreen' as any);`
**Replace:** `setIsLocationSharingModalOpen(true);`

**Find:** `router.push('/screens/CirclesSelectionScreen' as any);`
**Replace:** `setIsCirclesModalOpen(true);`

**Find:** `router.push('/screens/DriveDetectionScreen' as any);`
**Replace:** `setIsDriveDetectionModalOpen(true);`

**Find:** `router.push('/screens/LocationHistoryScreen' as any);`
**Replace:** `setIsLocationHistoryModalOpen(true);`

**Find:** `router.push({ pathname: '/screens/CircleManagementScreen'`
**Replace:** `setIsCircleManagementModalOpen(true); //`

**Find:** `router.push({ pathname: "/screens/SosScreen"`
**Replace:** `setIsSosModalOpen(true); //`

### Step 3: Update AddPlace Handlers

Find `handleNavigateToAddPlace` (around line 4182) and replace the router.push with:

```typescript
setAddPlaceMode('create');
setEditingLocation(null);
setIsAddPlaceModalOpen(true);
```

Find `handleEditSavedPlace` (around line 4200) and replace the router.push with:

```typescript
setAddPlaceMode('edit');
setEditingLocation(locationPoint);
setIsAddPlaceModalOpen(true);
```

### Step 4: Add Modals to JSX

Find the main return statement (search for `return (` with a `<View` or `<SafeAreaView` after it).
Before the closing tag of the main container, add:

```typescript
{/* === MODALS === */}
<CirclesModal
  isOpen={isCirclesModalOpen}
  onClose={() => setIsCirclesModalOpen(false)}
  circles={circles}
  loadingCircles={loadingCircles}
  onRefresh={loadCircles}
  onSelectCircle={(id) => {
    handleSelectCircle(id);
    setIsCirclesModalOpen(false);
  }}
/>

<SettingsModal
  isOpen={isSettingsModalOpen}
  onClose={() => setIsSettingsModalOpen(false)}
  circleId={selectedCircle?.id}
  circleName={selectedCircle?.name}
  onOpenLocationSharing={() => {
    setIsSettingsModalOpen(false);
    setIsLocationSharingModalOpen(true);
  }}
  onOpenCircleManagement={() => {
    setIsSettingsModalOpen(false);
    setIsCircleManagementModalOpen(true);
  }}
  onOpenAccount={() => {
    setIsSettingsModalOpen(false);
    setIsAccountModalOpen(true);
  }}
  onOpenDriveDetection={() => {
    setIsSettingsModalOpen(false);
    setIsDriveDetectionModalOpen(true);
  }}
  onLogout={async () => {
    await logout();
    router.replace("/screens/LogInScreen");
  }}
/>

<AccountModal
  isOpen={isAccountModalOpen}
  onClose={() => setIsAccountModalOpen(false)}
  onLogout={async () => {
    await logout();
    router.replace("/screens/LogInScreen");
  }}
/>

<DriveDetectionModal
  isOpen={isDriveDetectionModalOpen}
  onClose={() => setIsDriveDetectionModalOpen(false)}
/>

<NotificationsModal
  isOpen={isNotificationsModalOpen}
  onClose={() => setIsNotificationsModalOpen(false)}
/>

<LocationSharingModal
  isOpen={isLocationSharingModalOpen}
  onClose={() => setIsLocationSharingModalOpen(false)}
/>

<SosModal
  isOpen={isSosModalOpen}
  onClose={() => setIsSosModalOpen(false)}
  circleId={selectedCircle?.id}
  circleName={selectedCircle?.name}
/>

<CircleManagementModal
  isOpen={isCircleManagementModalOpen}
  onClose={() => setIsCircleManagementModalOpen(false)}
  circleId={selectedCircle?.id}
/>

<AddPlaceModal
  isOpen={isAddPlaceModalOpen}
  onClose={() => {
    setIsAddPlaceModalOpen(false);
    setEditingLocation(null);
  }}
  circleId={selectedCircle?.id}
  circleName={selectedCircle?.name}
  mode={addPlaceMode}
  editingLocation={editingLocation}
  onPlaceSaved={() => {
    setIsAddPlaceModalOpen(false);
    if (selectedCircle?.id) {
      fetchCircleLocations(selectedCircle.id);
    }
  }}
/>
```

### Step 5: Test

1. Save all files
2. Check for TypeScript errors
3. Test each modal opens correctly
4. Verify navigation works

### Step 6: Delete Old Screen Files

Once everything works, delete these files:

- app/screens/AccountScreen.tsx
- app/screens/AddPlaceScreen.tsx
- app/screens/CircleManagementScreen.tsx
- app/screens/CircleNotificationSettingsScreen.tsx
- app/screens/CirclesSelectionScreen.tsx
- app/screens/DriveDetectionScreen.tsx
- app/screens/EditMemberScreen.tsx
- app/screens/LocationHistoryScreen.tsx
- app/screens/LocationSharingScreen.tsx
- app/screens/MemberJourneysScreen.tsx
- app/screens/MyRoleScreen.tsx
- app/screens/NotificationsScreen.tsx
- app/screens/SettingsScreen.tsx
- app/screens/SosScreen.tsx

## Quick Reference: Line Numbers for Handlers

- handleOpenNotificationsModal: ~line 2087
- handleOpenAccountModal: ~line 2091
- handleOpenSettingsModal: ~line 2149
- handleOpenLocationSharingModal: ~line 2163
- handleOpenCircleManagementModal: ~line 2167
- handleOpenCirclesModal: ~line 4128
- handleOpenDriveDetectionModal: ~line 4132
- handleNavigateToAddPlace: ~line 4182
- handleEditSavedPlace: ~line 4200
- handlePressSos: ~line 4430
- handleOpenLocationHistoryModal: ~line 4508
