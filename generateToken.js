const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function generateToken(uid) {
  try {
    const token = await admin.auth().createCustomToken(uid);
    console.log('Generated Token:', token);
  } catch (error) {
    console.error('Error generating token:', error);
  }
}

// Replace 'test-user-id' with the user ID you want to generate a token for
generateToken('<actual-user-id>');