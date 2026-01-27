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
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
var LearningPlanModel = /** @class */ (function (_super) {
    __extends(LearningPlanModel, _super);
    function LearningPlanModel() {
        return _super.call(this, LearningPlanModel) || this;
    }
    LearningPlanModel.prototype.addPlan = function (data) {
        return this.model.add({
            data: __assign({ _openid: this.openid, _createTime: new Date(), _updateTime: new Date() }, data)
        });
    };
    LearningPlanModel.$collection = 'learningPlan';
    return LearningPlanModel;
}(base_1.default));
exports.default = LearningPlanModel;
