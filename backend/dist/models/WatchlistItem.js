"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    tmdbId: { type: Number, default: 0 },
    title: { type: String, required: true },
    originalTitle: { type: String, default: '' },
    category: { type: String, enum: ['movie', 'series', 'anime', 'book'], required: true },
    status: { type: String, enum: ['want', 'watching', 'watched', 'dropped'], default: 'want' },
    posterPath: { type: String, default: '' },
    backdropPath: { type: String, default: '' },
    overview: { type: String, default: '' },
    year: { type: String, default: '' },
    genres: { type: [String], default: [] },
    rating: { type: Number, default: null },
    seasonReminder: { type: Boolean, default: false },
    reminderDate: { type: String, default: '' },
    authors: { type: [String], default: [] },
    pageCount: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' },
    userId: { type: String, required: true, index: true },
    addedAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });
schema.index({ userId: 1, category: 1 });
exports.default = (0, mongoose_1.model)('WatchlistItem', schema);
