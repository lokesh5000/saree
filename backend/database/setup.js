const supabase = require('../supabaseService');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Note: Supabase doesn't support executing raw SQL through the client
    // You need to run the schema.sql file manually in your Supabase SQL Editor
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('='.repeat(50));
    console.log(schema);
    console.log('='.repeat(50));
    
    // Test the connection
    const { data, error } = await supabase.from('stores').select('count').limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error.message);
      console.log('Make sure you have run the schema.sql in your Supabase SQL Editor');
    } else {
      console.log('Database connection successful!');
    }
    
  } catch (err) {
    console.error('Setup error:', err.message);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };