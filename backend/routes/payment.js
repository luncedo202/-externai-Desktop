const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Helper to generate PayFast signature
function generatePayFastSignature(data, passphrase) {
    let queryString = '';
    Object.keys(data).forEach((key) => {
        if (data[key] !== '' && key !== 'signature') {
            queryString += `${key}=${encodeURIComponent(data[key].toString().trim()).replace(/%20/g, '+')}&`;
        }
    });

    queryString = queryString.slice(0, -1);
    if (passphrase) {
        queryString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
    }

    return crypto.createHash('md5').update(queryString).digest('hex');
}

// Initiate Payment
router.post('/initiate', authenticateToken, async (req, res) => {
    try {
        const { planId, amount, itemName } = req.body;
        const userId = req.userId;
        const userEmail = req.userEmail;

        const merchantId = process.env.PAYFAST_MERCHANT_ID;
        const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
        const saltPassphrase = process.env.PAYFAST_SALT_PASSPHRASE;
        const sandbox = process.env.PAYFAST_SANDBOX === 'true';

        const baseUrl = sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';

        // PayFast Data
        const payfastData = {
            merchant_id: merchantId,
            merchant_key: merchantKey,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel`,
            notify_url: `${process.env.BACKEND_URL}/api/payment/notify`,
            name_first: userEmail.split('@')[0],
            email_address: userEmail,
            m_payment_id: `${userId}_${Date.now()}`,
            amount: amount.toFixed(2),
            item_name: itemName,
            custom_str1: userId,
            custom_str2: planId
        };

        payfastData.signature = generatePayFastSignature(payfastData, saltPassphrase);

        res.json({
            url: baseUrl,
            data: payfastData
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

// PayFast ITN (Instant Transaction Notification)
router.post('/notify', async (req, res) => {
    try {
        const pfData = req.body;

        // 1. Verify Signature (Simplified for testing)
        const saltPassphrase = process.env.PAYFAST_SALT_PASSPHRASE;
        const generatedSignature = generatePayFastSignature(pfData, saltPassphrase);

        if (pfData.signature !== generatedSignature) {
            console.error('Invalid PayFast signature');
            return res.status(400).send('Invalid signature');
        }

        // 2. Check payment status
        if (pfData.payment_status === 'COMPLETE') {
            const userId = pfData.custom_str1;
            const planId = pfData.custom_str2;

            console.log(`[Payment] Successful payment for user ${userId}, plan ${planId}`);

            // NOTE: As requested, we are NOT actually granting prompts yet, just logging.
            // In a real scenario, you would update Firestore here.
            await db.collection('payments').add({
                userId,
                planId,
                amount: pfData.amount_gross,
                pfPaymentId: pfData.pf_payment_id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'COMPLETE',
                testOnly: true
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('PayFast notification error:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;
