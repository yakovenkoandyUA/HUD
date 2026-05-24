"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    title: { type: String, required: true },
    tag: { type: String, default: '' },
    done: { type: Boolean, default: false },
    weekNumber: { type: Number, required: true },
    year: { type: Number, required: true },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('SprintTask', schema);
