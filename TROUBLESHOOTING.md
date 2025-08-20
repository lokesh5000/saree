# Database Issues Troubleshooting Guide

## Fixed Issues

The following database issues have been resolved:

### 1. Environment Configuration
- **Issue**: Backend couldn't load environment variables from the correct path
- **Fix**: Updated `server.js` to use proper path resolution for `.env` file
- **Solution**: Added `path.join(__dirname, '../.env')` for correct path loading

### 2. Security Risk - Hardcoded Keys
- **Issue**: Service role key was hardcoded in `supabaseService.js`
- **Fix**: Moved service role key to environment variables
- **Solution**: Added `SUPABASE_SERVICE_ROLE_KEY` to `.env` file

### 3. Database Schema
- **Issue**: No clear database schema definition
- **Fix**: Created comprehensive SQL schema file
- **Solution**: Added `backend/database/schema.sql` with all required tables

### 4. Inconsistent Field Naming
- **Issue**: Mix of camelCase and snake_case in database queries
- **Fix**: Standardized to snake_case for database fields (Supabase convention)
- **Solution**: All database fields now use snake_case consistently

### 5. Missing Database Setup
- **Issue**: No automated way to set up or test database
- **Fix**: Created setup and seeding scripts
- **Solution**: Added `db:setup` and `db:seed` npm scripts

## How to Set Up Your Database

### Step 1: Configure Environment
Ensure your `.env` file has all required variables:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### Step 2: Create Database Schema
1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `backend/database/schema.sql`
4. Execute the SQL

### Step 3: Test Connection
```bash
cd backend
npm run db:setup
```

### Step 4: Seed Initial Data (Optional)
```bash
cd backend
npm run db:seed
```

## Common Error Messages and Solutions

### "User not found" or "Store not found"
- **Cause**: Database tables don't exist or are empty
- **Solution**: Run the schema.sql in Supabase SQL Editor

### "Not authorized, token failed"
- **Cause**: JWT_SECRET mismatch or invalid token
- **Solution**: Check JWT_SECRET in .env file

### "Server error during user lookup"
- **Cause**: Database connection issues
- **Solution**: Verify Supabase URL and service role key

### "Invalid storeId provided"
- **Cause**: Referenced store doesn't exist
- **Solution**: Create stores first or use existing store IDs

## Testing Your Setup

### Test Database Connection
```bash
cd backend
node -e "require('./supabaseService').from('stores').select('*').then(console.log)"
```

### Test Authentication
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}'
```

### Test Store Creation
```bash
curl -X POST http://localhost:5000/api/stores/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"New Store","credits":50}'
```

## Performance Optimizations

The schema includes indexes on frequently queried fields:
- `users.username`
- `users.store_id`
- `clothing_images.clothing_number`
- `clothing_images.version`
- `analytics.user_id`
- `analytics.store_id`
- `analytics.event_type`
- `analytics.created_at`

## Security Features

- Row Level Security (RLS) enabled on all tables
- Service role has full access for backend operations
- Anonymous users can only read clothing images
- Password hashing with bcrypt
- JWT token authentication

## Next Steps

1. Run the database schema in Supabase
2. Test the connection with `npm run db:setup`
3. Optionally seed test data with `npm run db:seed`
4. Start your backend server with `npm run dev`
5. Test API endpoints with the provided curl commands

Your database should now be properly configured and ready to use!