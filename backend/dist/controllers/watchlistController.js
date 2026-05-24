"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = getAll;
exports.create = create;
exports.update = update;
exports.remove = remove;
const WatchlistItem_1 = __importDefault(require("../models/WatchlistItem"));
async function getAll(req, res) {
    const { category, status } = req.query;
    const query = { userId: req.userId };
    if (category)
        query.category = category;
    if (status)
        query.status = status;
    const items = await WatchlistItem_1.default.find(query).sort({ addedAt: -1 });
    res.json(items);
}
async function create(req, res) {
    const { tmdbId, category } = req.body;
    // Duplicate check for items that have a real TMDB/external id
    if (tmdbId && tmdbId !== 0) {
        const existing = await WatchlistItem_1.default.findOne({ tmdbId, category, userId: req.userId });
        if (existing) {
            res.status(409).json({ error: 'Already in watchlist', id: existing._id });
            return;
        }
    }
    const item = await WatchlistItem_1.default.create({ ...req.body, userId: req.userId });
    res.status(201).json(item);
}
async function update(req, res) {
    const item = await WatchlistItem_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
}
async function remove(req, res) {
    await WatchlistItem_1.default.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.status(204).end();
}
