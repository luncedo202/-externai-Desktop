import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import FirebaseService from './FirebaseService';

const db = FirebaseService.db;

// ==================== USER MANAGEMENT ====================

/**
 * Create or update user profile in database
 */
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user profile from database
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: userSnap.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SUBSCRIPTION MANAGEMENT ====================

/**
 * Create or update user subscription
 */
export const updateSubscription = async (userId, subscriptionData) => {
  try {
    const subRef = doc(db, 'subscriptions', userId);
    await setDoc(subRef, {
      ...subscriptionData,
      userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user subscription details
 */
export const getSubscription = async (userId) => {
  try {
    const subRef = doc(db, 'subscriptions', userId);
    const subSnap = await getDoc(subRef);
    
    if (subSnap.exists()) {
      return { success: true, data: subSnap.data() };
    } else {
      // Return free tier if no subscription found
      return { 
        success: true, 
        data: { 
          tier: 'free',
          requestsUsed: 0,
          requestsLimit: 50,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        } 
      };
    }
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Increment API usage counter
 */
export const incrementUsage = async (userId) => {
  try {
    const subRef = doc(db, 'subscriptions', userId);
    const subSnap = await getDoc(subRef);
    
    if (subSnap.exists()) {
      const currentData = subSnap.data();
      await updateDoc(subRef, {
        requestsUsed: (currentData.requestsUsed || 0) + 1,
        lastUsed: serverTimestamp()
      });
    } else {
      // Create initial subscription record
      await setDoc(subRef, {
        userId,
        tier: 'free',
        requestsUsed: 1,
        requestsLimit: 50,
        lastUsed: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PAYMENT HISTORY ====================

/**
 * Add payment record
 */
export const addPayment = async (userId, paymentData) => {
  try {
    const paymentsRef = collection(db, 'payments');
    await addDoc(paymentsRef, {
      userId,
      ...paymentData,
      timestamp: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user payment history
 */
export const getPaymentHistory = async (userId, limitCount = 10) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting payment history:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CONVERSATION HISTORY ====================

/**
 * Save conversation to database
 */
export const saveConversation = async (userId, conversationData) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const docRef = await addDoc(conversationsRef, {
      userId,
      ...conversationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update existing conversation
 */
export const updateConversation = async (conversationId, updates) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating conversation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user conversations
 */
export const getConversations = async (userId, limitCount = 20) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const conversations = [];
    querySnapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: conversations };
  } catch (error) {
    console.error('Error getting conversations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete conversation
 */
export const deleteConversation = async (conversationId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: error.message };
  }
};

// ==================== USER PREFERENCES ====================

/**
 * Save user preferences
 */
export const savePreferences = async (userId, preferences) => {
  try {
    const prefsRef = doc(db, 'preferences', userId);
    await setDoc(prefsRef, {
      userId,
      ...preferences,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving preferences:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user preferences
 */
export const getPreferences = async (userId) => {
  try {
    const prefsRef = doc(db, 'preferences', userId);
    const prefsSnap = await getDoc(prefsRef);
    
    if (prefsSnap.exists()) {
      return { success: true, data: prefsSnap.data() };
    } else {
      return { success: true, data: {} };
    }
  } catch (error) {
    console.error('Error getting preferences:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ANALYTICS ====================

/**
 * Log user activity
 */
export const logActivity = async (userId, activityData) => {
  try {
    const analyticsRef = collection(db, 'analytics');
    await addDoc(analyticsRef, {
      userId,
      ...activityData,
      timestamp: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, error: error.message };
  }
};

export default {
  // User Management
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  
  // Subscription Management
  updateSubscription,
  getSubscription,
  incrementUsage,
  
  // Payment History
  addPayment,
  getPaymentHistory,
  
  // Conversation History
  saveConversation,
  updateConversation,
  getConversations,
  deleteConversation,
  
  // User Preferences
  savePreferences,
  getPreferences,
  
  // Analytics
  logActivity
};
