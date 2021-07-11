import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { mock, instance, verify, resetCalls, when } from 'ts-mockito';
import { Motherboard } from '../src/motherboard';
import { CpuRunner } from "../src/cpu6502/cpu-runner";
import { expect, assert } from 'chai';
import { Bus } from '../src/bus';

_chai.should();

class MyBus extends Bus {
    resetCount = 0;

    reset = () => {
        this.resetCount++;
    }
}


@suite class MotherboardUnitTests {

    private mb: Motherboard;
    private cpuMock: CpuRunner;
    private myBus: MyBus;
    private clock: any;

    before() {
        this.cpuMock = mock(CpuRunner);
        this.mb = new Motherboard(instance(this.cpuMock), 10);
        this.myBus = new MyBus(this.mb.cpu);
        this.mb.bus = this.myBus;
        var FakeTimers = require("@sinonjs/fake-timers");
        this.clock = FakeTimers.install();
    }

    after() {
        this.clock.uninstall();
    }

    @test 'resume'() {
        assert(!this.mb.clock);
        this.mb.resume();
        assert(this.mb.clock);
        verify(this.cpuMock.onClockTick()).never();
        this.clock.tick(30);
        verify(this.cpuMock.onClockTick()).atLeast(3);

        // call again while running
        this.mb.resume();
        assert(this.mb.clock);
    }

    @test 'pause'() {
        // get the system running
        assert(!this.mb.clock);
        this.mb.resume();
        assert(this.mb.clock);
        verify(this.cpuMock.onClockTick()).never();
        this.clock.tick(30);
        verify(this.cpuMock.onClockTick()).called();

        // ensure pause stops the system (there should be no clock ticks)
        resetCalls(this.cpuMock);
        this.mb.pause();
        this.clock.tick(30);
        verify(this.cpuMock.onClockTick()).never();
        assert(!this.mb.clock);

        // call again while paused
        this.mb.pause();
        assert(!this.mb.clock);
    }

    @test 'reset'() {
        this.mb.resume();
        assert(this.mb.clock);
        assert.equal(this.myBus.resetCount, 0);
        this.mb.reset();
        assert.equal(this.myBus.resetCount, 1);
        assert(!this.mb.clock);
    }

    @test 'component manager'() {
        let cm = this.mb.getComponentManager();
        assert(cm);
        assert.equal(cm, this.mb.bus.componentManager);
    }
}