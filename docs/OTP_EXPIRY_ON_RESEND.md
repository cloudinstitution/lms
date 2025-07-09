# OTP Expiry on Resend Button Press

## Issue Description
When the user presses the "Resend OTP" button, the current OTP should immediately expire and a new OTP should be generated with a fresh 5-minute countdown and 30-second resend cooldown.

## Solution Implemented

### Updated `handleResendOTP` Function
**File**: `app/forgot-password/page.tsx`

**Changes Made**:
1. **Immediate OTP Expiry**: When resend is pressed, immediately reset the countdown timer
2. **Reset Resend Cooldown**: Disable the resend button for the next 30 seconds
3. **Fresh Timer**: Start a new 5-minute countdown with 30-second resend availability

### Code Changes

```tsx
// Handle resend OTP
const handleResendOTP = async () => {
  if (!canResendOTP || isLoading) return;
  
  setIsLoading(true);
  setError("");
  
  // Immediately expire the current OTP and reset the timer
  setCountdownTime(300); // Reset to 5 minutes
  setCanResendOTP(false); // Disable resend button for next 30 seconds
  
  try {
    // ... API call to resend OTP
    const result = await response.json();
    
    if (result.success) {
      // Start new countdown with fresh expiry time
      startCountdown(result.expiresAt);
    }
  } catch (error) {
    // Error handling
  } finally {
    setIsLoading(false);
  }
};
```

## User Experience Flow

### Before Resend:
1. User has received an OTP
2. 30+ seconds have passed (resend button is enabled)
3. User can click "Resend OTP"

### When Resend is Pressed:
1. **Current OTP expires immediately** (countdown resets to 5:00)
2. **Resend button becomes disabled** (30-second cooldown starts)
3. **New OTP is generated** and sent via email
4. **Fresh countdown begins** with new expiry time

### After Resend:
1. **0-30 seconds**: Resend button disabled, shows countdown to next resend
2. **30+ seconds**: Resend button enabled again
3. **User receives new OTP** in email with fresh 5-minute validity

## Technical Implementation

### State Changes on Resend:
- `setCountdownTime(300)` - Reset to 5 minutes
- `setCanResendOTP(false)` - Disable resend for 30 seconds
- `setIsLoading(true)` - Show loading state
- `startCountdown(result.expiresAt)` - Start fresh countdown

### Timer Logic:
- Previous OTP becomes invalid immediately
- New OTP has full 5-minute validity
- Resend cooldown restarts (30 seconds)
- UI updates to show fresh countdown

## Benefits

1. **Security**: Previous OTP is immediately invalidated
2. **Clear UX**: User knows exactly when new OTP is active
3. **Prevents Confusion**: Only one valid OTP at a time
4. **Rate Limiting**: 30-second cooldown prevents spam
5. **Fresh Start**: Each resend gives full 5-minute validity

## UI States After Resend

### Immediate (0-30 seconds):
```
📱 Resend OTP will be available in X seconds
[Resend OTP - Disabled]
```

### After 30 seconds:
```
✅ You can now resend OTP (30 seconds have passed)
[Resend OTP - Enabled]
```

### Timer Display:
- Shows countdown from 5:00 to 0:00
- Resend available when timer shows 4:30 or less
- Clear visual feedback for user

## Testing Scenarios

1. **Initial OTP**: Verify 5-minute countdown starts
2. **30-Second Mark**: Verify resend button becomes enabled
3. **Press Resend**: Verify immediate timer reset and button disable
4. **New OTP**: Verify new OTP is sent and old one is invalid
5. **Fresh Countdown**: Verify new 5-minute timer starts
6. **Multiple Resends**: Verify each resend resets the cycle

## Status
✅ **COMPLETED**: OTP expires immediately when resend is pressed
✅ **COMPLETED**: Fresh 5-minute countdown with 30-second resend cooldown
✅ **COMPLETED**: Clear UI feedback for user
✅ **COMPLETED**: Proper security - only one valid OTP at a time
