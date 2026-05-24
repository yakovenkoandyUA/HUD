"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = getAll;
exports.create = create;
exports.update = update;
exports.remove = remove;
const Lesson_1 = __importDefault(require("../models/Lesson"));
async function getAll(req, res) {
    const items = await Lesson_1.default.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(items);
}
async function create(req, res) {
    const item = await Lesson_1.default.create({ ...req.body, userId: req.userId });
    res.status(201).json(item);
}
async function update(req, res) {
    const item = await Lesson_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
}
async function remove(req, res) {
    await Lesson_1.default.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.status(204).end();
}
