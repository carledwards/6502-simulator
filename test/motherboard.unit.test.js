"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("@testdeck/mocha");
const _chai = __importStar(require("chai"));
const ts_mockito_1 = require("ts-mockito");
const motherboard_1 = require("../src/motherboard");
const cpu6502_1 = require("../src/cpu6502");
_chai.should();
let MotherboardUnitTests = class MotherboardUnitTests {
    before() {
        this.cpuMock = ts_mockito_1.mock(cpu6502_1.Cpu6502);
        this.SUT = new motherboard_1.Motherboard(ts_mockito_1.instance(this.cpuMock));
    }
    'should do something when call a method'() {
        // this.SUT.should.be.not.undefined;
    }
};
__decorate([
    mocha_1.test
], MotherboardUnitTests.prototype, "should do something when call a method", null);
MotherboardUnitTests = __decorate([
    mocha_1.suite
], MotherboardUnitTests);
