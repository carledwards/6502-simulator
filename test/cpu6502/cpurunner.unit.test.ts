import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { expect, assert } from 'chai';
import { BusCpuAction } from '../../src/bus-cpu-action';
import { Config, CpuRunner } from '../../src/cpu6502/cpu-runner';
import { AddressMode, StatusFlag } from '../../src/cpu6502/internals';
import { P2ClockListener } from '../../src/p2-clock-listener';

_chai.should();


class MyBusOperations implements BusCpuAction {
    readDataHistory: any[] = [];
    writeDataHistory: any[] = [];
    readDataBuffer: number[] = [];
    nmi = false;
    irq = false;

    isNmi(): boolean {
        let val = this.nmi;
        this.nmi = false;
        return val;
    }

    isIrq(): boolean {
        let val = this.irq;
        this.irq = false;
        return val;
    }

    writeData(addr: number, data: number): void {
        this.writeDataHistory.push({addr: addr, data: data});
    }

    readData(addr: number): number {
        if (this.readDataBuffer.length == 0) {
            throw new Error (`readData: addr not found: ${addr.toString(16)}`);
        }
        let val = this.readDataBuffer.pop();
        this.readDataHistory.push({addr: addr, data: val});
        return val;
    }
}

class MyP2ClockTickListener implements P2ClockListener {
    clockTickCount = 0;

    onP2ClockTick(): void {
        this.clockTickCount++;
    }
}

class My6502Internals {
    opCodePenaltyCycle = 0;
    addressModePenaltyCycle = 0;

    constructor(penaltyCycle: number, addressModePenaltyCycle: number) {
        this.opCodePenaltyCycle = penaltyCycle;
        this.addressModePenaltyCycle = addressModePenaltyCycle;
    }

    testOpcode= ()=> {
        return this.opCodePenaltyCycle;
    }

    testAddrMode= ()=> {
        return this.addressModePenaltyCycle;
    }
}

@suite class CpuRunnerTests {
    busOps: MyBusOperations;

    createCpuRunner(theConfig: Config): CpuRunner {
        let runner = new CpuRunner(theConfig);
        runner.setP2ClockListener(new MyP2ClockTickListener());
        return runner;
    }

    before() {
        this.busOps = new MyBusOperations();
    }

    executeRemainingClockTicks(runner: CpuRunner): number {
        var retVal = runner.remainingCycles;
        for (var i = 0; i < retVal; i++) {
            runner.onClockTick();
        }
        return retVal;
    }

    @test 'reset with startAddr in config'() {
        let runner = this.createCpuRunner({startAddr: 0x0400});
        runner.remainingCycles = 12;

        assert.equal(runner.reg.pc, 0);
        runner.onReset();
        assert.equal(runner.reg.pc, 0x0400);
        assert.equal(runner.remainingCycles, 8); // reset always takes 8 cycles
    }

    @test 'irq'() {
        let runner = this.createCpuRunner(
            {
                startAddr: 0x0400,
            });
        let events = [];
        runner.on("irq", (currentPc: number) => {
            events.push({"event": "irq", currentPc: currentPc});
        });
        runner.on("nmi", (currentPc: number) => {
            events.push({"event": "nmi", currentPc: currentPc});
        });
        runner.setBusOperations(this.busOps);

        // perform reset
        runner.onReset();
        this.executeRemainingClockTicks(runner);

        // execute one instruction
        this.busOps.readDataBuffer.push(0xEA);
        runner.onClockTick();
        this.executeRemainingClockTicks(runner);

        // set we have an IRQ (but the interrupt flag is turned from a reset)
        assert.equal(runner.reg.isFlag(StatusFlag.Interrupt), true);
        assert.equal(runner.reg.pc, 0x0401);
        this.busOps.readDataBuffer.push(0x02);
        this.busOps.irq = true;
        runner.onClockTick();
        assert.equal(runner.reg.pc, 0x0402); // normal non-interrupt execution
        assert.equal(this.busOps.irq, false); // flag was reset

        // enable interrupts and check that IRQ is not executed with remaining cycles
        assert.equal(runner.remainingCycles, 1); // still have 1 cycle remaining
        runner.reg.setStatusFlag(StatusFlag.Interrupt, false);
        this.busOps.irq = true;
        runner.onClockTick(); // execute remaining cycle
        assert.equal(runner.reg.pc, 0x0402); // pc didn't change
        assert.equal(this.busOps.irq, true); // flag is still set
        assert.equal(runner.remainingCycles, 0); // no more cycles

        // execute the IRQ
        this.busOps.readDataBuffer.push(0x12);
        this.busOps.readDataBuffer.push(0x34);
        runner.onClockTick();
        assert.equal(runner.remainingCycles, 7); // irq cycles
        assert.equal(runner.reg.pc, 0x1234); // irq
        assert.equal(runner.reg.isFlag(StatusFlag.Break), false);
        assert.equal(runner.reg.isFlag(StatusFlag.Interrupt), true);
        assert.equal(runner.reg.isFlag(StatusFlag.Constant), true);
        assert.equal(this.busOps.irq, false); // flag was reset

        // execute the next instruction at the IRQ PC
        this.executeRemainingClockTicks(runner);
        this.busOps.readDataBuffer.push(0x0B); // another No op
        runner.onClockTick();

        assert.deepEqual(this.busOps.readDataHistory,
            [
                { addr: 0x0400, data: 0xEA }, // Nop
                { addr: 0x0401, data: 0x02 }, // Nop
                { addr: 0xFFFE, data: 0x34 }, // IRQ lo byte
                { addr: 0xFFFF, data: 0x12 }, // IRQ hi byte
                { addr: 0x1234, data: 0x0B }  // Nop
            ]);
        assert.deepEqual(this.busOps.writeDataHistory,
            [
                { addr: 0x01FF, data: 0x04 }, // current PC hi byte
                { addr: 0x01FE, data: 0x02 }, // current PC lo byte
                { addr: 0x01FD, data: 0x20 }, // current status flags
            ]);
        assert.deepEqual(events, 
            [
                {"event": "irq", "currentPc": 0x0402},
            ]
        );
    }

    @test 'nmi'() {
        let runner = this.createCpuRunner(
            {
                startAddr: 0x0400,
            });
        let events = [];
        runner.on("irq", (currentPc: number) => {
            events.push({"event": "irq", currentPc: currentPc});
        });
        runner.on("nmi", (currentPc: number) => {
            events.push({"event": "nmi", currentPc: currentPc});
        });
        runner.setBusOperations(this.busOps);

        // perform reset
        runner.onReset();
        this.executeRemainingClockTicks(runner);

        // execute one instruction
        this.busOps.readDataBuffer.push(0xEA);
        runner.onClockTick();
        this.executeRemainingClockTicks(runner);

        // set we have an IRQ (but the interrupt flag is turned from a reset)
        assert.equal(runner.reg.isFlag(StatusFlag.Interrupt), true);
        assert.equal(runner.reg.pc, 0x0401);
        this.busOps.nmi = true;

        // execute the nmi
        this.busOps.readDataBuffer.push(0x12);
        this.busOps.readDataBuffer.push(0x34);
        runner.onClockTick();
        assert.equal(this.busOps.nmi, false); // flag was reset
        assert.equal(runner.remainingCycles, 8); // nmi cycles
        assert.equal(runner.reg.pc, 0x1234); // nmi
        assert.equal(runner.reg.isFlag(StatusFlag.Break), false);
        assert.equal(runner.reg.isFlag(StatusFlag.Interrupt), true);
        assert.equal(runner.reg.isFlag(StatusFlag.Constant), true);

        // execute the next instruction at the NMI PC
        this.executeRemainingClockTicks(runner);
        this.busOps.readDataBuffer.push(0x0B); // another No op
        runner.onClockTick();

        assert.deepEqual(this.busOps.readDataHistory,
            [
                { addr: 0x0400, data: 0xEA }, // Nop
                { addr: 0xFFFA, data: 0x34 }, // IRQ lo byte
                { addr: 0xFFFB, data: 0x12 }, // IRQ hi byte
                { addr: 0x1234, data: 0x0B }  // Nop
            ]);
        assert.deepEqual(this.busOps.writeDataHistory,
            [
                { addr: 0x01FF, data: 0x04 }, // current PC hi byte
                { addr: 0x01FE, data: 0x01 }, // current PC lo byte
                { addr: 0x01FD, data: 0x24 }, // current status flags
            ]);
        assert.deepEqual(events, 
            [
                {"event": "nmi", "currentPc": 0x0401},
            ]
        );
    }

    @test 'reset with empty config'() {
        let runner = this.createCpuRunner({});
        runner.remainingCycles = 10;
        runner.prevPc = 0x0400;
        runner.setBusOperations(this.busOps);
        this.busOps.readDataBuffer.push(0x1F, 0x45);

        assert.equal(runner.reg.pc, 0);
        runner.onReset();
        assert.equal(runner.reg.pc, 0x1F45);
        assert.equal(runner.remainingCycles, 8); // reset always takes 8 cycles
        assert.equal(runner.prevPc, -1);
    }

    @test '8 onClockTicks after reset'() {
        let runner = this.createCpuRunner({startAddr: 0x0400});
        runner.setBusOperations(this.busOps);
        runner.onReset();

        assert.equal(runner.remainingCycles, 8); // reset always takes 8 cycles
        runner.onClockTick();
        assert.equal(runner.reg.pc, 0x0400);
        assert.equal(runner.remainingCycles, 7);

        runner.onClockTick();
        runner.onClockTick();
        runner.onClockTick();
        runner.onClockTick();
        runner.onClockTick();
        runner.onClockTick();
        runner.onClockTick();
        assert.equal(runner.reg.pc, 0x0400);
        assert.equal(runner.remainingCycles, 0);
    }

    @test 'skipFullCycles config'() {
        let runner = this.createCpuRunner({startAddr: 0x0400, skipFullCycles: true});
        runner.setBusOperations(this.busOps);
        runner.onReset();

        assert.equal(runner.remainingCycles, 8); // reset always takes 8 cycles
        runner.onClockTick();
        assert.equal(runner.reg.pc, 0x0400);
        assert.equal(runner.remainingCycles, 0);

        assert.equal((runner.p2ClockListener as MyP2ClockTickListener).clockTickCount, 1);
    }

    @test 'negative remainingCycles forces the simulator to stop'() {
        let runner = this.createCpuRunner({startAddr: 0x0400});
        runner.setBusOperations(this.busOps);
        runner.onReset();

        // perform a normal clock tick
        runner.onClockTick();

        runner.remainingCycles = -1;
        expect(function(){runner.onClockTick()}).to.throw('remainingCycles is below zero');
    }

    @test 'stop the app when there is an infinite loop'() {
        let runner = this.createCpuRunner({startAddr: 0x0400, breakOnInfiniteLoop: true});
        runner.setBusOperations(this.busOps);
        runner.onReset();

        runner.remainingCycles = 0; // bypass the reset ticks
        runner.prevPc = 0x0400
        expect(function(){runner.onClockTick()}).to.throw('endless loop error at pc: 400');
    }

    @test 'noop executed'() {
        let runner = this.createCpuRunner({startAddr: 0x0400, breakOnInfiniteLoop: true});
        runner.setBusOperations(this.busOps);
        runner.onReset();

        this.executeRemainingClockTicks(runner);
        this.busOps.readDataBuffer.push(0xEA);
        runner.onClockTick();
        assert.equal(runner.remainingCycles, 1); // noop is 1 clock cycle
    }

    @test 'cycle timing'() {
        let runner = this.createCpuRunner({startAddr: 0x0400, breakOnInfiniteLoop: true});
        runner.setBusOperations(this.busOps);
        runner.onReset();
        this.executeRemainingClockTicks(runner);

        let testInternalsOne = new My6502Internals(1,10);
        let testInternalsTwo = new My6502Internals(2,14);
        runner.addressModeMap[AddressMode.IMP] = testInternalsOne.testAddrMode;
        runner.addressModeMap[AddressMode.ABSO] = testInternalsTwo.testAddrMode;
        runner.opcodes[0x00] = 
            {opcode: 0x00, name: 'ts1', exec: testInternalsOne.testOpcode, cycles: 5, addrMode: AddressMode.IMP};
        runner.opcodes[0x01] = 
            {opcode: 0x00, name: 'ts2', exec: testInternalsTwo.testOpcode, cycles: 6, addrMode: AddressMode.ABSO};
        this.busOps.readDataBuffer.push(0x01);
        this.busOps.readDataBuffer.push(0x00);

        runner.onClockTick(); // execute 0x00
        assert.equal(runner.remainingCycles, 15); // (10 + 1 + 5) - 1
        assert.equal(runner.reg.pc, 0x0400 + 1);
        assert.equal(runner.prevPc, 0x400);
        this.executeRemainingClockTicks(runner);

        runner.onClockTick(); // execute 0x01
        assert.equal(runner.remainingCycles, 21); // (14 + 2 + 6) - 1
        assert.equal(runner.reg.pc, 0x0400 + 2);
        assert.equal(runner.prevPc, 0x0400 + 1);
        this.executeRemainingClockTicks(runner);

        assert.equal((runner.p2ClockListener as MyP2ClockTickListener).clockTickCount, 46);
    }

    @test 'illegal op code'() {
        let runner = this.createCpuRunner({startAddr: 0x0400, breakOnInfiniteLoop: true});
        runner.setBusOperations(this.busOps);
        runner.onReset();
        this.executeRemainingClockTicks(runner);
        this.busOps.readDataBuffer.push(0x03); // illegal op code
        runner.onClockTick(); // execute 0x03
        assert.equal(runner.illegalOpCode, true);
        assert.equal(runner.remainingCycles, 0);
        assert.equal(runner.reg.pc, 0x0402);
        assert.equal((runner.p2ClockListener as MyP2ClockTickListener).clockTickCount, 8);

        // this should be ignored
        runner.onClockTick();
        assert.equal(runner.reg.pc, 0x0402);
        assert.equal((runner.p2ClockListener as MyP2ClockTickListener).clockTickCount, 8);

        runner.onReset();
        assert.equal(runner.illegalOpCode, false);
    }
}
