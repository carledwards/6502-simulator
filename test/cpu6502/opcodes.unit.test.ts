import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { expect, assert } from 'chai';
import { StatusFlag } from '../../src/cpu6502/internals';
import { Opcodes } from '../../src/cpu6502/opcodes';

_chai.should();

class MyOpCodes extends Opcodes{
    readDataHistory = new Array();
    writeDataHistory = new Array();
    memory: number[] = new Array(0x10000).fill(-1);

    readData(theAddr: number, context: string): number {
        if (typeof theAddr === 'undefined') {
            throw new Error('readData addr not defined');
        }
        if (theAddr > 0XFFFF) {
            throw new Error(`readData addr > 0xFFFF: ${theAddr.toString(16)}`);
        }
        let retVal = this.memory[theAddr];
        if (retVal == -1) {
            throw new Error(`readData memory not initialized for addr: ${theAddr.toString(16)}`);
        }
        this.readDataHistory.push({addr: theAddr, value: retVal});
        return retVal;
    }

    writeData(theAddr: number, theValue: number, context: string): void {
        if (typeof theAddr === 'undefined') {
            throw new Error('writeData addr not defined');
        }
        if (theAddr > 0XFFFF) {
            throw new Error(`writeData addr > 0xFFFF: ${theAddr.toString(16)}`);
        }
        if (typeof theValue === 'undefined') {
            throw new Error('writeData value not defined');
        }
        if (theValue > 0XFF) {
            throw new Error(`writeData value > 0xFF: ${theValue.toString(16)}`);
        }
        this.memory[theAddr] = theValue;
        this.writeDataHistory.push({addr: theAddr, value: theValue});
    }
}

interface TestRegister {
    a: number;
    x: number;
    y: number;
    pc: number;
    p: number;
    sp: number;
}

abstract class BaseOpCodeTests {
    op: MyOpCodes;

    before() {
        this.op = new MyOpCodes();
    }

    setOpRegisters(theReg: TestRegister) {
        this.op.reg.a = theReg.a;
        this.op.reg.x = theReg.x;
        this.op.reg.y = theReg.y;
        this.op.reg.pc = theReg.pc;
        this.op.reg.p = theReg.p;
        this.op.reg.sp = theReg.sp;
    }

    checkOpRegisters(theReg: TestRegister, testStatusFlag: boolean) {
        assert.equal(theReg.a, this.op.reg.a);
        assert.equal(theReg.x, this.op.reg.x);
        assert.equal(theReg.y, this.op.reg.y);
        assert.equal(theReg.pc, this.op.reg.pc);
        assert.equal(theReg.sp, this.op.reg.sp);
        if (testStatusFlag) {
            assert.equal(theReg.p, this.op.reg.p);
        }
    }

    getRegisterWithDefaults(defval: number): TestRegister {
        let retval = {
            a: defval,
            x: defval,
            y: defval,
            pc: defval,
            p: defval,
            sp: defval
        };
        return retval;
    }

    checkNZFlags(isOnByDefault: boolean, expectNegative: boolean, expectZero: boolean) {
        // flags being tested: NV-BDIZC
        this.checkNZCVFlags(isOnByDefault, 
            expectNegative,
            expectZero,
            isOnByDefault, // Carry
            isOnByDefault); // overflow
    }

    checkNZCFlags(isOnByDefault: boolean, expectNegative: boolean, expectZero: boolean, 
        expectCarry: boolean) {
        this.checkNZCVFlags(isOnByDefault, 
            expectNegative,
            expectZero,
            expectCarry,
            isOnByDefault); // overflow
    }

    checkNZCVFlags(isOnByDefault: boolean, expectNegative: boolean, expectZero: boolean, 
        expectCarry: boolean, expectOverflow: boolean) {
        // flags being tested: NV-BDIZC
        assert.equal(this.op.reg.isFlag(StatusFlag.Negative), expectNegative);
        assert.equal(this.op.reg.isFlag(StatusFlag.Overflow), expectOverflow);
        assert.equal(this.op.reg.isFlag(StatusFlag.Break), isOnByDefault);
        assert.equal(this.op.reg.isFlag(StatusFlag.Decimal), isOnByDefault);
        assert.equal(this.op.reg.isFlag(StatusFlag.Interrupt), isOnByDefault);
        assert.equal(this.op.reg.isFlag(StatusFlag.Zero), expectZero);
        assert.equal(this.op.reg.isFlag(StatusFlag.Carry), expectCarry);
    }
}

@suite class CompareOpCodeTests extends BaseOpCodeTests {

    @test 'CMP (CoMPare accumulator)'() {
        this.op.stash.addr = 0x2000;
        [true, false].forEach((isDefaultOn) => {
            // test with equal values
            [0x00, 0x10, 0x80, 0xFF].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.a = theTestValue;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cmpOpcode();
                this.checkNZCFlags(isDefaultOn, false, true, true);
            });

            // test with accumulator less than value
            [0x01, 0x10, 0x80, 0xFF].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.a = theTestValue - 1;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cmpOpcode();
                this.checkNZCFlags(isDefaultOn, true, false, false);
            });

            // test with accumulator more than value
            [0x00, 0x10, 0x80, 0xFE].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.a = theTestValue + 1;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cmpOpcode();
                this.checkNZCFlags(isDefaultOn, false, false, true);
            });

            // test the opposite ends 0x00 and 0xFF
            this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));
            this.op.reg.a = 0x00;
            this.op.memory[this.op.stash.addr] = 0xFF;
            this.op.cmpOpcode();
            this.checkNZCFlags(isDefaultOn, false, false, false);

            // test the opposite ends 0xFF and 0x00
            this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));
            this.op.reg.a = 0xFF;
            this.op.memory[this.op.stash.addr] = 0x00;
            this.op.cmpOpcode();
            this.checkNZCFlags(isDefaultOn, true, false, true);
        });
    }

    @test 'CPX (ComPare X)'() {
        this.op.stash.addr = 0x2000;
        [true, false].forEach((isDefaultOn) => {
                // test with equal values
            [0x00, 0x10, 0x80, 0xFF].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.x = theTestValue;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cpxOpcode();
                this.checkNZCFlags(isDefaultOn, false, true, true);
            });

            // test with x less than value
            [0x01, 0x10, 0x80, 0xFF].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.x = theTestValue - 1;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cpxOpcode();
                this.checkNZCFlags(isDefaultOn, true, false, false);
            });

            // test with x greater than value
            [0x00, 0x10, 0x80, 0xFE].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.x = theTestValue + 1;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cpxOpcode();
                this.checkNZCFlags(isDefaultOn, false, false, true);
            });

            // test the opposite ends 0x00 and 0xFF
            this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));
            this.op.reg.x = 0x00;
            this.op.memory[this.op.stash.addr] = 0xFF;
            this.op.cpxOpcode();
            this.checkNZCFlags(isDefaultOn, false, false, false);

            // test the opposite ends 0xFF and 0x00
            this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));
            this.op.reg.x = 0xFF;
            this.op.memory[this.op.stash.addr] = 0x00;
            this.op.cpxOpcode();
            this.checkNZCFlags(isDefaultOn, true, false, true);
        });
    }

    @test 'CPY (ComPare Y)'() {
        this.op.stash.addr = 0x2000;
        [true, false].forEach((isDefaultOn) => {

            // test with equal values
            [0x00, 0x10, 0x80, 0xFF].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.y = theTestValue;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cpyOpcode();
                this.checkNZCFlags(isDefaultOn, false, true, true);
            });

            // test with y less than value
            [0x01, 0x10, 0x80, 0xFF].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.y = theTestValue - 1;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cpyOpcode();
                this.checkNZCFlags(isDefaultOn, true, false, false);
            });

            // test with y greater than value
            [0x00, 0x10, 0x80, 0xFE].forEach((theTestValue) => {
                this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));

                this.op.reg.y = theTestValue + 1;
                this.op.memory[this.op.stash.addr] = theTestValue;
                this.op.cpyOpcode();
                this.checkNZCFlags(isDefaultOn, false, false, true);
            });

            // test the opposite ends 0x00 and 0xFF
            this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));
            this.op.reg.y = 0x00;
            this.op.memory[this.op.stash.addr] = 0xFF;
            this.op.cpyOpcode();
            this.checkNZCFlags(isDefaultOn, false, false, false);

            // test the opposite ends 0xFF and 0x00
            this.setOpRegisters(this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00));
            this.op.reg.y = 0xFF;
            this.op.memory[this.op.stash.addr] = 0x00;
            this.op.cpyOpcode();
            this.checkNZCFlags(isDefaultOn, true, false, true);
        });
    }
}

@suite class BranchOpCodeTests extends BaseOpCodeTests {
    performRelativeAddr(data: number) {
        this.op.memory[this.op.reg.pc] = data; // set the data in memory at the PC
        this.op.addrRelative(); // perform the relative addr calculation
    }

    @test 'BPL (Branch on PLus) $10'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isNegativeTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isNegativeTestValue) {
                            testReg.p |= StatusFlag.Negative;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Negative);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bplOpcode());
                        if (isNegativeTestValue) {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                        else {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                    });
                });
            });
        });
    }

    @test 'BMI (Branch on MInus) $30'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isNegativeTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isNegativeTestValue) {
                            testReg.p |= StatusFlag.Negative;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Negative);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bmiOpcode());
                        if (isNegativeTestValue) {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                        else {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                    });
                });
            });
        });
    }

    @test 'BVC (Branch on oVerflow Clear) $50'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isInOverflowTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isInOverflowTestValue) {
                            testReg.p |= StatusFlag.Overflow;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Overflow);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bvcOpcode());
                        if (isInOverflowTestValue) {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                        else {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                    });
                });
            });
        });
    }

    @test 'BVS (Branch on oVerflow Set) $70'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isInOverflowTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isInOverflowTestValue) {
                            testReg.p |= StatusFlag.Overflow;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Overflow);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bvsOpcode());
                        if (isInOverflowTestValue) {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                        else {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                    });
                });
            });
        });
    }

    @test 'BCC (Branch on Carry Clear) $90'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isInCarryTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isInCarryTestValue) {
                            testReg.p |= StatusFlag.Carry;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Carry);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bccOpcode());
                        if (isInCarryTestValue) {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                        else {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                    });
                });
            });
        });
    }

    @test 'BCS (Branch on Carry Set) $B0'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isInCarryTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isInCarryTestValue) {
                            testReg.p |= StatusFlag.Carry;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Carry);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bcsOpcode());
                        if (isInCarryTestValue) {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                        else {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                    });
                });
            });
        });
    }

    @test 'BNE (Branch on Not Equal) $D0'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isEqualTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isEqualTestValue) {
                            testReg.p |= StatusFlag.Zero;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Zero);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.bneOpcode());
                        if (isEqualTestValue) {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                        else {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                    });
                });
            });
        });
    }

    @test 'BEQ (Branch on EQual) $F0'() {
        // this opcode only uses REL address mode
        [false, true].forEach((isEqualTestValue) => {
            [0x00, 0x01, 0x02, 0x0F, 0xF0, 0xFF].forEach((relAddrTestData) => {
                [0x0000, 0x00FF, 0x0100, 0xFFFE, 0xFFFF].forEach((theTestAddr) => {
                    [false, true].forEach((isDefaultOn) => {
                        this.performRelativeAddr(relAddrTestData);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.pc = theTestAddr;
                        if (isEqualTestValue) {
                            testReg.p |= StatusFlag.Zero;
                        }
                        else {
                            testReg.p &= (~StatusFlag.Zero);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(0, this.op.beqOpcode());
                        if (isEqualTestValue) {
                            assert.equal(this.op.reg.pc, (testReg.pc + this.op.stash.addr) & 0xFFFF);
                        }
                        else {
                            assert.equal(this.op.reg.pc, testReg.pc);
                        }
                    });
                });
            });
        });
    }
}

@suite class ProcessorStatusOpCodeTests extends BaseOpCodeTests {
    @test 'CLC (CLear Carry) $18' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.clcOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Carry), false);
            testReg.p &= (~StatusFlag.Carry);
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'SEC (SEt Carry) $38' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.secOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Carry), true);
            testReg.p |= StatusFlag.Carry;
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'CLI (CLear Interrupt) $58' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.cliOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Interrupt), false);
            testReg.p &= (~StatusFlag.Interrupt);
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'SEI (SEt Interrupt) $78' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.seiOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Interrupt), true);
            testReg.p |= StatusFlag.Interrupt;
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'CLV (CLear oVerflow) $B8' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.clvOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Overflow), false);
            testReg.p &= (~StatusFlag.Overflow);
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'CLD (CLear Decimal) $D8' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.cldOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Decimal), false);
            testReg.p &= (~StatusFlag.Decimal);
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'SED (SEt Decimal) $F8' () {
        [false, true].forEach((isDefaultOn) => {
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);
            assert.equal(0, this.op.sedOpcode());
            assert.equal(this.op.reg.isFlag(StatusFlag.Decimal), true);
            testReg.p |= StatusFlag.Decimal;
            this.checkOpRegisters(testReg, true);
        });
    }
}

@suite class RegisterOpCodeTests extends BaseOpCodeTests {

    @test 'TAX (Transfer A to X) $AA'() {
        // a set of register A values
        [0x00, 0xFF, 0xAA, 0x55, 0x88].forEach((regAValue) => {
            // test the register with all zeros and all bits set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.a = regAValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.taxOpcode()); // execute and check additional cycles
                assert.equal(this.op.reg.x, regAValue);
                this.checkNZFlags(isDefaultOn, 
                    (regAValue & 0x80) == 0x80, 
                    regAValue == 0x00);
                testReg.x = regAValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'TAY (Transfer A to Y) $A8'() {
        // a set of register A values
        [0x00, 0xFF, 0xAA, 0x55, 0x88].forEach((regAValue) => {
            // test the register with all zeros and all bits set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.a = regAValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.tayOpcode()); // execute and check additional cycles
                assert.equal(this.op.reg.y, regAValue);
                this.checkNZFlags(isDefaultOn, 
                    (regAValue & 0x80) == 0x80, 
                    regAValue == 0x00);
                testReg.y = regAValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'TXA (Transfer X to A) $8A'() {
        // a set of register X values
        [0x00, 0xFF, 0xAA, 0x55, 0x88].forEach((regXValue) => {
            // test the register with all zeros and all bits set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.x = regXValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.txaOpcode()); // execute and check additional cycles
                assert.equal(this.op.reg.a, regXValue);
                this.checkNZFlags(isDefaultOn, 
                    (regXValue & 0x80) == 0x80, 
                    regXValue == 0x00);
                testReg.a = regXValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'TYA (Transfer Y to A) $98'() {
        // a set of register Y values
        [0x00, 0xFF, 0xAA, 0x55, 0x88].forEach((regYValue) => {
            // test the register with all zeros and all bits set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.y = regYValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.tyaOpcode()); // execute and check additional cycles
                assert.equal(this.op.reg.a, regYValue);
                this.checkNZFlags(isDefaultOn, 
                    (regYValue & 0x80) == 0x80, 
                    regYValue == 0x00);
                testReg.a = regYValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'DEX (DEcrement X) $CA'() {
        // a set of register X values
        [0x00, 0xFF, 0x7F, 0x80, 0xAA, 0x55, 0x88].forEach((regXValue) => {
            var expXValue = regXValue - 1;
            if (expXValue < 0) {
                expXValue = 0xFF;
            }

            // test the register with all 0's and all 1's set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.x = regXValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.dexOpcode()); // execute and check additional cycles
                assert.equal(expXValue, this.op.reg.x);
                this.checkNZFlags(isDefaultOn, 
                    (expXValue & 0x80) == 0x80, 
                    expXValue == 0x00);
                testReg.x = expXValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'DEY (DEcrement Y) $88'() {
        // a set of register Y values
        [0x00, 0xFF, 0x7F, 0x80, 0xAA, 0x55, 0x88].forEach((regYValue) => {
            var expXValue = regYValue - 1;
            if (expXValue < 0) {
                expXValue = 0xFF;
            }

            // test the register with all 0's and all 1's set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.y = regYValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.deyOpcode()); // execute and check additional cycles
                assert.equal(expXValue, this.op.reg.y);
                this.checkNZFlags(isDefaultOn, 
                    (expXValue & 0x80) == 0x80, 
                    expXValue == 0x00);
                testReg.y = expXValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }
    
    @test 'INX (INcrement X) $E8'() {
        // a set of register X values
        [0x00, 0xFF, 0x7F, 0x80, 0xAA, 0x55, 0x88].forEach((regXValue) => {
            var expXValue = regXValue + 1;
            if (expXValue > 0xFF) {
                expXValue = 0x00;
            }

            // test the register with all 0's and all 1's set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.x = regXValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.inxOpcode()); // execute and check additional cycles
                assert.equal(expXValue, this.op.reg.x);
                this.checkNZFlags(isDefaultOn, 
                    (expXValue & 0x80) == 0x80, 
                    expXValue == 0x00);
                testReg.x = expXValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'INY (INcrement Y) $C8'() {
        // a set of register Y values
        [0x00, 0xFF, 0x7F, 0x80, 0xAA, 0x55, 0x88].forEach((regYValue) => {
            var expXValue = regYValue + 1;
            if (expXValue > 0xFF) {
                expXValue = 0x00;
            }

            // test the register with all 0's and all 1's set
            [false, true].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.y = regYValue;
                this.setOpRegisters(testReg);
                assert.equal(0, this.op.inyOpcode()); // execute and check additional cycles
                assert.equal(expXValue, this.op.reg.y);
                this.checkNZFlags(isDefaultOn, 
                    (expXValue & 0x80) == 0x80, 
                    expXValue == 0x00);
                testReg.y = expXValue;
                this.checkOpRegisters(testReg, false);
            })
        });
    }

    @test 'INC (INCrement)'() {
        // a set of register Y values
        [0x00, 0xFF, 0x7F, 0x80, 0xAA, 0x55, 0x88].forEach((regValue) => {
            [false, true].forEach((isDefaultOn) => {
                // setup
                this.op.memory[0x1234] = regValue;
                this.op.stash.addr = 0x1234;
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                this.setOpRegisters(testReg);

                // execute
                assert.equal(this.op.incOpcode(), 0);

                this.checkOpRegisters(testReg, false);
                var expected = regValue + 1;
                if (expected > 0xFF) {
                    expected = 0;
                }
                this.checkNZFlags(isDefaultOn,
                    (expected & 0x80) == 0x80,
                    expected == 0x00);
            })
        });
    }

    @test 'DEC (DECrement)'() {
        // a set of register Y values
        [0x00, 0xFF, 0x7F, 0x80, 0xAA, 0x55, 0x88].forEach((regValue) => {
            [false, true].forEach((isDefaultOn) => {
                // setup
                this.op.memory[0x1234] = regValue;
                this.op.stash.addr = 0x1234;
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                this.setOpRegisters(testReg);

                // execute
                assert.equal(this.op.decOpcode(), 0);

                this.checkOpRegisters(testReg, false);
                var expected = regValue - 1;
                if (expected < 0x00) {
                    expected = 0xFF;
                }
                this.checkNZFlags(isDefaultOn,
                    (expected & 0x80) == 0x80,
                    expected == 0x00);
            })
        });
    }
}

@suite class MathOpCodeTests extends BaseOpCodeTests {
    setMemoryAndAddr = (theAddr: number, theValue: number) => {
        this.op.memory[theAddr] = theValue;
        this.op.stash.addr = theAddr;
    }

    setAllStatusFlags = () => {
        this.op.reg.p = 0xFF;
    }

    clearAllStatusFlags = () => {
        this.op.reg.p = 0;
    }

    checkStatusFlags(expValue: number) {
        assert.equal(this.op.reg.p, expValue, `got: ${this.op.reg.p.toString(2).padStart(8, '0')}, expected: ${expValue.toString(2).padStart(8, '0')}`);
    }

    @test 'SBC'() {
        // 0xFF - 0x01 w/ Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFEE, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0xFF;
        let penalty = this.op.sbcOpcode();
        assert.equal(this.op.reg.a, 0xFE);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Negative | StatusFlag.Carry);
        assert.equal(penalty, 1);

        // 0xFF - 0x01 w/o Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFEF, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, false);
        this.op.reg.a = 0xFF;
        penalty = this.op.sbcOpcode();
        assert.equal(this.op.reg.a, 0xFD);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Negative | StatusFlag.Carry);
        assert.equal(penalty, 1);

        // 0x01 - 0x01 w/o Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF0, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, false);
        this.op.reg.a = 0x01;
        penalty = this.op.sbcOpcode();
        assert.equal(this.op.reg.a, 0xFF);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Negative);
        assert.equal(penalty, 1);

        // 0x01 - 0x01 w Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF1, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0x01;
        penalty = this.op.sbcOpcode();
        assert.equal(this.op.reg.a, 0x00);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Zero | StatusFlag.Carry);
        assert.equal(penalty, 1);

        // -127 - 1
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF1, 0xFF);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0x7F;
        penalty = this.op.sbcOpcode();
        assert.equal(this.op.reg.a, 0x80);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Overflow | StatusFlag.Negative);
        assert.equal(penalty, 1);

        // -128 - 127
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF1, 0x7F);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0x80;
        penalty = this.op.sbcOpcode();
        assert.equal(this.op.reg.a, 0x01);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Overflow | StatusFlag.Carry);
        assert.equal(penalty, 1);
        
        assert.deepEqual(this.op.readDataHistory,
            [
                { addr: 65518, value: 0x01 },
                { addr: 65519, value: 0x01 },
                { addr: 65520, value: 0x01 },
                { addr: 65521, value: 0x01 },
                { addr: 65521, value: 0xFF },
                { addr: 65521, value: 0x7F }
            ]);
        assert.deepEqual(this.op.writeDataHistory, []);
    }

    @test 'ADC'() {
        // 0xFF + 0x01 w/ Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFEE, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0xFF;
        let penalty = this.op.adcOpcode();
        assert.equal(this.op.reg.a, 0x01);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Carry);
        assert.equal(penalty, 1);

        // 0xFF = 0x01 w/o Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFEF, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, false);
        this.op.reg.a = 0xFF;
        penalty = this.op.adcOpcode();
        assert.equal(this.op.reg.a, 0x00);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Zero | StatusFlag.Carry);
        assert.equal(penalty, 1);

        // 0x01 + 0x01 w/o Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF0, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, false);
        this.op.reg.a = 0x01;
        penalty = this.op.adcOpcode();
        assert.equal(this.op.reg.a, 0x02);
        assert.equal(this.op.reg.p, 0b00000000);
        assert.equal(penalty, 1);

        // 0x01 + 0x01 w Carry Set
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF1, 0x01);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0x01;
        penalty = this.op.adcOpcode();
        assert.equal(this.op.reg.a, 0x03);
        assert.equal(this.op.reg.p, 0b00000000);
        assert.equal(penalty, 1);

        // -127 + 1
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF1, 0xFF);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0x7F;
        penalty = this.op.adcOpcode();
        assert.equal(this.op.reg.a, 0x7F);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Carry);
        assert.equal(penalty, 1);

        // -128 + 127
        this.clearAllStatusFlags();
        this.setMemoryAndAddr(0xFFF1, 0x7F);
        this.op.reg.setStatusFlag(StatusFlag.Carry, true);
        this.op.reg.a = 0x80;
        penalty = this.op.adcOpcode();
        assert.equal(this.op.reg.a, 0x00);
        assert.equal(this.op.reg.p, 0b00000000 | StatusFlag.Zero | StatusFlag.Carry);
        assert.equal(penalty, 1);
        
        assert.deepEqual(this.op.readDataHistory,
            [
                { addr: 65518, value: 0x01 },
                { addr: 65519, value: 0x01 },
                { addr: 65520, value: 0x01 },
                { addr: 65521, value: 0x01 },
                { addr: 65521, value: 0xFF },
                { addr: 65521, value: 0x7F }
            ]);
        assert.deepEqual(this.op.writeDataHistory, []);
    }
}

@suite class InterruptJumpAndSubroutineTests extends BaseOpCodeTests {
    @test 'BRK (BReaK) and RTI (ReTurn from Interrupt)'() {
        [true, false].forEach((isDefaultOn) => {
            // setup
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            testReg.sp = 0xFF;  // set to the default
            testReg.pc = 0x3456;
            this.setOpRegisters(testReg);
            this.op.memory[0xFFFE] = 0x11;
            this.op.memory[0xFFFF] = 0x22;

            // execute brk
            assert.equal(this.op.brkOpcode(), 0);

            // check brk
            assert.equal(this.op.reg.sp, testReg.sp - 3);
            assert.equal(this.op.reg.pc, 0x2211); // pc should be the value found at 0xFFFE / 0xFFFF
            assert.equal(this.op.memory[testReg.sp + 0x0100], testReg.pc >> 8); // upper half of pc
            assert.equal(this.op.memory[testReg.sp + 0x0100 - 1], (testReg.pc + 1) & 0xFF); // pc is incremented before the save
            assert.equal(this.op.memory[testReg.sp + 0x0100 - 2], testReg.p | StatusFlag.Break);
            assert.equal(this.op.reg.p, testReg.p | StatusFlag.Interrupt);

            // execute rti
            assert.equal(this.op.rtiOpcode(), 0);

            // check rti
            assert.equal(this.op.reg.p, testReg.p | StatusFlag.Break);
            assert.equal(this.op.reg.pc, testReg.pc + 1);
            assert.equal(this.op.reg.sp, testReg.sp);
        });
    }

    @test 'JMP (JuMP)'() {
        [0x0000, 0xFFFF, 0xA510].forEach((destAddr) => {
            [true, false].forEach((isDefaultOn) => {
                // setup
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                this.op.stash.addr = destAddr;
                this.setOpRegisters(testReg);
    
                // execute jmp
                assert.equal(this.op.jmpOpcode(), 0);
                assert.equal(this.op.reg.pc, destAddr);

                // check
                testReg.pc = destAddr;
                this.checkOpRegisters(testReg, true);
            });
        });
    }

    @test 'JSR (Jump to SubRoutine) and RTS (ReTurn from Subroutine)'() {
        [0x0010, 0xFF00, 0xA510].forEach((destAddr) => {
            [true, false].forEach((isDefaultOn) => {
                // setup
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                this.op.stash.addr = destAddr;
                testReg.sp = 0xFF;
                testReg.pc = 0x4567
                this.setOpRegisters(testReg);
    
                // execute jrs
                assert.equal(this.op.jsrOpcode(), 0);
                assert.equal(this.op.reg.pc, destAddr);

                // check
                assert.equal(this.op.memory[testReg.sp + 0x0100], 0x45);
                assert.equal(this.op.memory[testReg.sp + 0x0100 - 1], 0x66);
                testReg.pc = destAddr;
                testReg.sp -= 2;
                this.checkOpRegisters(testReg, true);

                // execute rts
                assert.equal(this.op.rtsOpcode(), 0);
                assert.equal(this.op.reg.pc, 0x4567);
                testReg.pc = 0x4567;
                testReg.sp = 0xFF;
                this.checkOpRegisters(testReg, true);
            });
        });
    }
}

@suite class IllegalAndNopTests extends BaseOpCodeTests {
    @test 'nop'() {
        [true, false].forEach((isDefaultOn) => {
            // setup
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);

            // execute
            assert.equal(this.op.nopOpcode(), 0);

            // check
            this.checkOpRegisters(testReg, true);
        });
    }

    @test 'illegal op code'() {
        [true, false].forEach((isDefaultOn) => {
            // setup
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            this.setOpRegisters(testReg);

            // execute
            expect(() => {this.op.illegalOpcode()}).to.throw('illegal opcode used');

            // check
            this.checkOpRegisters(testReg, true);
        });
    }
}

@suite class RegistersOnStackTests extends BaseOpCodeTests {
    @test 'TXS (Transfer X to Stack ptr)'() {
        [true, false].forEach((isDefaultOn) => {
            // setup
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            [0x00, 0x01, 0x7f, 0xFF].forEach((regValue) => {
                testReg.x = regValue;
                this.setOpRegisters(testReg);

                // execute
                assert.equal(this.op.txsOpcode(), 0);
    
                // check
                testReg.sp = testReg.x;
                this.checkOpRegisters(testReg, true);
            });
        });
    }

    @test 'TSX (Transfer Stack ptr to X)'() {
        [true, false].forEach((isDefaultOn) => {
            // setup
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            [0x00, 0x01, 0x7f, 0xFF].forEach((regValue) => {
                testReg.sp = regValue;
                this.setOpRegisters(testReg);

                // execute
                assert.equal(this.op.tsxOpcode(), 0);
    
                // check
                testReg.x = testReg.sp;
                this.checkOpRegisters(testReg, false);
                this.checkNZFlags(isDefaultOn,
                    (testReg.x & 0x80) == 0x80,
                    testReg.x == 0x00
                    )
            });
        });
    }

    @test 'PHA (PusH Accumulator) and PLA (PuLl Accumulator)'() {
        [true, false].forEach((isDefaultOn) => {
            [0x00, 0xFF, 0x5A].forEach((theAValue) => {
                // setup
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.sp = 0xFF;
                testReg.a = theAValue;
                this.setOpRegisters(testReg);

                // execute
                assert.equal(this.op.phaOpcode(), 0);

                // check
                testReg.sp--;
                this.checkOpRegisters(testReg, true);
                assert.equal(this.op.memory[this.op.reg.sp + 0x0100 + 1], theAValue);

                // setup for pulling it back
                this.op.reg.a = ~(this.op.reg.a);

                // execute
                assert.equal(this.op.plaOpcode(), 0);

                // check
                testReg.sp++;
                this.checkOpRegisters(testReg, false);
                assert.equal(this.op.reg.sp, 0xFF);
                this.checkNZFlags(isDefaultOn, 
                    (theAValue & 0x80) == 0x80,
                    theAValue == 0x00);
            });
        });
    }

    @test 'PHP (PusH Processor status) and PLP (PuLl Processor status)'() {
        [true, false].forEach((isDefaultOn) => {
            // setup
            let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
            testReg.sp = 0xFF;
            this.setOpRegisters(testReg);

            // execute
            assert.equal(this.op.phpOpcode(), 0);

            // check
            testReg.sp--;
            this.checkOpRegisters(testReg, true);
            assert.equal(this.op.memory[this.op.reg.sp + 0x0100 + 1], testReg.p | StatusFlag.Break);

            // setup for pulling it back
            this.op.reg.p = ~(this.op.reg.p);

            // execute
            assert.equal(this.op.plpOpcode(), 0);

            // check
            testReg.sp++;
            testReg.p |= StatusFlag.Break | StatusFlag.Constant;
            this.checkOpRegisters(testReg, true);
            assert.equal(this.op.reg.sp, 0xFF);
        });
    }
}

@suite class MemoryTests extends BaseOpCodeTests {

    @test 'LDA (LoaD the Accumulator and STA (STore the Accumulator'() {
        [true, false].forEach((isDefaultOn) => {
            [0x00, 0x10, 0x56, 0x98, 0xFE, 0xFF].forEach((theAValue) => {
                [0x0200, 0x0300, 0x0400].forEach((theAddr) => {
                    // setup
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    testReg.a = theAValue;
                    this.setOpRegisters(testReg);
                    this.op.stash.addr = theAddr;

                    // execute
                    assert.equal(this.op.staOpcode(), 0);

                    // verify
                    assert.equal(this.op.memory[theAddr], theAValue);
                    this.checkOpRegisters(testReg, true);

                    // setup for LDA
                    testReg.a = ~(theAValue);

                    // execute
                    assert.equal(this.op.ldaOpcode(), 1);

                    // verify
                    assert.equal(this.op.reg.a, theAValue);
                    testReg.a = theAValue;
                    this.checkOpRegisters(testReg, false);
                    this.checkNZFlags(isDefaultOn,
                        (theAValue & 0x80) == 0x80,
                        theAValue == 0x00);

                });
            });
        });
    }

    @test 'LDX (LoaD the X and STX (STore the X'() {
        [true, false].forEach((isDefaultOn) => {
            [0x00, 0x10, 0x56, 0x98, 0xFE, 0xFF].forEach((theXValue) => {
                [0x0200, 0x0300, 0x0400].forEach((theAddr) => {
                    // setup
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    testReg.x = theXValue;
                    this.setOpRegisters(testReg);
                    this.op.stash.addr = theAddr;

                    // execute
                    assert.equal(this.op.stxOpcode(), 0);

                    // verify
                    assert.equal(this.op.memory[theAddr], theXValue);
                    this.checkOpRegisters(testReg, true);

                    // setup for LDA
                    testReg.x = ~(theXValue);

                    // execute
                    assert.equal(this.op.ldxOpcode(), 1);

                    // verify
                    assert.equal(this.op.reg.x, theXValue);
                    testReg.x = theXValue;
                    this.checkOpRegisters(testReg, false);
                    this.checkNZFlags(isDefaultOn,
                        (theXValue & 0x80) == 0x80,
                        theXValue == 0x00);
                });
            });
        });
    }

    @test 'LDY (LoaD the Y and STY (STore the Y'() {
        [true, false].forEach((isDefaultOn) => {
            [0x00, 0x10, 0x56, 0x98, 0xFE, 0xFF].forEach((theYValue) => {
                [0x0200, 0x0300, 0x0400].forEach((theAddr) => {
                    // setup
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    testReg.y = theYValue;
                    this.setOpRegisters(testReg);
                    this.op.stash.addr = theAddr;

                    // execute
                    assert.equal(this.op.styOpcode(), 0);

                    // verify
                    assert.equal(this.op.memory[theAddr], theYValue);
                    this.checkOpRegisters(testReg, true);

                    // setup for LDA
                    testReg.y = ~(theYValue);

                    // execute
                    assert.equal(this.op.ldyOpcode(), 1);

                    // verify
                    assert.equal(this.op.reg.y, theYValue);
                    testReg.y = theYValue;
                    this.checkOpRegisters(testReg, false);
                    this.checkNZFlags(isDefaultOn,
                        (theYValue & 0x80) == 0x80,
                        theYValue == 0x00);
                });
            });
        });
    }}

@suite class BitOpCodeTests extends BaseOpCodeTests {
    setMemoryAndAddr = (theAddr: number, theValue: number) => {
        this.op.memory[theAddr] = theValue;
        this.op.stash.addr = theAddr;
    }

    setAllStatusFlags = () => {
        this.op.reg.p = 0xFF;
    }

    clearAllStatusFlags = () => {
        this.op.reg.p = 0;
    }

    checkStatusFlags(expValue: number) {
        assert.equal(this.op.reg.p, expValue, `got: ${this.op.reg.p.toString(2).padStart(8, '0')}, expected: ${expValue.toString(2).padStart(8, '0')}`);
    }

    @test 'AND Zero Flag'() {
        this.setMemoryAndAddr(0xFF11, 0xEA);
        this.op.reg.a = 0x00;

        // all status flags set to 0
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        // all status flags set to 1
        this.setAllStatusFlags();
        clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags((0b11111111 & ~StatusFlag.Negative) | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        // a twos-compliment value in the A register
        this.op.reg.a = ~0xEA;
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        // a value of 0 in RAM and the A register
        this.setMemoryAndAddr(0xFF12, 0x00);
        this.op.reg.a = 0;
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        // a value of 0 in RAM and a non-zero value in the A register
        this.setMemoryAndAddr(0xFF12, 0x00);
        this.op.reg.a = 0x34;
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        // high order bit set in memory
        this.setMemoryAndAddr(0xFF13, 0xFF);
        this.op.reg.a = 0x00;
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        // high order bit set in the A register
        this.setMemoryAndAddr(0xFF13, 0x00);
        this.op.reg.a = 0xFF;
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Zero);
        assert.equal(this.op.reg.a, 0);

        assert.deepEqual(this.op.readDataHistory,
            [
                { addr: 0xFF11, value: 0xEA },
                { addr: 0xFF11, value: 0xEA },
                { addr: 0xFF11, value: 0xEA },
                { addr: 0xFF12, value: 0 },
                { addr: 0xFF12, value: 0 },
                { addr: 0xFF13, value: 0xFF },
                { addr: 0xFF13, value: 0 }
              ]);
        assert.deepEqual(this.op.writeDataHistory, []);
    }

    @test 'AND Negative Flag'() {
        this.setMemoryAndAddr(0xFF11, 0xEA);

        // all status flags set to 0
        this.clearAllStatusFlags();
        this.op.reg.a = 0xFB;
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Negative);
        assert.equal(this.op.reg.a, 0xEA);

        // all status flags set to 1
        this.setAllStatusFlags();
        clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags((0b11111111 & ~StatusFlag.Zero) | StatusFlag.Negative);
        assert.equal(this.op.reg.a, 0xEA);

        // only the high order bit set
        this.op.reg.a = 0x80;
        this.setMemoryAndAddr(0xFF12, 0x80);
        this.clearAllStatusFlags();
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000 | StatusFlag.Negative);
        assert.equal(this.op.reg.a, 0x80);

        assert.deepEqual(this.op.readDataHistory,
            [
                { addr: 65297, value: 234 },
                { addr: 65297, value: 234 },
                { addr: 65298, value: 128 }
            ]);
        assert.deepEqual(this.op.writeDataHistory, []);
    }    

    @test 'AND'() {
        // all status flags set to 0
        this.setMemoryAndAddr(0xFF11, 0xFF);
        this.clearAllStatusFlags();
        this.op.reg.a = 0x01;
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b00000000);
        assert.equal(this.op.reg.a, 0x01);

        // all status flags set to 1
        this.setMemoryAndAddr(0xFF11, 0x01);
        this.setAllStatusFlags();
        this.op.reg.a = 0xFF;
        var clockTicks = this.op.andOpcode();
        assert.equal(clockTicks, 1);
        this.checkStatusFlags(0b11111111 & ~(StatusFlag.Negative | StatusFlag.Zero));
        assert.equal(this.op.reg.a, 0x01);

        assert.deepEqual(this.op.readDataHistory,
            [
                { addr: 65297, value: 255 }, 
                { addr: 65297, value: 1 }
            ]);
        assert.deepEqual(this.op.writeDataHistory, []);
    }

    @test 'ROR (ROtate Right) canned value test w/ acc'() {
        var testReg = this.getRegisterWithDefaults(0x00);
        testReg.a = 0xFF;
        this.setOpRegisters(testReg);
        this.op.rorOpcode_acc();
        assert.equal(this.op.reg.a, 0x7F);
        assert((this.op.reg.p & StatusFlag.Carry) == StatusFlag.Carry);

        testReg = this.getRegisterWithDefaults(0x00);
        testReg.a = 0xFF;
        testReg.p |= StatusFlag.Carry;
        this.setOpRegisters(testReg);
        this.op.rorOpcode_acc();
        assert.equal(this.op.reg.a, 0xFF);
        assert((this.op.reg.p & StatusFlag.Carry) == StatusFlag.Carry);

        testReg = this.getRegisterWithDefaults(0x00);
        testReg.a = 0x01;
        testReg.p |= StatusFlag.Carry;
        this.setOpRegisters(testReg);
        this.op.rorOpcode_acc();
        assert.equal(this.op.reg.a, 0x80);
        assert((this.op.reg.p & StatusFlag.Carry) == StatusFlag.Carry);

        testReg = this.getRegisterWithDefaults(0x00);
        testReg.a = 0xFE;
        testReg.p |= StatusFlag.Carry;
        this.setOpRegisters(testReg);
        this.op.rorOpcode_acc();
        assert.equal(this.op.reg.a, 0xFF);
        assert((this.op.reg.p & StatusFlag.Carry) == 0x00);
    }

    @test 'ROR (ROtate Right) acc'() {
        [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theAValue) => {
            [true, false].forEach((isDefaultOn) => {
                [true, false].forEach((isCarryOn) => {
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    testReg.a = theAValue;
                    if (isCarryOn) {
                        testReg.p |= StatusFlag.Carry;
                    }
                    else {
                        testReg.p &= ~(StatusFlag.Carry);
                    }
                    this.setOpRegisters(testReg);
                    assert.equal(this.op.rorOpcode_acc(), 0);
                    let expectedResult = theAValue >> 1 | (isCarryOn ? 0x80 : 0x00) ;
                    assert.equal(this.op.reg.a, expectedResult);
                    testReg.a = expectedResult;
                    this.checkOpRegisters(testReg, false);
                    this.checkNZCVFlags(isDefaultOn, 
                        (expectedResult & 0x80) == 0x80, // Negative
                        expectedResult == 0x00, // Zero
                        (theAValue & 0x01) == 0x01, // Carry is the bit shifted out
                        isDefaultOn); // Overflow
                });
            });
        });
    }

    @test 'ROR (ROtate Right)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                [true, false].forEach((isDefaultOn) => {
                    [true, false].forEach((isCarryOn) => {
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        this.op.memory[theAddr] = theTestValue;
                        this.op.stash.addr = theAddr;
                        if (isCarryOn) {
                            testReg.p |= StatusFlag.Carry;
                        }
                        else {
                            testReg.p &= ~(StatusFlag.Carry);
                        }
                        this.setOpRegisters(testReg);
                        assert.equal(this.op.rorOpcode(), 0);
                        let expectedResult = (theTestValue >> 1 | (isCarryOn ? 0x80 : 0x00));
                        assert.equal(this.op.memory[theAddr], expectedResult);
                        this.checkOpRegisters(testReg, false);
                        this.checkNZCVFlags(isDefaultOn, 
                            (expectedResult & 0x80) == 0x80, // Negative
                            expectedResult == 0x00,
                            (theTestValue & 0x01) == 0x01, // Carry is the bit shifted out
                            isDefaultOn);
                    });
                });
            });
        });
    }

    @test 'EOR (bitwise Exclusive OR)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theAValue) => {
                [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                    [true, false].forEach((isDefaultOn) => {
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        testReg.a = theAValue;
                        this.op.memory[theAddr] = theTestValue;
                        this.op.stash.addr = theAddr;
                        this.setOpRegisters(testReg);
                        assert.equal(this.op.eorOpcode(), 1);
                        let expectedResult = theAValue ^ theTestValue;
                        assert.equal(this.op.reg.a, expectedResult);
                        testReg.a = expectedResult;
                        this.checkOpRegisters(testReg, false);
                        this.checkNZCVFlags(isDefaultOn, 
                            (expectedResult & 0x80) == 0x80, // Negative
                            expectedResult == 0x00, // Zero
                            isDefaultOn, // Carry
                            isDefaultOn);
                    });
                });
            });
        });
    }

    @test 'LSR (Logical Shift Right) acc'() {
        [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theAValue) => {
        [true, false].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.a = theAValue;
                this.setOpRegisters(testReg);
                assert.equal(this.op.lsrOpcode_acc(), 0);
                let expectedResult = ((theAValue >> 1) & 0xFF);
                assert.equal(this.op.reg.a, expectedResult);
                testReg.a = expectedResult;
                this.checkOpRegisters(testReg, false);
                this.checkNZCVFlags(isDefaultOn, 
                    false, // Negative is always false
                    expectedResult == 0x00, // Zero
                    (theAValue & 0x01) == 0x01, // Carry is the bit shifted out
                    isDefaultOn); // Overflow
            });
        });
    }

    @test 'LSR (Logical Shift Right)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                [true, false].forEach((isDefaultOn) => {
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    this.op.memory[theAddr] = theTestValue;
                    this.op.stash.addr = theAddr;
                    this.setOpRegisters(testReg);
                    assert.equal(this.op.lsrOpcode(), 0);
                    let expectedResult = ((theTestValue >> 1) & 0xFF);
                    assert.equal(this.op.memory[theAddr], expectedResult);
                    this.checkOpRegisters(testReg, false);
                    this.checkNZCVFlags(isDefaultOn, 
                        false,  // Negative is never set
                        expectedResult == 0x00,
                        (theTestValue & 0x01) == 0x01, // Carry is the bit shifted out
                        isDefaultOn);
                });
            });
        });
    }

    @test 'ROL (ROtate Left) acc'() {
        [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theAValue) => {
            [true, false].forEach((isDefaultOn) => {
                [true, false].forEach((isCarryOn) => {
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    testReg.a = theAValue;
                    if (isCarryOn) {
                        testReg.p |= StatusFlag.Carry;
                    }
                    else {
                        testReg.p &= ~(StatusFlag.Carry);
                    }
                    this.setOpRegisters(testReg);
                    assert.equal(this.op.rolOpcode_acc(), 0);
                    let expectedResult = ((theAValue << 1) & 0xFF) | (isCarryOn ? 0x01 : 0x00);
                    assert.equal(this.op.reg.a, expectedResult);
                    testReg.a = expectedResult;
                    this.checkOpRegisters(testReg, false);
                    this.checkNZCVFlags(isDefaultOn, 
                        (expectedResult & 0x80) == 0x80, // Negative
                        expectedResult == 0x00, // Zero
                        (theAValue & 0x80) == 0x80, // Carry
                        isDefaultOn); // Overflow
                });
            });
        });
    }

    @test 'ROL (ROtate Left)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                [true, false].forEach((isDefaultOn) => {
                    [true, false].forEach((isCarryOn) => {
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        this.op.memory[theAddr] = theTestValue;
                        this.op.stash.addr = theAddr;
                        if (isCarryOn) {
                            testReg.p |= StatusFlag.Carry;
                        }
                        else {
                            testReg.p &= ~(StatusFlag.Carry);
                        }
                            this.setOpRegisters(testReg);
                        assert.equal(this.op.rolOpcode(), 0);
                        let expectedResult = ((theTestValue << 1) & 0xFF) | (isCarryOn ? 0x01 : 0x00);
                        assert.equal(this.op.memory[theAddr], expectedResult);
                        this.checkOpRegisters(testReg, false);
                        this.checkNZCVFlags(isDefaultOn, 
                            (expectedResult & 0x80) == 0x80,
                            expectedResult == 0x00,
                            (theTestValue & 0x80) == 0x80,
                            isDefaultOn);
                    });
                });
            });
        });
    }


    @test 'ASL (Arithmetic Shift Left) acc'() {
        [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theAValue) => {
            [true, false].forEach((isDefaultOn) => {
                let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                testReg.a = theAValue;
                this.setOpRegisters(testReg);
                assert.equal(this.op.aslOpcode_acc(), 0);
                let expectedResult = (theAValue << 1) & 0xFF;
                assert.equal(this.op.reg.a, expectedResult);
                testReg.a = expectedResult;
                this.checkOpRegisters(testReg, false);
                this.checkNZCVFlags(isDefaultOn, 
                    (expectedResult & 0x80) == 0x80,
                    expectedResult == 0x00,
                    (theAValue & 0x80) == 0x80,
                    isDefaultOn);
            });
        });
    }

    @test 'ASL (Arithmetic Shift Left)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                [true, false].forEach((isDefaultOn) => {
                    let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                    this.op.memory[theAddr] = theTestValue;
                    this.op.stash.addr = theAddr;
                    this.setOpRegisters(testReg);
                    assert.equal(this.op.aslOpcode(), 0);
                    let expectedResult = (theTestValue << 1) & 0xFF;
                    assert.equal(this.op.memory[theAddr], expectedResult);
                    this.checkOpRegisters(testReg, false);
                    this.checkNZCVFlags(isDefaultOn, 
                        (expectedResult & 0x80) == 0x80,
                        expectedResult == 0x00,
                        (theTestValue & 0x80) == 0x80,
                        isDefaultOn);
                });
            });
        });
    }

    @test 'ORA (bitwise OR with Accumulator)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                [0x00, 0xFE, 0x55, 0xAA, 0xFF, 0x80, 0x7F, 0x81].forEach((theAValue) => {
                    [true, false].forEach((isDefaultOn) => {
                        // console.log(`addr: ${theAddr}, test: ${theTestValue}, a: ${theAValue}`);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        this.op.memory[theAddr] = theTestValue;
                        this.op.stash.addr = theAddr;
                        testReg.a = theAValue;
                        this.setOpRegisters(testReg);
                        assert.equal(this.op.oraOpcode(), 1);
                        let expectedResult = (theTestValue | theAValue) & 0xFF;
                        assert.equal(this.op.reg.a, expectedResult);
                        testReg.a = expectedResult;
                        this.checkOpRegisters(testReg, false);
                        this.checkNZCVFlags(isDefaultOn, 
                            (expectedResult & 0x80) == 0x80, // Negative
                            expectedResult == 0x00, // Zero
                            (testReg.p & StatusFlag.Carry) == StatusFlag.Carry,
                            isDefaultOn); // Carry should not be changed
                    });
                });
            });
        });
    }

    /**
     * BIT sets the Z flag as though the value in the address tested were 
     * ANDed with the accumulator. The N and V flags are set to match bits 7 and 6 
     * respectively in the value stored at the tested address.
     */
    @test 'BIT (test BITs)'() {
        [0x1111, 0x3000].forEach((theAddr) => {
            [0x00, 0x01, 0x02, 0x04, 0x08, 0x80, 0xFF, 0xA5].forEach((theTestValue) => {
                [0x00, 0xFE, 0x55, 0xAA, 0xFF, 0x80, 0x7F, 0x81].forEach((theAValue) => {
                    [true, false].forEach((isDefaultOn) => {
                        // console.log(`addr: ${theAddr}, test: ${theTestValue}, a: ${theAValue}`);
                        let testReg = this.getRegisterWithDefaults(isDefaultOn ? 0xFF : 0x00);
                        this.op.memory[theAddr] = theTestValue;
                        this.op.stash.addr = theAddr;
                        testReg.a = theAValue;
                        this.setOpRegisters(testReg);
                        assert.equal(this.op.bitOpcode(), 0);
                        let testResult = (theTestValue & theAValue) & 0xFF;
                        if ((theTestValue & StatusFlag.Overflow) == StatusFlag.Overflow) {
                            testReg.p |= StatusFlag.Overflow;
                        }
                        else {
                            testReg.p &= ~(StatusFlag.Overflow);
                        }
                        this.checkOpRegisters(testReg, false);
                        this.checkNZCVFlags(isDefaultOn, 
                            (theTestValue & StatusFlag.Negative) == StatusFlag.Negative, // special handling Negative
                            testResult == 0x00, // Zero check
                            (testReg.p & StatusFlag.Carry) == StatusFlag.Carry, // Carry should not be changed
                            (theTestValue & StatusFlag.Overflow) == StatusFlag.Overflow
                            ); 
                    });
                });
            });
        });
    }
}