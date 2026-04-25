"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var cloud = require("wx-server-sdk");
var base_1 = require("./base");
var learningData_1 = require("../model/learningData");
var combatRecord_1 = require("../model/combatRecord");
var learningRecord_1 = require("../model/learningRecord");
var wordMastery_1 = require("../model/wordMastery");
var learningPlan_1 = require("../model/learningPlan");

var getDb = function () { return cloud.database(); };

var normalizeDate = function (date) {
    var d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

var calcMasteryScore = function (wrongCount, totalCount, tipCount, avgResponseTime) {
    var wrongRate = totalCount > 0 ? wrongCount / totalCount : 0;
    var tipRate = totalCount > 0 ? tipCount / totalCount : 0;
    var responsePenalty = Math.min(1, (avgResponseTime || 0) / 5000);
    var score = 1 - (wrongRate * 0.6 + tipRate * 0.3 + responsePenalty * 0.1);
    if (score < 0)
        return 0;
    if (score > 1)
        return 1;
    return Number(score.toFixed(4));
};

var upsertWordMastery = async function (bookId, word) {
    var masteryModel = new wordMastery_1.default();
    var wordId = word.wordId;
    var responseTime = Number(word.responseTime) || 0;
    var isTip = !!word.isTip;
    var existing = await masteryModel.model.where({
        _openid: masteryModel.openid,
        wordId: wordId
    }).get();
    if (existing.data && existing.data.length > 0) {
        var item = existing.data[0];
        var prevTotal = item.totalCount || 0;
        var totalCount = prevTotal + 1;
        var wrongCount = (item.wrongCount || 0) + 1;
        var tipCount = (item.tipCount || 0) + (isTip ? 1 : 0);
        var avgResponseTime = Math.round(((item.avgResponseTime || 0) * prevTotal + responseTime) / totalCount);
        var masteryScore = calcMasteryScore(wrongCount, totalCount, tipCount, avgResponseTime);
        return masteryModel.model.doc(item._id).update({
            data: {
                wordId: wordId,
                word: word.word || item.word,
                bookId: bookId || item.bookId,
                wrongCount: wrongCount,
                totalCount: totalCount,
                tipCount: tipCount,
                avgResponseTime: avgResponseTime,
                masteryScore: masteryScore,
                lastSeen: new Date(),
                _updateTime: new Date()
            }
        });
    }
    var totalCount = 1;
    var wrongCount = 1;
    var tipCount = isTip ? 1 : 0;
    var avgResponseTime = responseTime;
    var masteryScore = calcMasteryScore(wrongCount, totalCount, tipCount, avgResponseTime);
    return masteryModel.addMastery({
        wordId: wordId,
        word: word.word || '',
        bookId: bookId || '',
        wrongCount: wrongCount,
        totalCount: totalCount,
        tipCount: tipCount,
        avgResponseTime: avgResponseTime,
        masteryScore: masteryScore,
        lastSeen: new Date()
    });
};

var updateWordMasteryFromCombat = async function (bookId, wrongWords) {
    if (!wrongWords || wrongWords.length === 0) {
        return;
    }
    for (var i = 0; i < wrongWords.length; i++) {
        await upsertWordMastery(bookId, wrongWords[i]);
    }
};
var LearningDataController = base_1.default({
    /**
     * 记录对战数据
     */
    recordCombat: async function (_a) {
        var combatId = _a.combatId, combatType = _a.combatType, bookId = _a.bookId, bookName = _a.bookName, isWin = _a.isWin, score = _a.score, opponentScore = _a.opponentScore, totalQuestions = _a.totalQuestions, correctCount = _a.correctCount, wrongCount = _a.wrongCount, tipCount = _a.tipCount, avgResponseTime = _a.avgResponseTime, wrongWords = _a.wrongWords, startTime = _a.startTime, endTime = _a.endTime, duration = _a.duration;
        try {
            console.log('recordCombat 开始,参数:', { combatId: combatId, combatType: combatType, bookId: bookId, isWin: isWin });
            var combatRecordModel = new combatRecord_1.default();
            var combatData = {
                combatId: combatId,
                combatType: combatType,
                bookId: bookId,
                bookName: bookName,
                isWin: isWin,
                score: score,
                opponentScore: opponentScore,
                totalQuestions: totalQuestions,
                correctCount: correctCount,
                wrongCount: wrongCount,
                tipCount: tipCount,
                avgResponseTime: avgResponseTime,
                wrongWords: wrongWords,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                duration: duration
            };
            console.log('准备添加对战记录');
            var addResult = await combatRecordModel.addCombatRecord(combatData);
            console.log('addCombatRecord 返回结果:', addResult);
            console.log('addCombatRecord 调用完成');
            var learningDataModel = new learningData_1.default();
            var correctRate = totalQuestions && totalQuestions > 0 ? correctCount / totalQuestions : 0;
            console.log('计算正确率:', correctCount, '/', totalQuestions, '=', correctRate);
            var upsertResult = await learningDataModel.upsertDaily({
                combatStudyTime: duration,
                combatCount: 1,
                totalWordsCount: totalQuestions,
                correctCount: correctCount,
                wrongCount: wrongCount,
                tipCount: tipCount,
                correctRate: correctRate,
                winCount: isWin ? 1 : 0,
                loseCount: isWin ? 0 : 1,
                avgScore: score,
                newWordsCount: wrongWords.length
            });
            console.log('upsertDaily 返回结果:', upsertResult);
            console.log('upsertDaily 完成');
            try {
                await updateWordMasteryFromCombat(bookId, wrongWords);
            }
            catch (error) {
                console.log('更新掌握度失败', error);
            }
            return this.success(true);
        }
        catch (error_1) {
            console.log('记录对战数据失败', error_1);
            return this.fail("记录对战数据失败,请稍后重试: ".concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1));
        }
    },
    /**
     * 记录词汇学习数据
     */
    recordLearning: async function (_a) {
        var bookId = _a.bookId, bookName = _a.bookName, score = _a.score, maxScore = _a.maxScore, wordsCount = _a.wordsCount, correctCount = _a.correctCount, wrongCount = _a.wrongCount, tipCount = _a.tipCount, reviveUsed = _a.reviveUsed, wrongWords = _a.wrongWords, startTime = _a.startTime, endTime = _a.endTime, duration = _a.duration;
        try {
            var learningRecordModel = new learningRecord_1.default();
            await learningRecordModel.addLearningRecord({
                bookId: bookId,
                bookName: bookName,
                score: score,
                maxScore: maxScore,
                wordsCount: wordsCount,
                correctCount: correctCount,
                wrongCount: wrongCount,
                tipCount: tipCount,
                reviveUsed: reviveUsed,
                wrongWords: wrongWords,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                duration: duration
            });
            var learningDataModel = new learningData_1.default();
            var correctRate = wordsCount && wordsCount > 0 ? correctCount / wordsCount : 0;
            await learningDataModel.upsertDaily({
                learningStudyTime: duration,
                learningCount: 1,
                totalWordsCount: wordsCount,
                correctCount: correctCount,
                wrongCount: wrongCount,
                tipCount: tipCount,
                correctRate: correctRate,
                newWordsCount: wrongWords.length
            });
            return this.success(true);
        }
        catch (error_2) {
            console.log('记录学习数据失败', error_2);
            return this.fail("记录学习数据失败,请稍后重试: ".concat((error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || error_2));
        }
    },
    /**
     * 生成当日学习计划（CDS 自适应调度）
     */
    generateLearningPlan: async function (_a) {
        var date = _a.date, _b = _a.size, size = _b === void 0 ? 20 : _b, bookId = _a.bookId;
        var planDate = normalizeDate(date);
        var planModel = new learningPlan_1.default();
        var masteryModel = new wordMastery_1.default();
        var planSize = Number(size) || 20;
        var weakCount = Math.max(1, Math.round(planSize * 0.5));
        var reinforceCount = Math.max(0, Math.round(planSize * 0.3));
        var newCount = Math.max(0, planSize - weakCount - reinforceCount);
        var masteryWhere = { _openid: masteryModel.openid };
        if (bookId) {
            masteryWhere.bookId = bookId;
        }
        var masteryRes = await masteryModel.model.where(masteryWhere).orderBy('masteryScore', 'asc').limit(500).get();
        var masteryList = masteryRes.data || [];
        var weakList = masteryList.slice(0, weakCount);
        var reinforceList = masteryList.slice(weakCount, weakCount + reinforceCount);
        var selectedIds = weakList.concat(reinforceList).map(function (item) { return item.wordId; }).filter(Boolean);
        var newWords = [];
        if (newCount > 0) {
            var db = getDb();
            var wordWhere = {};
            if (bookId && bookId !== 'random') {
                wordWhere.bookId = bookId;
            }
            var sampleRes = await db.collection('word').aggregate().match(wordWhere).limit(999999).sample({ size: newCount }).end();
            newWords = (sampleRes.list || []).map(function (item) { return item._id; });
        }
        var planWords = selectedIds.concat(newWords).slice(0, planSize);
        var planData = {
            date: planDate,
            bookId: bookId || '',
            words: planWords,
            total: planWords.length,
            source: {
                weak: weakList.map(function (item) { return item.wordId; }),
                reinforce: reinforceList.map(function (item) { return item.wordId; }),
                new: newWords
            }
        };
        var existing = await planModel.model.where({ _openid: planModel.openid, date: planDate, bookId: planData.bookId }).get();
        if (existing.data && existing.data.length > 0) {
            var _id = existing.data[0]._id;
            await planModel.model.doc(_id).update({
                data: __assign(__assign({}, planData), { _updateTime: new Date() })
            });
        }
        else {
            await planModel.addPlan(planData);
        }
        return this.success(planData);
    },
    /**
     * 获取当日学习计划
     */
    getLearningPlan: async function (_a) {
        var date = _a.date, bookId = _a.bookId;
        var planDate = normalizeDate(date);
        var planModel = new learningPlan_1.default();
        var where = { _openid: planModel.openid, date: planDate };
        if (bookId) {
            where.bookId = bookId;
        }
        var data = await planModel.model.where(where).orderBy('_updateTime', 'desc').limit(1).get();
        var plan = data.data && data.data.length > 0 ? data.data[0] : null;
        return this.success(plan);
    },
    /**
     * 获取弱词列表（掌握度最低）
     */
    getWordMasteryTop: async function (_a) {
        var _b = _a.limit, limit = _b === void 0 ? 10 : _b, bookId = _a.bookId;
        var masteryModel = new wordMastery_1.default();
        var where = { _openid: masteryModel.openid };
        if (bookId) {
            where.bookId = bookId;
        }
        var data = await masteryModel.model.where(where).orderBy('masteryScore', 'asc').limit(Number(limit) || 10).get();
        return this.success(data.data || []);
    },
    /**
     * 获取学习报告数据
     */
    getLearningReport: async function (_a) {
        var type = _a.type, date = _a.date;
        var learningDataModel = new learningData_1.default();
        var data;
        if (type === 'week') {
            var d = new Date(date);
            var week = learningDataModel.getWeekNumber(d);
            var year = d.getFullYear();
            data = await learningDataModel.getWeekData(week, year);
        }
        else if (type === 'month') {
            var d = new Date(date);
            data = await learningDataModel.getMonthData(d.getMonth() + 1, d.getFullYear());
        }
        else {
            data = await learningDataModel.model.where({
                _openid: this.openid,
                date: new Date(date)
            }).get();
        }
        var summary = {
            totalStudyTime: 0,
            totalWordsCount: 0,
            correctRate: 0,
            winRate: 0,
            avgScore: 0,
            combatCount: 0,
            learningCount: 0,
            reviewCount: 0
        };
        if (data.data && data.data.length > 0) {
            for (var _i = 0, _b = data.data; _i < _b.length; _i++) {
                var item = _b[_i];
                summary.totalStudyTime += item.totalStudyTime || 0;
                summary.totalWordsCount += item.totalWordsCount || 0;
                summary.combatCount += item.combatCount || 0;
                summary.learningCount += item.learningCount || 0;
                summary.reviewCount += item.reviewCount || 0;
            }
            var totalCorrect = data.data.reduce(function (sum, item) { return sum + (item.correctCount || 0); }, 0);
            var totalWrong = data.data.reduce(function (sum, item) { return sum + (item.wrongCount || 0); }, 0);
            summary.correctRate = totalCorrect / (totalCorrect + totalWrong);
            var totalWins = data.data.reduce(function (sum, item) { return sum + (item.winCount || 0); }, 0);
            var totalCombats = data.data.reduce(function (sum, item) { return sum + (item.combatCount || 0); }, 0);
            summary.winRate = totalCombats > 0 ? totalWins / totalCombats : 0;
            var totalScore = data.data.reduce(function (sum, item) { return sum + (item.avgScore || 0); }, 0);
            summary.avgScore = data.data.length > 0 ? totalScore / data.data.length : 0;
        }
        return this.success({
            daily: data.data || [],
            summary: summary
        });
    },
    /**
     * 获取学习趋势数据(用于图表)
     */
    getLearningTrend: async function (_a) {
        var _b = _a.days === void 0 ? 30 : _a.days, days = _b;
        var startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        var learningDataModel = new learningData_1.default();
        var data = await learningDataModel.model.where({
            _openid: this.openid,
            date: learningDataModel.command.gte(startDate)
        }).orderBy('date', 'asc').get();
        var trend = {
            dates: [],
            studyTimes: [],
            correctRates: [],
            wordCounts: []
        };
        if (data.data && data.data.length > 0) {
            for (var _i = 0, _c = data.data; _i < _c.length; _i++) {
                var item = _c[_i];
                var formattedDate = this.formatDate(item.date);
                trend.dates.push(formattedDate);
                trend.studyTimes.push(Math.round((item.totalStudyTime || 0) / 60));
                trend.correctRates.push(Math.round((item.correctRate || 0) * 100));
                trend.wordCounts.push(item.totalWordsCount || 0);
            }
        }
        return this.success(trend);
    },
    /**
     * 格式化日期为 MM/DD
     */
    formatDate: function (date) {
        var d = new Date(date);
        return "".concat(d.getMonth() + 1, "/").concat(d.getDate());
    }
});
exports.default = LearningDataController;
