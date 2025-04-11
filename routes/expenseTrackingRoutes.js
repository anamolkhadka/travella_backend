import express from 'express';
import { db } from '../db/firebase.js';

const router = express.Router();

// Create a new expense
router.post('/', async (req, res) => {
    try {
        const { userId, amount, category, vendor } = req.body;

        // Validate input data
        if (!userId || !amount || !category || !vendor) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // e.g., "2025-04-10"

        // Create a new expense document in Firestore
        const expenseRef = await db.collection('expenses').add({
            userId,
            amount,
            category,
            vendor,
            date: formattedDate, // Ensure date is stored as a Date object
        });

        res.status(201).json({ id: expenseRef.id });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all expenses for a user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const expensesSnapshot = await db
            .collection('expenses')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .get();

        if (expensesSnapshot.empty) {
            return res.status(200).json([]);
        }

        const expenses = expensesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Filter expenses by amount, category, vendor, or date
router.post('/filter', async (req, res) => {
    try {
        const { userId, amount, category, vendor, date } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        let query = db.collection('expenses').where('userId', '==', userId);

        if (amount) query = query.where('amount', '==', amount);
        if (category) query = query.where('category', '==', category);
        if (vendor) query = query.where('vendor', '==', vendor);
        if (date) query = query.where('date', '==', date); // format must match stored format

        const snapshot = await query.get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const filteredExpenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json(filteredExpenses);
    } catch (error) {
        console.error('Error filtering expenses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;