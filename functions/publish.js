const functions = require('firebase-functions');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Defer storage bucket initialization to avoid issues during deployment
let storageBucket = null;
const getStorageBucket = () => {
  if (!storageBucket) {
    storageBucket = admin.storage().bucket();
  }
  return storageBucket;
};

// MIME type mapping
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

/**
 * Serve published apps from Firebase Storage
 * URL format: https://your-project.web.app/app/{appId} or https://your-project.web.app/app/{appId}/path/to/file
 */
exports.serveApp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  try {
    // Parse URL: /app/{appId} or /app/{appId}/path/to/file
    const urlParts = req.path.split('/').filter(Boolean);
    
    if (urlParts.length < 2 || urlParts[0] !== 'app') {
      return res.redirect('/');
    }

    const appId = urlParts[1];
    const filePath = urlParts.slice(2).join('/') || 'index.html';

    // Get app metadata from Firestore
    const appDoc = await db.collection('published_apps').doc(appId).get();
    
    if (!appDoc.exists) {
      return sendNotFound(res, appId);
    }

    const appData = appDoc.data();
    
    if (appData.status !== 'live') {
      return sendNotFound(res, appId);
    }

    // Try to get the file from Firebase Storage
    const storagePath = `published_apps/${appId}/${filePath}`;
    const file = getStorageBucket().file(storagePath);
    
    const [exists] = await file.exists();
    
    if (!exists) {
      // Try index.html for SPA routing
      const indexPath = `published_apps/${appId}/index.html`;
      const indexFile = getStorageBucket().file(indexPath);
      const [indexExists] = await indexFile.exists();
      
      if (indexExists) {
        return serveFile(res, indexFile, 'index.html', appId);
      }
      
      return res.status(404).send('File not found');
    }

    return serveFile(res, file, filePath, appId);

  } catch (error) {
    console.error('Error serving app:', error);
    return res.status(500).send('Internal server error');
  }
});

async function serveFile(res, file, filePath, appId) {
  try {
    const [content] = await file.download();
    
    // Set content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.set('X-Powered-By', 'ExternAI');
    
    // Track visit for index.html
    if (filePath === 'index.html' || filePath.endsWith('/index.html')) {
      db.collection('published_apps').doc(appId).update({
        visits: admin.firestore.FieldValue.increment(1),
        lastVisitedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => {}); // Ignore errors
    }
    
    return res.send(content);
  } catch (error) {
    console.error('Error serving file:', error);
    return res.status(500).send('Error serving file');
  }
}

function sendNotFound(res, appId) {
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>App Not Found</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container { text-align: center; padding: 40px; }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        p { opacity: 0.7; margin-bottom: 2rem; }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>App Not Found</h1>
        <p>This app may have been unpublished or doesn't exist.</p>
        <a href="https://externai.dev">Create your own app with ExternAI →</a>
      </div>
    </body>
    </html>
  `);
}

/**
 * API endpoint to publish an app
 */
exports.publishApp = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { projectName, files, buildOutput } = data;

  if (!files || Object.keys(files).length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'No files provided');
  }

  // Sanitize project name for URL
  const sanitizedProjectName = (projectName || 'my-app')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 20);

  // Check if user already has this project published
  const existingApps = await db.collection('published_apps')
    .where('userId', '==', userId)
    .where('projectName', '==', sanitizedProjectName)
    .limit(1)
    .get();

  let appId;
  let isUpdate = false;

  if (!existingApps.empty) {
    appId = existingApps.docs[0].id;
    isUpdate = true;
    
    // Delete old files from Storage
    const [oldFiles] = await getStorageBucket().getFiles({ prefix: `published_apps/${appId}/` });
    await Promise.all(oldFiles.map(file => file.delete().catch(() => {})));
  } else {
    // Generate new app ID
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    appId = `${sanitizedProjectName}-${randomSuffix}`;
  }

  // Upload files to Firebase Storage
  const uploadPromises = Object.entries(files).map(async ([filePath, base64Content]) => {
    const storagePath = `published_apps/${appId}/${filePath}`;
    const file = getStorageBucket().file(storagePath);
    
    // Decode base64 content
    const content = Buffer.from(base64Content, 'base64');
    
    await file.save(content, {
      metadata: {
        contentType: mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
      }
    });
  });

  await Promise.all(uploadPromises);

  // Update Firestore metadata
  const appData = {
    appId,
    userId,
    projectName: sanitizedProjectName,
    displayName: projectName || 'My App',
    buildOutput: buildOutput || '',
    fileCount: Object.keys(files).length,
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'live',
  };

  if (isUpdate) {
    await db.collection('published_apps').doc(appId).update(appData);
  } else {
    appData.visits = 0;
    appData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('published_apps').doc(appId).set(appData);
  }

  // Generate the public URL
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const publicUrl = `https://${projectId}.web.app/app/${appId}`;

  return {
    success: true,
    appId,
    url: publicUrl,
    isUpdate,
    message: isUpdate
      ? `Your app has been updated! Share this link: ${publicUrl}`
      : `Your app is now live! Share this link: ${publicUrl}`
  };
});

/**
 * API endpoint to get user's published apps
 */
exports.getMyApps = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

  const apps = await db.collection('published_apps')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .get();

  const appList = apps.docs.map(doc => {
    const data = doc.data();
    return {
      appId: doc.id,
      displayName: data.displayName,
      projectName: data.projectName,
      url: `https://${projectId}.web.app/app/${doc.id}`,
      status: data.status,
      visits: data.visits || 0,
      fileCount: data.fileCount || 0,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };
  });

  return { apps: appList };
});

/**
 * API endpoint to unpublish/delete an app
 */
exports.unpublishApp = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { appId } = data;
  const userId = context.auth.uid;

  const appDoc = await db.collection('published_apps').doc(appId).get();

  if (!appDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'App not found');
  }

  if (appDoc.data().userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this app');
  }

  // Delete files from Storage
  const [files] = await getStorageBucket().getFiles({ prefix: `published_apps/${appId}/` });
  await Promise.all(files.map(file => file.delete().catch(() => {})));

  // Delete Firestore document
  await db.collection('published_apps').doc(appId).delete();

  return { success: true, message: 'App unpublished successfully' };
});
