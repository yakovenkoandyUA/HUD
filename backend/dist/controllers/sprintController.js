"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasks = getTasks;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.removeTask = removeTask;
exports.getTodos = getTodos;
exports.createTodo = createTodo;
exports.updateTodo = updateTodo;
exports.removeTodo = removeTodo;
const SprintTask_1 = __importDefault(require("../models/SprintTask"));
const TodoItem_1 = __importDefault(require("../models/TodoItem"));
async function getTasks(req, res) {
    const { week, year } = req.query;
    const filter = { userId: req.userId };
    if (week)
        filter.weekNumber = Number(week);
    if (year)
        filter.year = Number(year);
    const items = await SprintTask_1.default.find(filter).sort({ createdAt: 1 });
    res.json(items);
}
async function createTask(req, res) {
    const item = await SprintTask_1.default.create({ ...req.body, userId: req.userId });
    res.status(201).json(item);
}
async function updateTask(req, res) {
    const item = await SprintTask_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
}
async function removeTask(req, res) {
    await SprintTask_1.default.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.status(204).end();
}
async function getTodos(req, res) {
    const items = await TodoItem_1.default.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json(items);
}
async function createTodo(req, res) {
    const item = await TodoItem_1.default.create({ ...req.body, userId: req.userId });
    res.status(201).json(item);
}
async function updateTodo(req, res) {
    const item = await TodoItem_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(item);
}
async function removeTodo(req, res) {
    await TodoItem_1.default.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.status(204).end();
}
