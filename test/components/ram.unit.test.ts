import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { mock, instance, verify } from 'ts-mockito';
import { Ram } from '../../src/components/ram';
import { expect, assert } from 'chai';

_chai.should();

@suite class RamUnitTests {

    before() {
    }

    checkRamIsInitialized(theRam:Ram) {
        for (var i = 0; i < theRam.getSize(); i++) {
            assert.equal(theRam.onReadData(i), 0);
        }
    }

    @test 'memory initialized to 0'() {
        var theRam = new Ram(0x0100);
        assert.equal(theRam.getSize(), 0x0100);
        this.checkRamIsInitialized(theRam);
    }

    @test 'ability to write and read to/from ram'() {
        var theRam = new Ram(0x0100);
        for (var i = 0; i < theRam.getSize(); i++) {
            let val = Math.floor(Math.random() * 256);
            theRam.onWriteData(i, val);
            assert.equal(theRam.onReadData(i), val);
        }
    }

    @test 'values > 0xFF'() {
        var theRam = new Ram(0x0100);
        theRam.onWriteData(0x00, 0x1FF);
        assert.equal(theRam.onReadData(0x00), 0xFF);
        theRam.onWriteData(0x00, 0xAA55);
        assert.equal(theRam.onReadData(0x00), 0x55);

        // go thought the backdoor and ensure that only <= 0xFF is returned
        theRam.memory[0] = 0x3456;
        assert.equal(theRam.onReadData(0x00), 0x56);
    }

    @test 'out of bounds address'() {
        var theRam = new Ram(0x0100);

        // too high
        expect(function(){theRam.onReadData(0x0101)}).to.throw('address offset is out of range: 257');
        expect(function(){theRam.onWriteData(0x0101, 0x00)}).to.throw('address offset is out of range: 257');

        // too low
        expect(function(){theRam.onReadData(-1)}).to.throw('address offset is out of range: -1');
        expect(function(){theRam.onWriteData(-1, 0x00)}).to.throw('address offset is out of range: -1');
    }

    @test 'reset'() {
        var theRam = new Ram(0x0100);
        for (var i = 0; i < theRam.getSize(); i++) {
            let val = Math.floor(Math.random() * 256);
            theRam.onWriteData(i, val);
        }
        theRam.onReset();
        this.checkRamIsInitialized(theRam);
    }

    @test 'onP2ClockTick'() {
        var theRam = new Ram(0x0100);
        for (var i = 0; i < theRam.getSize(); i++) {
            let val = Math.floor(Math.random() * 256);
            theRam.onP2ClockTick();
            theRam.onWriteData(i, val);
            theRam.onP2ClockTick();
            assert.equal(theRam.onReadData(i), val);
        }
    }
}