// Script to automatically create database tables without interactive prompts
import pg from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get connection from environment variables
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTables() {
  try {
    console.log('Creating database tables...');
    
    // Read SQL from file
    const sqlPath = path.join(__dirname, 'schema.sql');
    let sql;
    
    try {
      sql = await fs.readFile(sqlPath, 'utf-8');
    } catch (err) {
      // If schema file doesn't exist, create it with basic tables
      sql = `
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY NOT NULL,
          "email" text UNIQUE NOT NULL,
          "password" text NOT NULL,
          "has_completed_onboarding" boolean DEFAULT false,
          "last_activity_date" date,
          "profile_image" text,
          "preferred_language" text DEFAULT 'en',
          "reset_token" text,
          "reset_token_expires_at" timestamp,
          "current_streak" integer,
          "longest_streak" integer,
          "experience_points" integer,
          "level" integer
        );
        
        CREATE TABLE IF NOT EXISTS "badges" (
          "id" serial PRIMARY KEY NOT NULL,
          "name" text NOT NULL,
          "description" text NOT NULL,
          "icon" text NOT NULL,
          "requirement" jsonb NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS "recipes" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" integer NOT NULL REFERENCES users(id),
          "name" text NOT NULL,
          "description" text,
          "ingredients" jsonb NOT NULL,
          "instructions" jsonb NOT NULL,
          "nutrition_info" jsonb,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          "image_url" text,
          "rating" decimal DEFAULT '0',
          "likes_count" integer DEFAULT 0,
          "comments_count" integer DEFAULT 0,
          "is_public" boolean DEFAULT false,
          "is_saved" boolean DEFAULT false,
          "source" text DEFAULT 'created',
          "original_recipe_id" integer,
          "is_liked" boolean DEFAULT false
        );
      `;
      
      await fs.writeFile(sqlPath, sql, 'utf-8');
      console.log('Created basic schema file');
    }
    
    // Execute SQL commands
    await pool.query(sql);
    console.log('Tables created successfully');
    
    // Create uploads directory
    try {
      await fs.mkdir('./uploads', { recursive: true });
      console.log('Created uploads directory');
    } catch (err) {
      console.log('Uploads directory already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating tables:', error);
    return false;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the function if this file is executed directly
createTables()
  .then(success => {
    if (success) {
      console.log('✅ Database setup completed');
    } else {
      console.error('❌ Database setup failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });