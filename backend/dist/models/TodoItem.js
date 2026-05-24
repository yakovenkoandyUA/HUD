"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    title: { type: String, required: true },
    priority: { type: String, enum: ['urgent', 'normal', 'low'], default: 'normal' },
    done: { type: Boolean, default: false },
    dueDate: { type: String, default: '' },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('TodoItem', schema);
