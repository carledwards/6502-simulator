import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { expect, assert } from 'chai';
import { Internals, CPUStash, Register, StatusFlag, toHexByte, toHexWord } from '../../src/cpu6502/internals';

_chai.should();

let _defaultReg = {_a:0x00,_x:0x00,_y:0x00,_p:0b00100100,_pc:0x0000,_sp:0xFF};
let _seedReg = {_a:0x01,_x:0x02,_y:0x03,_p:0b00100100,_pc:0x1FE0,_sp:0xFF};

class MyInternals6502 extends Internals {
    readDataCount = 0;
    writeDataCount = 0;
    dataForRead: number[] = new Array();
    writeDataValues: number[] = new Array();
    historyReadData = [];
    historyWriteData = [];
    memory: number[] = new Array(0x10000);

    readData(theAddr: number, context: string): number {
        this.readDataCount++;
        let retVal = this.memory[theAddr];  // first read from memory
        if (this.dataForRead.length > 0) {
            retVal = this.dataForRead.shift(); // if canned data, use that instead
        }
        this.historyReadData.push({readAddr: theAddr, value: retVal});
        return retVal;
    }
    writeData(theAddr: number, theValue: number, context: string): void {
        this.writeDataCount++;
        this.historyWriteData.push({writeAddr: theAddr, value: theValue});
        this.memory[theAddr] = theValue;
    }
    resetCounters() {
        this.readDataCount = 0;
        this.writeDataCount = 0;
        this.dataForRead = new Array();
        this.writeDataValues = new Array();
        this.historyReadData = new Array();
        this.historyWriteData = new Array();
    }
}

@suite class AddressModeTests {
    private i65: MyInternals6502;

    before() {
        let myI65 = new MyInternals6502();
        expect(myI65.reg).to.eql(_defaultReg);
        expect(function(){myI65.stash.addr}).to.throw('absolute addr not set');
        
        // set seed values
        myI65.reg.a = _seedReg['_a'];
        myI65.reg.x = _seedReg['_x'];
        myI65.reg.y = _seedReg['_y'];
        myI65.reg.p = _seedReg['_p'];
        myI65.reg.pc = _seedReg['_pc'];
        myI65.reg.sp = _seedReg['_sp'];
        expect(myI65.reg).to.eql(_seedReg);
        this.i65 = myI65;
    }

    indirect_test = (hiBytePtr: number, loBytePtr: number, 
        hiByteAddr: number, loByteAddr: number,
        expectPageBoundary: boolean) => {
        // setup
        this.i65.dataForRead = [loBytePtr, hiBytePtr, loByteAddr, hiByteAddr];

        // execute
        let penalty = this.i65.addrIndirect();

        // verify
        assert.equal(this.i65.stash.addr, ((hiByteAddr << 8)|loByteAddr) & 0xFFFF);
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 2;  // pc is incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, 0); // always 0
        assert.equal(this.i65.readDataCount, 4);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: loBytePtr}
        );
        assert.deepEqual(this.i65.historyReadData[1],
            {readAddr: _seedReg["_pc"]+1, value: hiBytePtr}
        );
        assert.deepEqual(this.i65.historyReadData[2],
            {readAddr: (hiBytePtr << 8)|loBytePtr, value: loByteAddr}
        );
        if (expectPageBoundary) {
            assert.deepEqual(this.i65.historyReadData[3],
                {readAddr: ((hiBytePtr << 8)|loBytePtr) & 0xFF00, value: hiByteAddr}
            );
        }
        else {
            assert.deepEqual(this.i65.historyReadData[3],
                {readAddr: (hiBytePtr << 8)|loBytePtr+1, value: hiByteAddr}
            );
        }
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'indirect'() {
        this.indirect_test(0x04, 0xA0, 0x65, 0x78, false);
    }

    @test 'indirect page boundary rollover'() {
        this.indirect_test(0x04, 0xFF, 0x65, 0x78, true);
    }

    indirect_x_test = (hiByte: number, loByte: number, zpPtr: number, expPenalty: number, xOffset: number) => {
        // setup
        this.i65.dataForRead = [zpPtr, loByte, hiByte];
        this.i65.reg.x = this.i65.reg.x + xOffset;

        // execute
        let penalty = this.i65.addrIndirectX();

        // verify
        assert.equal(this.i65.stash.addr, ((hiByte << 8)|loByte) & 0xFFFF);
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc is incremented
        expReg["_x"] = _seedReg['_x'] + xOffset;
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, expPenalty);
        assert.equal(this.i65.readDataCount, 3);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: zpPtr}
        );
        assert.deepEqual(this.i65.historyReadData[1],
            {readAddr: zpPtr + _seedReg["_x"] + xOffset, value: loByte}
        );
        assert.deepEqual(this.i65.historyReadData[2],
            {readAddr: zpPtr + 1 + _seedReg["_x"] + xOffset, value: hiByte}
        );
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'indirect x - 1'() {
        this.indirect_x_test(0x33, 0x02, 0x03, 0, 0);
    }

    @test 'indirect x - 2'() {
        this.indirect_x_test(0x34, 0x0F, 0x1F, 0, 0);
    }

    @test 'indirect x - 3 - different x value'() {
        this.indirect_x_test(0x34, 0x0F, 0x1F, 0, 2);
    }

    indirect_y_test = (hiByte: number, loByte: number, zpPtr: number, expPenalty: number, yOffset: number) => {
        // setup
        this.i65.dataForRead = [zpPtr, loByte, hiByte];
        this.i65.reg.y = this.i65.reg.y + yOffset;

        // execute
        let penalty = this.i65.addrIndirectY();

        // verify
        assert.equal(this.i65.stash.addr, (((hiByte << 8)|loByte) + _seedReg['_y'] + yOffset) & 0xFFFF);
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc is incremented
        expReg["_y"] = expReg['_y'] + yOffset;
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, expPenalty);
        assert.equal(this.i65.readDataCount, 3);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: zpPtr}
        );
        assert.deepEqual(this.i65.historyReadData[1],
            {readAddr: zpPtr, value: loByte}
        );
        assert.deepEqual(this.i65.historyReadData[2],
            {readAddr: zpPtr + 1, value: hiByte}
        );
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'indirect y'() {
        this.indirect_y_test(0x33, 0x02, 0x03, 0, 0);
    }

    @test 'indirect y -2 '() {
        this.indirect_y_test(0x33, 0x02, 0x03, 0, 2);
    }

    @test 'indirect y penalty wrap 1'() {
        this.indirect_y_test(0xFF, 0xFE, 0x03, 1, 0);
    }

    @test 'indirect y penalty wrap 2'() {
        this.indirect_y_test(0xCF, 0xFE, 0x03, 1, 0);
    }

    @test 'accumulator'() {
        // execute
        let penalty = this.i65.addrAccumulator();

        // verify
        assert.equal(penalty, 0);
        expect(this.i65.reg).to.eql(_seedReg);
        assert.equal(this.i65.readDataCount, 0);
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'implied'() {
        // execute
        let penalty = this.i65.addrImplied();

        // verify
        assert.equal(penalty, 0);
        expect(this.i65.reg).to.eql(_seedReg);
        expect(() => {this.i65.stash.addr}).to.throw('absolute addr not set');
        assert.equal(this.i65.readDataCount, 0);
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'immediate'() {
        // execute
        let penalty = this.i65.addrImmediate();

        // verify
        assert.equal(penalty, 0);
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc should have been incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(this.i65.stash.addr, _seedReg['_pc']); // original pc stashed
        assert.equal(this.i65.readDataCount, 0);
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'immediate overflow'() {
        // execute
        this.i65.reg.pc = 0xFFFF; // set PC
        let penalty = this.i65.addrImmediate();

        // verify
        assert.equal(this.i65.stash.addr, 0xFFFF); // original pc stashed
        assert.equal(penalty, 0);
        let expReg = {..._seedReg};
        expReg["_pc"] = 0x0000;
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(this.i65.readDataCount, 0);
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'absolute'() {
        // setup
        this.i65.dataForRead = [0x66, 0x77];

        // execute
        let penalty = this.i65.addrAbsolute();

        // verify
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 2;
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, 0);
        assert.equal(this.i65.readDataCount, 2);
        assert.equal(this.i65.writeDataCount, 0);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: 0x66}
        );
        assert.deepEqual(this.i65.historyReadData[1],
            {readAddr: _seedReg['_pc'] + 1, value: 0x77}
        );
        assert.equal(this.i65.stash.addr, 0x7766);
    }

    absolute_x_test = (loAddr: number, hiAddr: number, addrOffset: number, expPenalty: number) => {
        // setup
        this.i65.dataForRead = [loAddr, hiAddr];

        // execute
        let penalty = this.i65.addrAbsoluteX();

        // verify
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 2;
        expReg["_y"] = this.i65.reg.y;
        expReg["_x"] = this.i65.reg.x;
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, expPenalty);
        assert.equal(this.i65.readDataCount, 2);
        assert.equal(this.i65.writeDataCount, 0);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: loAddr}
        );
        assert.deepEqual(this.i65.historyReadData[1],
            {readAddr: _seedReg['_pc'] + 1, value: hiAddr}
        );
        assert.equal(this.i65.stash.addr, ((hiAddr << 8) | loAddr) + addrOffset);
    }

    @test 'absolute x - 1'() {
        this.i65.reg.x = 0x8E;
        this.absolute_x_test(0x66, 0x77, 0x8E, 0);
    }

    @test 'absolute x - 1 w/ y changed'() {
        this.i65.reg.x = 0x8E;
        this.i65.reg.y = this.i65.reg.y + 5;
        this.absolute_x_test(0x66, 0x77, 0x8E, 0);
    }

    @test 'absolute x - 2'() {
        this.i65.reg.x = 0xD4;
        this.absolute_x_test(0x66, 0x77, 0xD4, 1);
    }

    absolute_y_test = (loAddr: number, hiAddr: number, addrOffset: number, expPenalty: number) => {
        // setup
        this.i65.dataForRead = [loAddr, hiAddr];

        // execute
        let penalty = this.i65.addrAbsoluteY();

        // verify
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 2;
        expReg["_y"] = this.i65.reg.y;
        expReg["_x"] = this.i65.reg.x;
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, expPenalty);
        assert.equal(this.i65.readDataCount, 2);
        assert.equal(this.i65.writeDataCount, 0);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: loAddr}
        );
        assert.deepEqual(this.i65.historyReadData[1],
            {readAddr: _seedReg['_pc'] + 1, value: hiAddr}
        );
        assert.equal(this.i65.stash.addr, ((hiAddr << 8) | loAddr) + addrOffset);
    }

    @test 'absolute y - 1'() {
        this.i65.reg.y = 0x1A;
        this.absolute_y_test(0x66, 0x77, 0x1A, 0);
    }

    @test 'absolute y - 1 w/ x changed'() {
        this.i65.reg.y = 0x1A;
        this.i65.reg.x = this.i65.reg.x + 5;
        this.absolute_y_test(0x66, 0x77, 0x1A, 0);
    }

    @test 'absolute y - 2'() {
        this.i65.reg.y = 0xBB;
        this.absolute_y_test(0x66, 0x77, 0xBB, 1);
    }

    @test 'zero page'() {
        // setup
        this.i65.dataForRead = [0x33];

        // execute
        let penalty = this.i65.addrZeroPage();

        // verify
        assert.equal(this.i65.stash.addr, 0x33); // zero page (lower 8 bits)
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc should have been incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, 0);
        assert.equal(this.i65.readDataCount, 1);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: 0x33}
        );
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'zero page x'() {
        // setup
        this.i65.dataForRead = [0x33];

        // execute
        let penalty = this.i65.addrZeroPageX();

        // verify
        assert.equal(this.i65.stash.addr, 0x33 + _seedReg['_x']); // zero page (lower 8 bits of pc) + x
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc should have been incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, 0);
        assert.equal(this.i65.readDataCount, 1);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: 0x33}
        );
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'zero page y'() {
        // setup
        this.i65.dataForRead = [0x33];

        // execute
        let penalty = this.i65.addrZeroPageY();

        // verify
        assert.equal(this.i65.stash.addr, 0x33 + _seedReg['_y']); // zero page (lower 8 bits of pc) + y
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc is incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, 0);
        assert.equal(this.i65.readDataCount, 1);
        assert.deepEqual(this.i65.historyReadData[0],
            {readAddr: _seedReg["_pc"], value: 0x33}
        );
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'relative forwards'() {
        // setup
        this.i65.dataForRead = [0x33];

        // execute
        let penalty = this.i65.addrRelative();

        // verify
        assert.equal(this.i65.stash.addr, 0x33); // zero page (lower 8 bits of pc)
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc should have been incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(penalty, 0);
        assert.equal(this.i65.readDataCount, 1);
        assert.equal(this.i65.writeDataCount, 0);
    }

    @test 'relative backwards'() {
        // setup
        this.i65.dataForRead = [0xF3];  // high bit set for negative

        // execute
        let penalty = this.i65.addrRelative();

        // verify
        assert.equal(penalty, 0);
        let expReg = {..._seedReg};
        expReg["_pc"] = _seedReg['_pc'] + 1;  // pc should have been incremented
        expect(this.i65.reg).to.eql(expReg);
        assert.equal(this.i65.stash.addr, 0xFF00 | 0xF3);
        assert.equal(this.i65.readDataCount, 1);
        assert.equal(this.i65.writeDataCount, 0);
    }

}

@suite class CPUStashTests {
    @test 'CPUStash'() {
        let stash = new CPUStash();
        expect(function(){stash.addr}).to.throw('absolute addr not set');
        stash.addr = 0x01;
        assert.equal(0x01, stash.addr);
        stash.addr = 0xABCDEF;
        assert.equal(0xCDEF, stash.addr);
        stash.reset();
        expect(function(){stash.addr}).to.throw('absolute addr not set');
    }
}

@suite class RegisterTests {
    @test 'Register'() {
        let reg = new Register();
        expect(reg).to.eql({_a:0,_x:0,_y:0,_p:0b00100100,_pc:0x0000,_sp:0xFF});
        reg.a = 0xFFF;
        reg.x = 0xEEE;
        reg.y = 0xDDD;
        reg.pc = 0xCCCCCC;
        reg.sp = 0xBBB;
        expect(reg).to.eql({_a:0xFF,_x:0xEE,_y:0xDD,_p:0b00100100,_pc:0xCCCC,_sp:0xBB});
        assert.equal(0xFF, reg.a);
        assert.equal(0xEE, reg.x);
        assert.equal(0xDD, reg.y);
        assert.equal(0b00100100, reg.p);
        assert.equal(0xCCCC, reg.pc);
        assert.equal(0xBB, reg.sp);

        assert.equal(reg.isFlag(0x80), false);
        assert.equal(reg.isFlag(StatusFlag.Negative), false);
        reg.setStatusFlag(StatusFlag.Negative, true);
        assert.equal(reg.isFlag(0x80), true);
        assert.equal(reg.isFlag(StatusFlag.Negative), true);
        assert.equal(reg.p, 0b10100100);

        assert.equal(reg.isFlag(0x40), false);
        assert.equal(reg.isFlag(StatusFlag.Overflow), false);
        reg.setStatusFlag(StatusFlag.Overflow, true);
        assert.equal(reg.isFlag(0x40), true);
        assert.equal(reg.isFlag(StatusFlag.Overflow), true);
        assert.equal(reg.p, 0b11100100);

        assert.equal(reg.isFlag(0x20), true);
        assert.equal(reg.isFlag(StatusFlag.Constant), true);
        reg.setStatusFlag(StatusFlag.Constant, false);
        assert.equal(reg.isFlag(0x20), false);
        assert.equal(reg.isFlag(StatusFlag.Constant), false);
        assert.equal(reg.p, 0b11000100);

        assert.equal(reg.isFlag(0x10), false);
        assert.equal(reg.isFlag(StatusFlag.Break), false);
        reg.setStatusFlag(StatusFlag.Break, true);
        assert.equal(reg.isFlag(0x10), true);
        assert.equal(reg.isFlag(StatusFlag.Break), true);
        assert.equal(reg.p, 0b11010100);

        assert.equal(reg.isFlag(0x08), false);
        assert.equal(reg.isFlag(StatusFlag.Decimal), false);
        reg.setStatusFlag(StatusFlag.Decimal, true);
        assert.equal(reg.isFlag(0x08), true);
        assert.equal(reg.isFlag(StatusFlag.Decimal), true);
        assert.equal(reg.p, 0b11011100);

        assert.equal(reg.isFlag(0x04), true);
        assert.equal(reg.isFlag(StatusFlag.Interrupt), true);
        reg.setStatusFlag(StatusFlag.Interrupt, false);
        assert.equal(reg.isFlag(0x04), false);
        assert.equal(reg.isFlag(StatusFlag.Interrupt), false);
        assert.equal(reg.p, 0b11011000);

        assert.equal(reg.isFlag(0x02), false);
        assert.equal(reg.isFlag(StatusFlag.Zero), false);
        reg.setStatusFlag(StatusFlag.Zero, true);
        assert.equal(reg.isFlag(0x02), true);
        assert.equal(reg.isFlag(StatusFlag.Zero), true);
        assert.equal(reg.p, 0b11011010);

        assert.equal(reg.isFlag(0x01), false);
        assert.equal(reg.isFlag(StatusFlag.Carry), false);
        reg.setStatusFlag(StatusFlag.Carry, true);
        assert.equal(reg.isFlag(0x01), true);
        assert.equal(reg.isFlag(StatusFlag.Carry), true);
        assert.equal(reg.p, 0b11011011);
    }
}

@suite class HelperTests {
    myI65: MyInternals6502;

    before() {
        this.myI65 = new MyInternals6502();
    }

    @test 'tohexByte'() {
        assert.equal(toHexByte(0x00), "00");
        assert.equal(toHexByte(0x0F), "0F");
        assert.equal(toHexByte(0xFF), "FF");
        assert.equal(toHexByte(0xA5), "A5");
        assert.equal(toHexByte(0xABC), "ABC");
    }
    @test 'tohexWord'() {
        assert.equal(toHexWord(0x00), "0000");
        assert.equal(toHexWord(0x0F), "000F");
        assert.equal(toHexWord(0xFF), "00FF");
        assert.equal(toHexWord(0xA5), "00A5");
        assert.equal(toHexWord(0xABC), "0ABC");
        assert.equal(toHexWord(0xABCD), "ABCD");
        assert.equal(toHexWord(0x1FFFF), "1FFFF");
    }

    pushBytesOnStackAndVerify = (values: number[]) => {
        this.myI65.resetCounters();
        let startingSp = this.myI65.reg.sp;
        let index = 0;
        values.forEach( (theByte) => {
            this.myI65.stackPushByte(theByte, `pushing ${theByte}`);
            assert.equal(theByte, this.myI65.memory[startingSp+0x0100-index]); // check the memory
            index++;
        });
        assert.equal(startingSp - values.length, this.myI65.reg.sp);
        assert.equal(values.length, this.myI65.writeDataCount); // verify the number of writeData calls match the values
        assert.equal(0, this.myI65.readDataCount);
    }

    popBytesFromStackAndVerify = (values: number[]) => {
        this.myI65.resetCounters();
        let startingSp = this.myI65.reg.sp;
        let index = 0;
        values.forEach( (theExpectedByte) => {
            let theByte = this.myI65.stackPopByte(`popping and matching on ${theExpectedByte}`);
            assert.equal(theByte, theExpectedByte);
            assert.equal(theExpectedByte, this.myI65.memory[startingSp+0x0100+index+1]); // check the memory
            index++;
        });
        assert.equal(startingSp + values.length, this.myI65.reg.sp);
        assert.equal(values.length, this.myI65.readDataCount); // verify the number of readData calls match the values
        assert.equal(0, this.myI65.writeDataCount);
    }

    pushWordsOnStackAndVerify = (values: number[]) => {
        this.myI65.resetCounters();
        let startingSp = this.myI65.reg.sp;
        let index = 0;
        values.forEach( (theWord) => {
            this.myI65.stackPushWord(theWord, `pushing ${theWord}`);
            assert.equal(theWord & 0xFF, this.myI65.memory[startingSp+0x0100-index-1]); // check the memory
            assert.equal((theWord >> 8) & 0xFF, this.myI65.memory[startingSp+0x0100-index]); // check the memory
            index += 2;
        });
        assert.equal(startingSp - (values.length*2), this.myI65.reg.sp);
        assert.equal(values.length*2, this.myI65.writeDataCount); // verify the number of writeData calls match the values
        assert.equal(0, this.myI65.readDataCount);
    }

    popWordsFromStackAndVerify = (values: number[]) => {
        this.myI65.resetCounters();
        let startingSp = this.myI65.reg.sp;
        let index = 0;
        values.forEach( (theExpectedWord) => {
            let theWord = this.myI65.stackPopWord(`popping and matching on ${theExpectedWord}`);
            assert.equal(theWord, theExpectedWord);
            assert.equal(theExpectedWord & 0xFF, this.myI65.memory[startingSp+0x0100+index+1]); // check the memory
            assert.equal(theExpectedWord >> 8 & 0xFF, this.myI65.memory[startingSp+0x0100+index+2]); // check the memory
            index += 2;
        });
        assert.equal(startingSp + values.length*2, this.myI65.reg.sp);
        assert.equal(values.length*2, this.myI65.readDataCount); // verify the number of readData calls match the values
        assert.equal(0, this.myI65.writeDataCount);
    }

    @test 'stack with words'() {
        this.pushWordsOnStackAndVerify([0x1234]);
        this.popWordsFromStackAndVerify([0x1234]);

        this.pushWordsOnStackAndVerify([0x1234,0x2345,0x3456,0x4567]);
        this.popWordsFromStackAndVerify([0x4567,0x3456,0x2345,0x1234]);

        this.pushWordsOnStackAndVerify([0x1234]);
        this.popBytesFromStackAndVerify([0x34]);
        this.popBytesFromStackAndVerify([0x12]);

        this.pushBytesOnStackAndVerify([0x45,0x67]);
        this.popWordsFromStackAndVerify([0x4567]);
    }

    @test 'stack with bytes'() {
        expect(() => {this.myI65.stackPopByte('')}).to.throw('Stack is empty; unable to pop byte');

        // push 4 on, pull for off
        this.pushBytesOnStackAndVerify([1,2,3,4]);
        this.popBytesFromStackAndVerify([4,3,2,1]);

        // mix and match
        this.pushBytesOnStackAndVerify([1,2]);
        this.pushBytesOnStackAndVerify([3,4]);
        this.popBytesFromStackAndVerify([4,3]);
        this.pushBytesOnStackAndVerify([5,6]);
        this.popBytesFromStackAndVerify([6]);
        this.pushBytesOnStackAndVerify([7,8,9,10,11,12,13]);
        this.popBytesFromStackAndVerify([13,12,11,10,9,8,7,5,2,1]);

        expect(() => {this.myI65.stackPopByte('')}).to.throw('Stack is empty; unable to pop byte');

        // try a value too large
        expect(() => {this.pushBytesOnStackAndVerify([0xFFFF])}).to.throw("data is out of range: 65535");
        expect(() => {this.myI65.stackPopByte('')}).to.throw('Stack is empty; unable to pop byte');

        // fill the stack
        for (var i = 0; i < 255; i++) {
            this.pushBytesOnStackAndVerify([i]);
        }
        expect(() => {this.pushBytesOnStackAndVerify([0xA5])}).to.throw("Stack is full; unable to push another byte");
        for (var i = 254; i >= 0; i--) {
            this.popBytesFromStackAndVerify([i]);
        }
        expect(() => {this.myI65.stackPopByte('')}).to.throw('Stack is empty; unable to pop byte');
    }
}
