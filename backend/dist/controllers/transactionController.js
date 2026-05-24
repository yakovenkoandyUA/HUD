"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = getAll;
exports.getStats = getStats;
exports.create = create;
exports.update = update;
exports.remove = remove;
const Transaction_1 = __importDefault(require("../models/Transaction"));
async function getAll(req, res) {
    const { month } = req.query;
    const query = { userId: req.userId };
    if (month)
        query.date = { $regex: `^${month}` };
    const items = await Transaction_1.default.find(query).sort({ date: -1 }).limit(1000);
    res.json(items);
}
async function getStats(req, res) {
    const { month } = req.query;
    const query = { userId: req.userId };
    if (month)
        query.date = { $regex: `^${month}` };
    const items = await Transaction_1.default.find(query);
    const totalIncome = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const catMap = new Map();
    items
        .filter(t => t.type === 'expense' && t.category)
        .forEach(t => catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount));
    const byCategory = Array.from(catMap.entries()).map(([category, amount]) => ({ category, amount }));
    res.json({ totalIncome, totalExpense, byCategory });
}
async function create(req, res) {
    const item = await Transaction_1.default.create({ ...req.body, userId: req.userId });
    res.status(201).json(item);
}
async function update(req, res) {
    const item = await Transaction_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
}
async function remove(req, res) {
    await Transaction_1.default.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.status(204).end();
}
