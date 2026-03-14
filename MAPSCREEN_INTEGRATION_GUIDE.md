# MapScreen Modal Integration Guide

## Step 1: Add Modal Imports

Add these imports at the top of MapScreen.tsx (after existing imports):

```typescript
// Modal imports
import CirclesModal from '../components/modals/CirclesModal';
import SettingsModal from '../components/modals/SettingsModal';
import AccountModal from '../components/modals/AccountModal';
import DriveDetectionModal from '../components/modals/DriveDetectionModal';
import NotificationsModal from '../components/modals/NotificationsModal';
import LocationSharingModal from '../components/modals/LocationSharingModal';
import SosModal from '../components/modals/SosModal';
import CircleManagementModal from '../components/modals/CircleManagementModal';
import EditMemberModal from '../components/modals/EditMemberModal';
import MemberJourneysModal from '../components/modals/MemberJourneysModal';
import LocationHistoryModal from '../components/modals/LocationHistoryModal';
import CircleNotificationSettingsModal from '../components/modals/CircleNotificationSettingsModal';
import MyRoleModal from '../components/modals/MyRoleModal';
import AddPlaceModal from '../components/modals/AddPlaceModal';
```

## Step 2: Add Modal State Variables

Add these state variables in the MapScreen component (find where other useState declarations are):

```typescript
// Modal state variables
const [isCirclesModalOpen, setIsCirclesModalOpen] = useState(false);
const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
const [isDriveDetectionModalOpen, setIsDriveDetectionModalOpen] = useState(false);
const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
const [isLocationSharingModalOpen, setIsLocationSharingModalOpen] = useState(false);
const [isSosModalOpen, setIsSosModalOpen] = useState(false);
const [isCircleManagementModalOpen, setIsCircleManagementModalOpen] = useState(false);
const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
const [isMemberJourneysModalOpen, setIsMemberJourneysModalOpen] = useState(false);
const [isLocationHistoryModalOpen, setIsLocationHistoryModalOpen] = useState(false);
const [isCircleNotificationSettingsModalOpen, setIsCircleNotificationSettingsModalOpen] = useState(false);
const [isMyRoleModalOpen, setIsMyRoleModalOpen] = useState(false);
const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
const [addPlaceMode, setAddPlaceMode] = useState<'create' | 'edit'>('create');
const [editingLocation, setEditingLocation] = useState<any>(null);
const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<CircleMember | null>(null);
const [selectedMemberForJourneys, setSelectedMemberForJourneys] = useState<CircleMember | null>(null);
```

## Step 3: Update Handler Functions

Replace the existing handler functions with these modal-based versions:

```typescript
// Line ~2087-2089: Update handleOpenNotificationsModal
const handleOpenNotificationsModal = useCallback(() => {
  setIsNotificationsModalOpen(true);
}, []);

// Line ~2091-2093: Update handleOpenAccountModal
const handleOpenAccountModal = useCallback(() => {
  setIsAccountModalOpen(true);
}, []);

// Line ~2095-2112: Update handleOpenCircleNotificationSettings
const handleOpenCircleNotificationSettings = useCallback(() => {
  if (!selectedCircle) return;

  const myMemberRecord = selectedCircleMembers.find(m => resolveMemberId(m) === currentUserId);
  const role = normalizeRole((myMemberRecord?.Membership as any)?.role);
  const isCreator = selectedCircle.creatorId === currentUserId;
  const isAdmin = role === "admin";

  if (!isCreator && !isAdmin) {
    showAlert({ title: "Permission Denied", message: "Only circle creators and admins can update notification settings.", type: 'warning' });
    return;
  }

  setIsCircleNotificationSettingsModalOpen(true);
}, [currentUserId, selectedCircle, selectedCircleMembers, showAlert]);

// Line ~2149-2161: Update handleOpenSettingsModal
const handleOpenSettingsModal = useCallback(() => {
  setIsSettingsModalOpen(true);
}, []);

// Line ~2163-2165: Update handleOpenLocationSharingModal
const handleOpenLocationSharingModal = useCallback(() => {
  setIsLocationSharingModalOpen(true);
}, []);

// Line ~2167-2171: Update handleOpenCircleManagementModal
const handleOpenCircleManagementModal = useCallback(() => {
  if (selectedCircle?.id) {
    setIsCircleManagementModalOpen(true);
  }
}, [selectedCircle]);

// Line ~4128-4130: Update handleOpenCirclesModal
const handleOpenCirclesModal = useCallback(() => {
  setIsCirclesModalOpen(true);
}, []);

// Line ~4132-4134: Update handleOpenDriveDetectionModal
const handleOpenDriveDetectionModal = useCallback(() => {
  setIsDriveDetectionModalOpen(true);
}, []);

// Line ~4136-4144: Update handleOpenMemberJourneysModal
const handleOpenMemberJourneysModal = useCallback((member: CircleMember) => {
  setSelectedMemberForJourneys(member);
  setIsMemberJourneysModalOpen(true);
}, []);

// Line ~4182-4198: Update handleNavigateToAddPlace
const handleNavigateToAddPlace = () => {
  if (!selectedCircle) {
    showAlert({ title: "Select a circle", message: "Choose a circle before adding a place.", type: 'info' });
    return;
  }
  snapTo(MIN_HEIGHT);
  setIsExpanded(false);
  setAddPlaceMode('create');
  setEditingLocation(null);
  setIsAddPlaceModalOpen(true);
};

// Line ~4200-4229: Update handleEditSavedPlace
const handleEditSavedPlace = (locationPoint: LocationPoint) => {
  if (!selectedCircle) {
    showAlert({ title: "Select a circle", message: "Choose a circle before editing a place.", type: 'info' });
    return;
  }

  if (!canManageLocations) {
    showAlert({ title: "Permission denied", message: "You do not have permission to update saved places.", type: 'warning' });
    return;
  }

  const hasValidId = locationPoint?.id !== undefined && locationPoint?.id !== null && String(locationPoint.id).trim().length > 0;
  if (!hasValidId) {
    showAlert({ title: "Cannot edit place", message: "This saved location is missing an identifier and cannot be updated.", type: 'error' });
    return;
  }

  snapTo(MIN_HEIGHT);
  setIsExpanded(false);
  setAddPlaceMode('edit');
  setEditingLocation(locationPoint);
  setIsAddPlaceModalOpen(true);
};

// Line ~4430-4443: Update handlePressSos
const handlePressSos = useCallback(() => {
  if (!selectedCircle) {
    showAlert({ title: "Select a circle", message: "Choose a circle before sending an SOS alert.", type: 'info' });
    return;
  }
  setIsSosModalOpen(true);
}, [selectedCircle, showAlert]);

// Line ~4508-4510: Update handleOpenLocationHistoryModal
const handleOpenLocationHistoryModal = useCallback(() => {
  setIsLocationHistoryModalOpen(true);
}, []);
```

## Step 4: Add Modal Components to JSX

Find the main return statement in MapScreen and add these modals at the end, just before the closing tag:

```typescript
{/* Modals */}
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
  shareTargetCircle={shareTargetCircle}
  shareRequestId={shareRequestId}
  onShareHandled={() => {
    setShareTargetCircle(null);
    setShareRequestId(null);
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
  onSettingsChanged={(enabled) => {
    // Handle drive detection settings change
    console.log('Drive detection:', enabled);
  }}
/>

<NotificationsModal
  isOpen={isNotificationsModalOpen}
  onClose={() => setIsNotificationsModalOpen(false)}
/>

<LocationSharingModal
  isOpen={isLocationSharingModalOpen}
  onClose={() => setIsLocationSharingModalOpen(false)}
  onSettingsChanged={(enabled) => {
    // Handle location sharing settings change
    console.log('Location sharing:', enabled);
  }}
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
  onRefresh={() => {
    if (selectedCircle?.id) {
      fetchCircleMembers(selectedCircle.id);
    }
  }}
  onOpenAdminManagement={() => {
    // Open admin management - can be implemented later
    showAlert({ title: "Coming Soon", message: "Admin management will be available soon.", type: 'info' });
  }}
  onOpenEditCircle={() => {
    // Open edit circle - can be implemented later
    showAlert({ title: "Coming Soon", message: "Edit circle will be available soon.", type: 'info' });
  }}
  onDeleteCircle={() => {
    // Handle delete circle
    if (selectedCircle) {
      handleDeleteCircle(selectedCircle.id);
    }
  }}
/>

<EditMemberModal
  isOpen={isEditMemberModalOpen}
  onClose={() => {
    setIsEditMemberModalOpen(false);
    setSelectedMemberForEdit(null);
  }}
  circleId={selectedCircle?.id}
  memberId={selectedMemberForEdit?.id || selectedMemberForEdit?.userId}
  onMemberUpdated={() => {
    if (selectedCircle?.id) {
      fetchCircleMembers(selectedCircle.id);
    }
  }}
/>

<MemberJourneysModal
  isOpen={isMemberJourneysModalOpen}
  onClose={() => {
    setIsMemberJourneysModalOpen(false);
    setSelectedMemberForJourneys(null);
  }}
  circleId={selectedCircle?.id}
  memberId={selectedMemberForJourneys?.id || selectedMemberForJourneys?.userId}
/>

<LocationHistoryModal
  isOpen={isLocationHistoryModalOpen}
  onClose={() => setIsLocationHistoryModalOpen(false)}
/>

<CircleNotificationSettingsModal
  isOpen={isCircleNotificationSettingsModalOpen}
  onClose={() => setIsCircleNotificationSettingsModalOpen(false)}
  circleId={selectedCircle?.id}
  initialSettings={(selectedCircle as any)?.notificationSettings || {}}
  onSettingsChanged={(settings) => {
    // Handle settings change
    console.log('Notification settings updated:', settings);
  }}
/>

<MyRoleModal
  isOpen={isMyRoleModalOpen}
  onClose={() => setIsMyRoleModalOpen(false)}
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
    setEditingLocation(null);
    if (selectedCircle?.id) {
      fetchCircleLocations(selectedCircle.id);
    }
  }}
/>
```

## Summary of Changes

### Handlers Updated (11 total)

1. handleOpenNotificationsModal
2. handleOpenAccountModal
3. handleOpenCircleNotificationSettings
4. handleOpenSettingsModal
5. handleOpenLocationSharingModal
6. handleOpenCircleManagementModal
7. handleOpenCirclesModal
8. handleOpenDriveDetectionModal
9. handleOpenMemberJourneysModal
10. handleNavigateToAddPlace
11. handleEditSavedPlace
12. handlePressSos
13. handleOpenLocationHistoryModal

### All router.push calls removed and replaced with modal state setters

### Next: Apply these changes to MapScreen.tsx
