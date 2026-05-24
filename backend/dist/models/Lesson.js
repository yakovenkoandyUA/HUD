"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    title: { type: String, required: true },
    desc: { type: String, default: '' },
    status: { type: String, enum: ['planned', 'done', 'draft'], default: 'planned' },
    sessionNotes: { type: String, default: '' },
    homework: { type: String, default: '' },
    date: { type: String, default: '' },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Lesson', schema);
