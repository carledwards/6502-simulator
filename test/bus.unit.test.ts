import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { mock, instance, verify } from 'ts-mockito';
import { expect, assert } from 'chai';
import { Component } from '../src/component';
import { Cpu } from '../src/cpu';
import { BusCpuAction } from '../src/bus-cpu-action';
import { P2ClockListener } from '../src/p2-clock-listener';
import { Bus } from '../src/bus';

_chai.should();

class MyCpu implements Cpu {
    p2ClockCb: P2ClockListener;
    busOp: BusCpuAction;
    resetCount: 0;

    constructor() {
        this.resetCount = 0;
    }

    onReset = () => {
        this.resetCount++;
    }

    onClockTick(): void {
        throw new Error('Method not implemented.');
    }

    setP2ClockListener(cb: P2ClockListener): void {
        this.p2ClockCb = cb;
    }

    setBusOperations(busOperations: BusCpuAction): void {
        this.busOp = busOperations;
    }

    onNMI(value: boolean): void {
        throw new Error('Method not implemented.');
    }
    onIRQ(value: boolean): void {
        throw new Error('Method not implemented.');
    }
}

class MyTestComponent extends Component {
    writeDataCount = 0;
    readDataCount = 0;
    p2ClockTickCount = 0;
    resetCount = 0;

    onWriteData(addrOffset: number, data: number): void {
        this.writeDataCount++;
    }

    onReadData(addrOffset: number): number {
        this.readDataCount++;
        return 0x00;
    }

    onP2ClockTick(): void {
        this.p2ClockTickCount++;
    }

    onReset(): void {
        this.resetCount++;
    }
}

// more of an Acceptance test vs a tnit test
// just need to know that CPU -> Bus -> Components is actually working
@suite class BusUnitTests {
    checkCounts(component: MyTestComponent, readCount: number, writeCount: number, p2Count: number,  resetCount: number) {
        assert.equal(component.readDataCount, readCount);
        assert.equal(component.writeDataCount, writeCount);
        assert.equal(component.p2ClockTickCount, p2Count);
        assert.equal(component.resetCount, resetCount);
    }

    @test 'nmi and irq'() {
        let bus = new Bus(new MyCpu());
        assert.equal(bus.isIRQ(), false);
        assert.equal(bus.isNMI(), false);

        const componentOne = new MyTestComponent(2);
        const componentTwo = new MyTestComponent(2);

        // IRQ simple set and remove
        bus.setIRQ(componentOne);
        assert.equal(bus.isIRQ(), true);
        bus.removeIRQ(componentOne);
        assert.equal(bus.isIRQ(), false);

        // NMI simple set and read, first read trips it back
        bus.setNMI(componentOne);
        assert.equal(bus.isNMI(), true);
        assert.equal(bus.isNMI(), false);

        // IRQ add and remove twice
        bus.setIRQ(componentOne);
        bus.setIRQ(componentOne);
        assert.equal(bus.isIRQ(), true);
        bus.removeIRQ(componentOne);
        assert.equal(bus.isIRQ(), false);
        bus.removeIRQ(componentOne);
        assert.equal(bus.isIRQ(), false);

        // NMI add same component twice, first read trips
        bus.setNMI(componentOne);
        bus.setNMI(componentOne);
        assert.equal(bus.isNMI(), true);
        assert.equal(bus.isNMI(), false);

        // IRQ add and remove two components
        bus.setIRQ(componentOne);
        bus.setIRQ(componentTwo);
        assert.equal(bus.isIRQ(), true);
        bus.removeIRQ(componentOne);
        assert.equal(bus.isIRQ(), true);
        bus.removeIRQ(componentTwo);
        assert.equal(bus.isIRQ(), false);
        
        // NMI add triggered by two components first read trips it back
        bus.setNMI(componentOne);
        bus.setNMI(componentTwo);
        assert.equal(bus.isNMI(), true);
        assert.equal(bus.isNMI(), false);
    }

    @test 'onReadData dispatched to proper component'() {
        let componentOne = new MyTestComponent(0x1000);
        let componentTwo = new MyTestComponent(0x2000);
        let bus = new Bus(new MyCpu());
        bus.componentManager.add(0x0000, componentOne);
        bus.componentManager.add(0x2000, componentTwo);
        this.checkCounts(componentOne, 0, 0, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.readData(0x0000);
        this.checkCounts(componentOne, 1, 0, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.readData(0x0FFF);
        this.checkCounts(componentOne, 2, 0, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.readData(0x2000);
        this.checkCounts(componentOne, 2, 0, 0, 1);
        this.checkCounts(componentTwo, 1, 0, 0, 1);
    }

    @test 'onWriteData dispatched to proper component'() {
        let componentOne = new MyTestComponent(0x1000);
        let componentTwo = new MyTestComponent(0x2000);
        let bus = new Bus(new MyCpu());
        bus.componentManager.add(0x0000, componentOne);
        bus.componentManager.add(0x2000, componentTwo);
        this.checkCounts(componentOne, 0, 0, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.writeData(0x0000, 0xFF);
        this.checkCounts(componentOne, 0, 1, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.writeData(0x0FFF, 0xFF);
        this.checkCounts(componentOne, 0, 2, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.writeData(0x2000, 0xFF);
        this.checkCounts(componentOne, 0, 2, 0, 1);
        this.checkCounts(componentTwo, 0, 1, 0, 1);
    }

    @test 'dispatch to unknown component'() {
        let componentOne = new MyTestComponent(0x1000);
        let componentTwo = new MyTestComponent(0x2000);
        let myCpu = new MyCpu();
        let bus = new Bus(myCpu);
        bus.componentManager.add(0x0000, componentOne);
        bus.componentManager.add(0x2000, componentTwo);
        expect(function(){bus.readData(0xFF00)}).to.throw('start Address not found: ff00');
        expect(function(){bus.writeData(0xFF00, 0x00)}).to.throw('start Address not found: ff00');
    }

    @test 'onReset dispatched to all components'() {
        let componentOne = new MyTestComponent(0x1000);
        let componentTwo = new MyTestComponent(0x2000);
        let myCpu = new MyCpu();
        let bus = new Bus(myCpu);
        bus.componentManager.add(0x0000, componentOne);
        bus.componentManager.add(0x2000, componentTwo);
        this.checkCounts(componentOne, 0, 0, 0, 1); // components are "reset" when added, so they will have a single count
        this.checkCounts(componentTwo, 0, 0, 0, 1);
        assert.equal(myCpu.resetCount, 0);

        bus.reset();
        this.checkCounts(componentOne, 0, 0, 0, 2);
        this.checkCounts(componentTwo, 0, 0, 0, 2);
        assert.equal(myCpu.resetCount, 1);

        bus.reset();
        bus.reset();
        bus.reset();
        bus.reset();
        bus.reset();
        this.checkCounts(componentOne, 0, 0, 0, 7);
        this.checkCounts(componentTwo, 0, 0, 0, 7);
        assert.equal(myCpu.resetCount, 6);

    }

    @test 'onP2ClockTick dispatched to all components'() {
        let componentOne = new MyTestComponent(0x1000);
        let componentTwo = new MyTestComponent(0x2000);
        let myCpu = new MyCpu();
        let bus = new Bus(myCpu);
        bus.componentManager.add(0x0000, componentOne);
        bus.componentManager.add(0x2000, componentTwo);
        this.checkCounts(componentOne, 0, 0, 0, 1);
        this.checkCounts(componentTwo, 0, 0, 0, 1);

        bus.onP2ClockTick();
        this.checkCounts(componentOne, 0, 0, 1, 1);
        this.checkCounts(componentTwo, 0, 0, 1, 1);

        bus.onP2ClockTick();
        bus.onP2ClockTick();
        bus.onP2ClockTick();
        bus.onP2ClockTick();
        bus.onP2ClockTick();
        this.checkCounts(componentOne, 0, 0, 6, 1);
        this.checkCounts(componentTwo, 0, 0, 6, 1);
    }
}

@suite class ComponentManagerUnitTests {
    @test 'component size too small'() {
        let myCpu = new MyCpu();
        let bus = new Bus(myCpu);
        var componentOne = new MyTestComponent(-1);
        expect(function(){bus.componentManager.add(0x0000, componentOne)}).to.throw('component size is too small (<=0): -1');
        componentOne = new MyTestComponent(0);
        expect(function(){bus.componentManager.add(0x0000, componentOne)}).to.throw('component size is too small (<=0): 0');
    }

    @test 'component size too large'() {
        let myCpu = new MyCpu();
        let bus = new Bus(myCpu);
        var componentOne = new MyTestComponent(0x10001);
        expect(function(){bus.componentManager.add(0x0000, componentOne)}).to.throw('component size is too large (>0x10000): 65537');
    }

    @test 'overlapping components'() {
        let componentOne = new MyTestComponent(0x1000);
        let componentTwo = new MyTestComponent(0x1000);
        let myCpu = new MyCpu();
        let bus = new Bus(myCpu);
        bus.componentManager.add(0x0000, componentOne);

        expect(function(){bus.componentManager.add(0x0FFF, componentTwo)}).to.throw('component already exists at this range');
        expect(function(){bus.componentManager.add(0x0000, componentTwo)}).to.throw('component already exists at this range');
    }
}
