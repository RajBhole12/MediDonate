const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://admin:admin123@medidonate-cluster.c4avn8r.mongodb.net/medidonate";

mongoose.connect(MONGO_URI, {
  // These options prevent deprecation warnings and ensure stable Atlas connections
  serverSelectionTimeoutMS: 5000,   // fail fast if Atlas unreachable
  socketTimeoutMS: 45000,           // close sockets after 45s of inactivity
})
  .then(() => console.log("✅ MongoDB Connected to Atlas"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1); // crash early so you know immediately if DB is down
  });

// Log if connection drops mid-run
mongoose.connection.on('disconnected', () => {
  console.warn("⚠️  MongoDB disconnected");
});

module.exports = mongoose;
