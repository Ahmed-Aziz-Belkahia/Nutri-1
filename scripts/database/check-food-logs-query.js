import Database from "better-sqlite3";

const db = new Database("./local.db");

console.log("🔍 Checking food logs query logic...\n");

// Get current date
const today = new Date();
const dateString = today.toISOString().split("T")[0]; // "2025-10-13"

console.log("📅 Today's date:", dateString);
console.log("📅 Full ISO:", today.toISOString());

// Create date range like the API does
const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

console.log("\n🔎 Query range (what API searches for):");
console.log("  Start:", startOfDay.toISOString(), "=>", startOfDay.getTime());
console.log("  End:  ", endOfDay.toISOString(), "=>", endOfDay.getTime());

// Check what's in the database
const allLogs = db.prepare("SELECT id, user_id, name, date FROM food_logs").all();

console.log("\n📊 Food logs in database:", allLogs.length);

if (allLogs.length > 0) {
  console.log("\n📝 Stored food logs:");
  allLogs.forEach((log) => {
    const asDate = new Date(log.date);
    const isInRange = log.date >= startOfDay.getTime() && log.date <= endOfDay.getTime();
    
    console.log(`\n  ID ${log.id}: ${log.name}`);
    console.log(`    User: ${log.user_id}`);
    console.log(`    Raw timestamp: ${log.date}`);
    console.log(`    As Date: ${asDate.toISOString()}`);
    console.log(`    In today's range: ${isInRange ? "✅ YES" : "❌ NO"}`);
  });

  // Try the actual query the API uses
  const queryStart = startOfDay.getTime();
  const queryEnd = endOfDay.getTime();
  
  const matchingLogs = db
    .prepare("SELECT * FROM food_logs WHERE date >= ? AND date <= ?")
    .all(queryStart, queryEnd);

  console.log(`\n🎯 Logs matching today's query: ${matchingLogs.length}`);
  
  if (matchingLogs.length === 0) {
    console.log("\n❌ PROBLEM: Logs exist but query finds nothing!");
    console.log("   This means dates are stored in wrong format");
  } else {
    console.log("\n✅ Query works correctly!");
  }
} else {
  console.log("\n💡 No food logs in database yet. Scan a meal to test!");
}

// Check the schema
const schema = db.prepare("PRAGMA table_info(food_logs)").all();
const dateCol = schema.find((col) => col.name === "date");

console.log("\n🔧 Database schema check:");
console.log("  Date column default:", dateCol.dflt_value);

if (dateCol.dflt_value && dateCol.dflt_value.includes("* 1000")) {
  console.log("  ✅ Schema uses milliseconds!");
} else {
  console.log("  ❌ Schema might use seconds!");
}

db.close();
