"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const webpush_1 = require("./services/webpush");
const f1Scheduler_1 = require("./services/f1Scheduler");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const sprint_1 = __importDefault(require("./routes/sprint"));
const lessons_1 = __importDefault(require("./routes/lessons"));
const recipes_1 = __importDefault(require("./routes/recipes"));
const watchlist_1 = __importDefault(require("./routes/watchlist"));
const goals_1 = __importDefault(require("./routes/goals"));
const push_1 = __importDefault(require("./routes/push"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 8080;
// CORS fix v2
app.use((0, cors_1.default)());
// app.options('*', cors())
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/sprint', sprint_1.default);
app.use('/api/lessons', lessons_1.default);
app.use('/api/recipes', recipes_1.default);
app.use('/api/watchlist', watchlist_1.default);
app.use('/api/goals', goals_1.default);
app.use('/api/push', push_1.default);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use(errorHandler_1.errorHandler);
async function start() {
    await (0, db_1.connectDB)();
    (0, webpush_1.initWebPush)();
    (0, f1Scheduler_1.startF1Scheduler)();
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}
start();
