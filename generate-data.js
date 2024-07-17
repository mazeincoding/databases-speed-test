// This script generates 100,000 users and writes them to Firebase and Supabase
const { createClient } = require("@supabase/supabase-js");
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

// Initialize Supabase client
const supabaseUrl = "SUPABASE_URL";
const supabaseKey = "SUPABASE_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "FIREBASE_DATABASE_URL",
});

// prettier-ignore
const allSkills = ["HTML", "CSS", "JavaScript", "Python", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin",
                   "React", "Angular", "Vue.js", "Node.js", "Express", "Django", "Flask", "Spring",
                   "MongoDB", "PostgreSQL", "MySQL", "Redis", "Docker", "Kubernetes", "AWS", "Azure",
                   "GCP", "Git", "CI/CD", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy"];

function generateUser(id) {
  const firstName = `User${id}`;
  const lastName = `Lastname${id}`;
  return {
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    bio: `I am user number ${id} with a passion for technology and innovation.`,
    skills: Array.from(
      { length: Math.floor(Math.random() * 6) + 3 },
      () => allSkills[Math.floor(Math.random() * allSkills.length)]
    ),
  };
}

// Generate users
const users = Array.from({ length: 100000 }, (_, i) => generateUser(i + 1));

async function writeToFirebase(users) {
  const db = admin.database();
  const ref = db.ref("users");
  const chunkSize = 10000;

  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    await ref.update(
      chunk.reduce((acc, user, index) => {
        acc[i + index] = user;
        return acc;
      }, {})
    );
    console.log(
      `Firebase: Wrote chunk ${i / chunkSize + 1} of ${Math.ceil(
        users.length / chunkSize
      )}`
    );
  }
  console.log("Data written to Firebase");
}

async function writeToSupabase(users) {
  const chunkSize = 1000;
  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("users").insert(chunk);
    if (error) throw error;
    console.log(
      `Supabase: Wrote chunk ${i / chunkSize + 1} of ${Math.ceil(
        users.length / chunkSize
      )}`
    );
  }
  console.log("Data written to Supabase");
}

// Main function to generate and write data
async function generateAndWriteData() {
  try {
    console.log("Starting data generation and writing process...");
    await writeToFirebase(users);
    await writeToSupabase(users);
    console.log("Data generation and writing process completed successfully.");
  } catch (error) {
    console.error("Error during data generation and writing:", error);
  } finally {
    await admin.app().delete();
  }
}

generateAndWriteData();
