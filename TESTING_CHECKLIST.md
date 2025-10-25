# CTS v3 Testing Checklist & Progressive Fixes

## Current Status
✅ Dashboard page loads correctly
✅ Settings page loads correctly  
✅ Presets page fixed (was showing client-side exception)
❌ Connection management needs testing
❌ Trade engine needs testing

## Test Flow: Add Connection from Preset

### Step 1: Navigate to Settings > Connection Tab
**URL:** https://snet-cts-v3.vercel.app/settings (Connection tab)

**Expected:**
- ExchangeConnectionManager component loads
- Predefined connections dropdown visible
- "Add Connection" button visible

**Potential Issues:**
- Database migration not running automatically
- Missing columns in exchange_connections table

**Fix Applied:**
- Added `ensureMigration()` function that runs before GET/POST operations
- Automatically creates missing columns and tables

### Step 2: Select Predefined Connection
**Action:** Click predefined connections dropdown, select "Bybit Perpetual Futures (USDT)"

**Expected:**
- Form auto-fills with predefined values
- Exchange: bybit
- API Type: perpetual_futures
- Connection Method: library
- Margin Type: cross
- Position Mode: hedge

**Potential Issues:**
- Predefined connections not loaded from database
- `init-predefined` route not called on page load

**Fix Applied:**
- Added `initializePredefinedConnections()` call in useEffect
- Added refresh button next to predefined dropdown

### Step 3: Enter API Credentials
**Action:** Enter API key and secret

**Expected:**
- Input fields accept text strings up to 350 characters
- Password fields mask the input

**Potential Issues:**
- Database columns defined as INTEGER instead of VARCHAR/TEXT
- "invalid input syntax for type integer" error

**Fix Applied:**
- Migration checks if api_key/api_secret are INTEGER type
- Automatically converts to VARCHAR(350)
- Ensures all API credential fields support long strings

### Step 4: Click "Add Connection"
**Action:** Submit the form

**Expected:**
- POST request to `/api/settings/connections`
- Success toast message
- Connection appears in list below
- Form closes

**Potential Issues:**
- Column "exchange" does not exist
- Column "connection_library" does not exist  
- Column "is_predefined" does not exist
- Column "is_active" does not exist
- ID column is INTEGER but code generates nanoid strings

**Fix Applied:**
- Migration adds all missing columns
- Migration converts ID from INTEGER to VARCHAR(21) for nanoid support
- Migration creates volume_configuration and trade_engine_state tables

### Step 5: Enable Connection
**Action:** Toggle the switch to enable the connection

**Expected:**
- Switch turns on
- Connection status changes to "Active"
- Success toast message

**Potential Issues:**
- Toggle API endpoint fails
- State not updating correctly

**Fix Applied:**
- Added proper error handling in toggleConnectionEnabled
- Reloads connections after toggle

### Step 6: Test Connection
**Action:** Click the test button (TestTube icon)

**Expected:**
- Loading spinner appears
- API call to exchange
- Success message with balance
- Connection status updates to "Connected"
- Test log details appear

**Potential Issues:**
- API credentials invalid
- Exchange API rate limits
- Network errors

**Fix Applied:**
- Added comprehensive error handling
- Shows detailed test logs
- Displays balance on success

### Step 7: Add to Active Connections (Dashboard)
**Action:** Navigate to Dashboard, select connection from dropdown

**Expected:**
- Connection appears in dropdown
- Only enabled connections shown
- Selection syncs with localStorage

**Potential Issues:**
- Connections not loading on dashboard
- Null/undefined data access errors

**Fix Applied:**
- Added null checks for connections array
- Validates data is array before processing
- Sets empty array as fallback

## Database Schema Fixes Applied

### exchange_connections table:
- ✅ id: VARCHAR(21) (was INTEGER)
- ✅ exchange: VARCHAR(50) (was missing)
- ✅ connection_library: VARCHAR(100) (was missing)
- ✅ is_predefined: BOOLEAN DEFAULT false (was missing)
- ✅ is_active: BOOLEAN DEFAULT false (was missing)
- ✅ api_key: VARCHAR(350) (was TEXT, ensure length support)
- ✅ api_secret: VARCHAR(350) (was TEXT, ensure length support)
- ✅ api_passphrase: VARCHAR(350) (was missing)
- ✅ api_capabilities: JSONB (was missing)
- ✅ rate_limits: JSONB (was missing)

### volume_configuration table:
- ✅ Created with connection_id VARCHAR(21)
- ✅ volume_factor DECIMAL DEFAULT 1.0

### trade_engine_state table:
- ✅ Created with connection_id VARCHAR(21)
- ✅ is_running BOOLEAN DEFAULT false

## Next Steps for Testing

1. ✅ Fix presets page client-side exception
2. ⏳ Test adding connection from predefined
3. ⏳ Test enabling connection
4. ⏳ Test connection test functionality
5. ⏳ Test trade engine start/stop
6. ⏳ Test preset trade engine
7. ⏳ Check monitoring logs for errors
8. ⏳ Verify all forms handle data correctly

## Known Issues to Monitor

1. **Rate Limiting:** Exchange APIs have rate limits, test carefully
2. **Testnet vs Mainnet:** Ensure testnet toggle works correctly
3. **Multiple Connections:** Test with 2+ connections enabled
4. **Connection Priority:** Verify fallback logic works
5. **Volume Factor:** Test slider updates correctly
6. **Database Size:** Monitor database growth with active trading

## Error Messages to Watch For

- ❌ "column X does not exist" → Migration not running
- ❌ "invalid input syntax for type integer" → Column type mismatch
- ❌ "relation X does not exist" → Table not created
- ❌ "Application error: a client-side exception" → Null/undefined access
- ❌ "Failed to load connections" → API route error
- ❌ "Connection test failed" → Exchange API issue

## Success Criteria

✅ All pages load without errors
✅ Can add connection from predefined
✅ Can enable/disable connections
✅ Can test connections successfully
✅ Can start trade engine
✅ No client-side exceptions
✅ All forms validate correctly
✅ Database migrations run automatically
