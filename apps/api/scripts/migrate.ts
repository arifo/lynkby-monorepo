#!/usr/bin/env tsx
// @ts-ignore - This script runs locally, not in Cloudflare Workers

/**
 * Database Migration Script for Prisma Accelerate
 * 
 * This script handles database migrations for the Cloudflare Worker API.
 * It should be run locally before deploying to ensure the database schema is up to date.
 */

import { execSync } from "child_process";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".dev.vars") });

const MIGRATION_COMMANDS = {
  GENERATE: "npx prisma generate",
  MIGRATE: "npx prisma migrate deploy",
  PUSH: "npx prisma db push",
  RESET: "npx prisma migrate reset --force",
  STATUS: "npx prisma migrate status",
} as const;

async function runMigration() {
  console.log("🚀 Starting database migration...");
  
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    if (!process.env.DIRECT_URL) {
      throw new Error("DIRECT_URL environment variable is not set");
    }
    
    console.log("✅ Environment variables loaded");
    console.log(`📊 Database: ${process.env.DATABASE_URL.split("@")[1]?.split("/")[0] || "unknown"}`);
    
    // Generate Prisma client
    console.log("🔧 Generating Prisma client...");
    execSync(MIGRATION_COMMANDS.GENERATE, { stdio: "inherit" });
    console.log("✅ Prisma client generated");
    
    // Check migration status
    console.log("📋 Checking migration status...");
    execSync(MIGRATION_COMMANDS.STATUS, { stdio: "inherit" });
    
    // Deploy migrations
    console.log("🚀 Deploying migrations...");
    execSync(MIGRATION_COMMANDS.MIGRATE, { stdio: "inherit" });
    console.log("✅ Migrations deployed successfully");
    
    // Generate Prisma client again (in case of schema changes)
    console.log("🔧 Regenerating Prisma client...");
    execSync(MIGRATION_COMMANDS.GENERATE, { stdio: "inherit" });
    console.log("✅ Prisma client regenerated");
    
    console.log("🎉 Database migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case "generate":
    console.log("🔧 Generating Prisma client...");
    execSync(MIGRATION_COMMANDS.GENERATE, { stdio: "inherit" });
    break;
    
  case "migrate":
    console.log("🚀 Deploying migrations...");
    execSync(MIGRATION_COMMANDS.MIGRATE, { stdio: "inherit" });
    break;
    
  case "push":
    console.log("📤 Pushing schema changes...");
    execSync(MIGRATION_COMMANDS.PUSH, { stdio: "inherit" });
    break;
    
  case "reset":
    console.log("⚠️  Resetting database (this will delete all data)...");
    execSync(MIGRATION_COMMANDS.RESET, { stdio: "inherit" });
    break;
    
  case "status":
    console.log("📋 Checking migration status...");
    execSync(MIGRATION_COMMANDS.STATUS, { stdio: "inherit" });
    break;
    
  default:
    // Run full migration by default
    runMigration();
}

export { runMigration };
