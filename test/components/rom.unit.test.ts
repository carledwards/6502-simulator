import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { mock, instance, verify } from 'ts-mockito';
import { Rom } from '../../src/components/rom';
import { expect, assert } from 'chai';

_chai.should();

@suite class RomUnitTests {
    checkRomIsInitialized(theRom:Rom) {
        for (var i = 0; i < theRom.getSize(); i++) {
            assert.equal(theRom.onReadData(i), 0);
        }
    }

    @test 'memory initialized to 0'() {
        var theRom = new Rom(0x0100);
        assert.equal(theRom.getSize(), 0x0100);
        this.checkRomIsInitialized(theRom);
    }

    @test 'ability to read from rom'() {
        var theRom = new Rom(0x0100);
        for (var i = 0; i < theRom.getSize(); i++) {
            let val = Math.floor(Math.random() * 256);
            theRom.program[i] = val; // back door
            assert.equal(theRom.onReadData(i), val);
        }
    }

    @test 'writting to ROM is non-destructive'() {
        var theRom = new Rom(0x0100);
        this.checkRomIsInitialized(theRom);
        theRom.onWriteData(0x00, 1);
        this.checkRomIsInitialized(theRom);
    }

    @test 'values > 0xFF'() {
        var theRom = new Rom(0x0100);
        theRom.program[0x00] = 0x1FF;
        assert.equal(theRom.onReadData(0x00), 0xFF);
        theRom.program[0x00] = 0xAA55;
        assert.equal(theRom.onReadData(0x00), 0x55);

        // go thought the backdoor and ensure that only <= 0xFF is returned
        theRom.program[0] = 0x3456;
        assert.equal(theRom.onReadData(0x00), 0x56);
    }

    @test 'out of bounds address'() {
        var theRom = new Rom(0x0100);

        // too high
        expect(function(){theRom.onReadData(0x0101)}).to.throw('address offset is out of range: 257');
        expect(function(){theRom.onWriteData(0x0101, 0x00)}).to.throw('address offset is out of range: 257');

        // too low
        expect(function(){theRom.onReadData(-1)}).to.throw('address offset is out of range: -1');
        expect(function(){theRom.onWriteData(-1, 0x00)}).to.throw('address offset is out of range: -1');
    }

    @test 'reset should do nothing'() {
        var theRom = new Rom(0x0100);
        for (var i = 0; i < theRom.getSize(); i++) {
            let val = Math.floor(Math.random() * 256);
            theRom.program[i] = val;
        }
        theRom.onReset();
        var foundAny = false;
        for (var i = 0; i < theRom.getSize(); i++) {
            if (theRom.onReadData(i) > 0x00) {
                foundAny = true;
                break;
            }
            assert.equal(foundAny, true);
        }
    }

    @test 'onP2ClockTick'() {
        var theRom = new Rom(0x0100);
        for (var i = 0; i < theRom.getSize(); i++) {
            let val = Math.floor(Math.random() * 256);
            theRom.program[i] = val;
            theRom.onP2ClockTick();
            assert.equal(theRom.onReadData(i), val);
        }
    }
}