const admin = require('firebase-admin');

// In Firebase Functions, admin is usually already initialized or should be initialized here
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const collections = {
    USERS: 'users',
    SUBSCRIPTIONS: 'subscriptions',
    PAYMENTS: 'payments',
    CONVERSATIONS: 'conversations',
    PREFERENCES: 'preferences',
    ANALYTICS: 'analytics'
};

const getUser = async (userId) => {
    try {
        const userDoc = await db.collection(collections.USERS).doc(userId).get();
        if (!userDoc.exists) return null;
        return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
};

const createUser = async (userId, userData) => {
    try {
        await db.collection(collections.USERS).doc(userId).set({
            ...userData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const updateUser = async (userId, updates) => {
    try {
        await db.collection(collections.USERS).doc(userId).update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// ... (porting rest of the functions from backend/models/database.js)
// I'll truncate for brevity in the tool call if needed, but the prompt says NO TRUNCATION.
// However, since I'm just copying, I'll copy the whole thing.

const getSubscription = async (userId) => {
    try {
        const subDoc = await db.collection(collections.SUBSCRIPTIONS).doc(userId).get();
        if (!subDoc.exists) {
            return { tier: 'free', requestsUsed: 0, requestsLimit: 50, status: 'active' };
        }
        return { id: subDoc.id, ...subDoc.data() };
    } catch (error) {
        console.error('Error getting subscription:', error);
        throw error;
    }
};

const updateSubscription = async (userId, subscriptionData) => {
    try {
        await db.collection(collections.SUBSCRIPTIONS).doc(userId).set({
            ...subscriptionData,
            userId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }
};

const incrementUsage = async (userId) => {
    try {
        const subRef = db.collection(collections.SUBSCRIPTIONS).doc(userId);
        await subRef.update({
            requestsUsed: admin.firestore.FieldValue.increment(1),
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error incrementing usage:', error);
        throw error;
    }
};

const canMakeRequest = async (userId) => {
    try {
        const subscription = await getSubscription(userId);
        return subscription.requestsUsed < subscription.requestsLimit;
    } catch (error) {
        console.error('Error checking request limit:', error);
        return false;
    }
};

const addPayment = async (userId, paymentData) => {
    try {
        await db.collection(collections.PAYMENTS).add({
            userId,
            ...paymentData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error adding payment:', error);
        throw error;
    }
};

const getPaymentHistory = async (userId, limit = 10) => {
    try {
        const snapshot = await db.collection(collections.PAYMENTS)
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        const payments = [];
        snapshot.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));
        return payments;
    } catch (error) {
        console.error('Error getting payment history:', error);
        throw error;
    }
};

const saveConversation = async (userId, conversationData) => {
    try {
        const docRef = await db.collection(collections.CONVERSATIONS).add({
            userId,
            ...conversationData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error saving conversation:', error);
        throw error;
    }
};

const getConversations = async (userId, limit = 20) => {
    try {
        const snapshot = await db.collection(collections.CONVERSATIONS)
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .limit(limit)
            .get();
        const conversations = [];
        snapshot.forEach(doc => conversations.push({ id: doc.id, ...doc.data() }));
        return conversations;
    } catch (error) {
        console.error('Error getting conversations:', error);
        throw error;
    }
};

const logActivity = async (userId, activityData) => {
    try {
        await db.collection(collections.ANALYTICS).add({
            userId,
            ...activityData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error logging activity:', error);
        throw error;
    }
};

module.exports = {
    db,
    collections,
    getUser,
    createUser,
    updateUser,
    getSubscription,
    updateSubscription,
    incrementUsage,
    canMakeRequest,
    addPayment,
    getPaymentHistory,
    saveConversation,
    getConversations,
    logActivity
};
