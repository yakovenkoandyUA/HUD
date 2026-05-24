"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    title: { type: String, required: true },
    ingredients: { type: [String], default: [] },
    steps: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    isPersonal: { type: Boolean, default: true },
    userId: { type: String, required: true, index: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Recipe', schema);
