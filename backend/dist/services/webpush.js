"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebPush = initWebPush;
exports.sendNotification = sendNotification;
exports.sendToAll = sendToAll;
const web_push_1 = __importDefault(require("web-push"));
function initWebPush() {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:admin@hud.app';
    if (!pub || !priv) {
        console.warn('⚠️  VAPID keys not set — push notifications disabled');
        return;
    }
    web_push_1.default.setVapidDetails(email, pub, priv);
    console.log('✅ Web Push initialized');
}
async function sendNotification(subscription, payload) {
    try {
        return await web_push_1.default.sendNotification(subscription, JSON.stringify(payload));
    }
    catch (err) {
        const status = err.statusCode;
        if (status === 410 || status === 404) {
            // Subscription expired — caller should delete it from DB
            throw Object.assign(new Error('Subscription gone'), { expired: true });
        }
        console.error('Push send error:', err);
        return null;
    }
}
async function sendToAll(subscriptions, payload, onExpired) {
    await Promise.allSettled(subscriptions.map(async (sub) => {
        try {
            await sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        }
        catch (err) {
            if (err.expired && onExpired) {
                await onExpired(sub.id);
            }
        }
    }));
}
