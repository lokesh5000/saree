# Database Setup Guide

This project uses Supabase as the database backend. Follow these steps to set up your database properly.

## Prerequisites

1. A Supabase project created at [supabase.com](https://supabase.com)
2. Your Supabase URL and keys configured in the `.env` file

## Setup Steps

### 1. Configure Environment Variables

Make sure your `.env` file in the project root contains:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### 2. Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `schema.sql` into the editor
4. Run the SQL to create all necessary tables and indexes

### 3. Verify Setup

Run the setup script to test your database connection:

```bash
cd backend
node database/setup.js
```

## Database Schema

The database includes the following tables:

### stores
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Unique)
- `credits` (INTEGER, Default: 0)
- `created_at` (TIMESTAMP)

### users
- `id` (UUID, Primary Key)
- `username` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `role` (VARCHAR: 'user', 'admin', 'super-admin')
- `store_id` (UUID, Foreign Key to stores)
- `created_at` (TIMESTAMP)

### clothing_images
- `id` (UUID, Primary Key)
- `image_url` (TEXT)
- `clothing_number` (VARCHAR)
- `version` (VARCHAR)
- `name` (VARCHAR)
- `uploaded_by` (UUID, Foreign Key to users)
- `created_at` (TIMESTAMP)

### analytics
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `store_id` (UUID, Foreign Key to stores)
- `event_type` (VARCHAR)
- `event_data` (JSONB)
- `created_at` (TIMESTAMP)

## Security

- Row Level Security (RLS) is enabled on all tables
- Service role has full access for backend operations
- Anonymous users can only read clothing images
- Custom policies can be added based on your requirements

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check your environment variables and Supabase project status
2. **Table Not Found**: Make sure you've run the schema.sql in Supabase SQL Editor
3. **Permission Denied**: Verify your service role key is correct and has proper permissions

### Testing Connection

You can test your database connection by running:

```bash
cd backend
node -e "require('./supabaseService').from('stores').select('*').then(console.log)"
```