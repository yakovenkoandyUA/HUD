"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: String, auth: String },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('PushSubscription', schema);
