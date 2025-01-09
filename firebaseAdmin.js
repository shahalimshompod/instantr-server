const admin = require("firebase-admin");
const serviceAccount = require("./instant-r-firebase-adminsdk-fu6rl-c0c9f803a2.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
