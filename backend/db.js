// Backend/db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Ensure environment variables are loaded

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_ANON_KEY must be defined in your .env file");
  process.exit(1); 
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };