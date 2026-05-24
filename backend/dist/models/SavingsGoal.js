"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    title: { type: String, required: true },
    emoji: { type: String, default: '🎯' },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    deadline: { type: String, default: '' },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('SavingsGoal', schema);
