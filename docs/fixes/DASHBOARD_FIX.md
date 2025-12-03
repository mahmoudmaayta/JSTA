# Dashboard Empty - API Response Format Fix

## Issue
After implementing the refactoring changes, the admin dashboard appeared empty even though the user was logged in.

## Root Cause
The API endpoints were returning data in two different formats:

**Old Format (most endpoints):**
```json
{
  "offices": { "total": 10, ... },
  "renewals": { ... }
}
```

**New Format (updated endpoints like /api/auth/me and /api/auth/login):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@example.com",
    ...
  }
}
```

TanStack Query expected the data directly, but the new standardized format wraps it in a `data` field.

## Solution Applied

### File Modified: `/client/src/lib/queryClient.ts`

Added an `unwrapApiResponse` function to handle both formats during the migration period:

```typescript
/**
 * Unwraps standardized API responses
 * Handles both old format (direct data) and new format ({ success, data })
 */
function unwrapApiResponse<T>(response: any): T {
  // New standardized format: { success: true, data: {...} }
  if (response && typeof response === 'object' && 'success' in response) {
    return response.data as T;
  }
  // Old format: direct data
  return response as T;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // ... fetch logic ...

    const json = await res.json();

    // Unwrap standardized API response format
    return unwrapApiResponse<T>(json);
  };
```

## How It Works

1. **Query Makes Request**: Dashboard calls `/api/admin/stats`
2. **Server Returns Data**: Either old format (direct) or new format (wrapped)
3. **unwrapApiResponse Checks**:
   - If response has `success` field → extract and return `response.data`
   - Otherwise → return response as-is
4. **Dashboard Gets Data**: Receives the unwrapped data in the expected format

## Benefits

1. **Backward Compatible**: Works with both old and new endpoint formats
2. **Smooth Migration**: Endpoints can be updated incrementally
3. **Type Safe**: TypeScript ensures correct types throughout
4. **Future Proof**: When all endpoints are migrated, the old format check can be removed

## Testing

After the fix:
- ✅ Login works correctly
- ✅ Dashboard loads with stats
- ✅ API requests return expected data
- ✅ Both old and new endpoints work

## Next Steps

As part of the ongoing refactoring (see `REFACTORING_GUIDE.md`), remaining endpoints should be gradually updated to use the standardized response format with `ApiResponse.*` helpers from `/server/api-response.ts`.

Once all endpoints are migrated, the `unwrapApiResponse` function can be simplified to only handle the new format.

---

**Status:** ✅ Fixed
**Date:** November 26, 2025
**Related Files:**
- `/client/src/lib/queryClient.ts` (updated)
- `/server/api-response.ts` (standardized response helpers)
- `/server/routes.ts` (partially migrated)
