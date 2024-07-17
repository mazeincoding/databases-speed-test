const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = "SUPABASE_URL";
const supabaseKey = "SUPABASE_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "FIREBASE_DATABASE_URL",
});

// Warm-up query function
async function warmUpSupabase() {
  try {
    await supabase.from("users").select("name").limit(1);
    console.log("Supabase warm-up query executed");
  } catch (error) {
    console.error("Error during Supabase warm-up:", error);
  }
}

// Endpoint for fetching user names from Supabase
app.get("/api/supabase", async (req, res) => {
  try {
    const startTime = Date.now();
    let allData = [];
    let count = 0;
    const pageSize = 10000;

    while (true) {
      const {
        data,
        error,
        count: totalCount,
      } = await supabase
        .from("users")
        .select("name", { count: "exact" })
        .range(count, count + pageSize - 1);

      if (error) throw error;
      allData = allData.concat(data);
      count += data.length;

      console.log(`Supabase: Fetched ${count} of ${totalCount} records`);

      if (count >= totalCount) break;
    }

    const endTime = Date.now();
    console.log(`Supabase fetch time: ${endTime - startTime}ms`);
    console.log(`Supabase fetched data: ${allData.length} records`);
    res.json({ count: allData.length, time: endTime - startTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching user names from Firebase Realtime Database
app.get("/api/firebase", async (req, res) => {
  try {
    const startTime = Date.now();
    const db = admin.database();
    const ref = db.ref("users");
    let allData = [];
    const pageSize = 10000;

    let lastKey = null;
    while (true) {
      let query = ref.orderByKey().limitToFirst(pageSize);
      if (lastKey) {
        query = query.startAfter(lastKey);
      }

      const snapshot = await query.once("value");
      const data = [];
      snapshot.forEach((childSnapshot) => {
        data.push({ name: childSnapshot.val().name });
        lastKey = childSnapshot.key;
      });

      allData = allData.concat(data);

      console.log(`Firebase: Fetched ${allData.length} records`);

      if (data.length < pageSize) break;
    }

    const endTime = Date.now();
    console.log(`Firebase fetch time: ${endTime - startTime}ms`);
    console.log(`Firebase fetched data: ${allData.length} records`);
    res.json({ count: allData.length, time: endTime - startTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server and run the warm-up query
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await warmUpSupabase();
});
