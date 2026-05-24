"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRaceWeekendAlert = sendRaceWeekendAlert;
exports.startF1Scheduler = startF1Scheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const PushSubscription_1 = __importDefault(require("../models/PushSubscription"));
const webpush_1 = require("./webpush");
// 2026 F1 race dates (race Sunday, ISO format)
const F1_2026_RACES = [
    { name: 'Australian GP', flag: '🇦🇺', date: '2026-03-08' },
    { name: 'Chinese GP', flag: '🇨🇳', date: '2026-03-15' },
    { name: 'Japanese GP', flag: '🇯🇵', date: '2026-03-29' },
    { name: 'Miami GP', flag: '🇺🇸', date: '2026-05-03' },
    { name: 'Canadian GP', flag: '🇨🇦', date: '2026-05-24' },
    { name: 'Monaco GP', flag: '🇲🇨', date: '2026-06-07' },
    { name: 'Barcelona-Catalunya GP', flag: '🇪🇸', date: '2026-06-14' },
    { name: 'Austrian GP', flag: '🇦🇹', date: '2026-06-28' },
    { name: 'British GP', flag: '🇬🇧', date: '2026-07-05' },
    { name: 'Belgian GP', flag: '🇧🇪', date: '2026-07-19' },
    { name: 'Hungarian GP', flag: '🇭🇺', date: '2026-07-26' },
    { name: 'Dutch GP', flag: '🇳🇱', date: '2026-08-23' },
    { name: 'Italian GP', flag: '🇮🇹', date: '2026-09-06' },
    { name: 'Spanish GP — Madrid', flag: '🇪🇸', date: '2026-09-13' },
    { name: 'Azerbaijan GP', flag: '🇦🇿', date: '2026-09-26' },
    { name: 'Singapore GP', flag: '🇸🇬', date: '2026-10-11' },
    { name: 'United States GP', flag: '🇺🇸', date: '2026-10-25' },
    { name: 'Mexico City GP', flag: '🇲🇽', date: '2026-11-01' },
    { name: 'São Paulo GP', flag: '🇧🇷', date: '2026-11-08' },
    { name: 'Las Vegas GP', flag: '🇺🇸', date: '2026-11-21' },
    { name: 'Qatar GP', flag: '🇶🇦', date: '2026-11-29' },
    { name: 'Abu Dhabi GP', flag: '🇦🇪', date: '2026-12-06' },
];
// Returns the race happening this weekend (Mon–Sun window), if any
function getRaceThisWeekend() {
    const now = new Date();
    // Start of current Monday
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    // End of current Sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return (F1_2026_RACES.find((race) => {
        const d = new Date(race.date);
        return d >= monday && d <= sunday;
    }) ?? null);
}
async function sendRaceWeekendAlert() {
    const race = getRaceThisWeekend();
    if (!race)
        return;
    const subscriptions = await PushSubscription_1.default.find({}).lean();
    if (subscriptions.length === 0)
        return;
    console.log(`🏎 Sending race weekend alert: ${race.name} to ${subscriptions.length} subscribers`);
    await (0, webpush_1.sendToAll)(subscriptions.map((s) => ({
        id: String(s._id),
        endpoint: s.endpoint,
        keys: s.keys,
    })), {
        title: `Race weekend! ${race.flag}`,
        body: `${race.name} is this weekend. Lights out! 🏎`,
        icon: '/icons/icon-192.png',
        url: '/f1',
    }, async (expiredId) => {
        await PushSubscription_1.default.findByIdAndDelete(expiredId);
        console.log(`🗑 Removed expired subscription: ${expiredId}`);
    });
}
// Runs every Monday at 09:00
function startF1Scheduler() {
    if (!process.env.VAPID_PUBLIC_KEY) {
        console.warn('⚠️  VAPID not configured — F1 scheduler disabled');
        return;
    }
    node_cron_1.default.schedule('0 9 * * 1', () => {
        sendRaceWeekendAlert().catch(console.error);
    }, { timezone: 'Europe/Kyiv' });
    console.log('🏎 F1 race weekend scheduler started (Mon 09:00 Kyiv time)');
}
