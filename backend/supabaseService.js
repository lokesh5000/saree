const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables if not already loaded
if (!process.env.REACT_APP_SUPABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service_role key for backend operations

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
