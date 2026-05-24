"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.verify = verify;
exports.me = me;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function login(req, res) {
    const { password } = req.body;
    if (!password) {
        res.status(400).json({ error: 'Password required' });
        return;
    }
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
        res.status(500).json({ error: 'Server not configured' });
        return;
    }
    const match = await bcrypt_1.default.compare(password, hash);
    if (!match) {
        res.status(401).json({ error: 'Invalid password' });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ userId: 'admin' }, process.env.JWT_SECRET, { expiresIn: '365d' });
    res.json({ token });
}
function verify(req, res) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ valid: false });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(header.slice(7), process.env.JWT_SECRET);
        res.json({ valid: true, userId: payload.userId });
    }
    catch {
        res.status(401).json({ valid: false });
    }
}
function me(req, res) {
    res.json({ userId: req.userId });
}
