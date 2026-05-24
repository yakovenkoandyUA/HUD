"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    desc: { type: String, default: '' },
    category: { type: String, default: '' },
    date: { type: String, required: true },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
schema.index({ userId: 1, date: -1 });
exports.default = (0, mongoose_1.model)('Transaction', schema);
