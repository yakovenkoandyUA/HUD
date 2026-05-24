"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const PushSubscription_1 = __importDefault(require("../models/PushSubscription"));
const webpush_1 = require("../services/webpush");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// POST /api/push/subscribe
router.post('/subscribe', async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({ error: 'Invalid subscription object' });
        return;
    }
    await PushSubscription_1.default.findOneAndUpdate({ endpoint }, { endpoint, keys, userId: req.userId }, { upsert: true, new: true });
    res.json({ success: true });
});
// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
    await PushSubscription_1.default.deleteOne({ endpoint, userId: req.userId });
    res.json({ success: true });
});
// POST /api/push/test
router.post('/test', async (req, res) => {
    const sub = await PushSubscription_1.default.findOne({ userId: req.userId });
    if (!sub) {
        res.status(404).json({ error: 'No subscription found for this user' });
        return;
    }
    try {
        await (0, webpush_1.sendNotification)({ endpoint: sub.endpoint, keys: sub.keys }, { title: 'HUD Test 🏎', body: 'Push notifications work!', url: '/f1' });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Failed to send notification' });
    }
});
exports.default = router;
