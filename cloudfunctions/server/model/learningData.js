"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p))
                d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
                case 7: op = _.trys.pop(); _.trys.pop(); continue;
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
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
var LearningDataModel = /** @class */ (function (_super) {
    __extends(LearningDataModel, _super);
    function LearningDataModel() {
        return _super.call(this, LearningDataModel) || this;
    }
    /**
     * 更新或创建当日学习数据
     */
    LearningDataModel.prototype.upsertDaily = async function (data) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var existing = await this.model.where({
            _openid: this.openid,
            date: today
        }).get();
        if (existing.data.length > 0) {
            // 更新
            var _id = existing.data[0]._id;
            return await this.model.doc(_id).update({
                data: __assign(__assign({}, data), { _updateTime: new Date() })
            });
        }
        // 新增
        return await this.model.add({
            data: __assign({ _openid: this.openid, date: today, year: today.getFullYear(), month: today.getMonth() + 1, week: this.getWeekNumber(today), dayOfWeek: today.getDay(), totalStudyTime: 0, combatStudyTime: 0, learningStudyTime: 0, reviewStudyTime: 0, aiStudyTime: 0, combatCount: 0, learningCount: 0, reviewCount: 0, aiInteractionCount: 0, totalWordsCount: 0, correctCount: 0, wrongCount: 0, tipCount: 0, correctRate: 0, winCount: 0, loseCount: 0, winRate: 0, avgScore: 0, newWordsCount: 0, reviewWordsCount: 0, masteredWordsCount: 0, aiChatCount: 0, aiRecommendCount: 0, aiReportReadCount: 0, wordsPerMinute: 0, avgTimePerWord: 0, _createTime: new Date(), _updateTime: new Date() }, data)
        });
    };
    /**
     * 获取周学习数据
     */
    LearningDataModel.prototype.getWeekData = async function (week, year) {
        return await this.model.where({
            _openid: this.openid,
            week: week,
            year: year
        }).orderBy('date', 'asc').get();
    };
    /**
     * 获取月学习数据
     */
    LearningDataModel.prototype.getMonthData = async function (month, year) {
        return await this.model.where({
            _openid: this.openid,
            month: month,
            year: year
        }).orderBy('date', 'asc').get();
    };
    /**
     * 获取第几周（ISO 8601标准）
     */
    LearningDataModel.prototype.getWeekNumber = function (date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    LearningDataModel.$collection = 'learningData';
    return LearningDataModel;
}(base_1.default));
exports.default = LearningDataModel;
