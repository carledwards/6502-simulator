import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { Via6522, Register } from '../../src/components/via-6522';
import { expect, assert } from 'chai';

_chai.should();

@suite class Via6522UnitTests {

    @test 'port b events'() {
        var theVia = new Via6522();
        let events = [];
        theVia.on("PORTB", (prevValue, newValue) => {
            events.push({"event": "portb", prevValue: prevValue, newValue: newValue});
        });
        theVia.on("PORTA", (prevValue, newValue) => {
            events.push({"event": "porta", prevValue: prevValue, newValue: newValue});
        });
        theVia.on("DDRB", (prevValue, newValue) => {
            events.push({"event": "ddrb", prevValue: prevValue, newValue: newValue});
        });
        theVia.on("DDRA", (prevValue, newValue) => {
            events.push({"event": "ddra", prevValue: prevValue, newValue: newValue});
        });
        theVia.onWriteData(Register.DIRB, 0xFF); // all outputs
        theVia.onWriteData(Register.PORTB, 0xFF);  // write data
        theVia.onWriteData(Register.PORTB, 0x00);  // write data
        theVia.onWriteData(Register.DIRB, 0x0F); 
        theVia.onWriteData(Register.PORTB, 0xFF);  // write data
        assert.deepEqual(events, 
            [
                { "event": "ddrb", "newValue": 0xFF, "prevValue": 0x00 },
                {"event": "portb", "newValue": 0xFF, "prevValue": 0x00 },
                {"event": "portb", "newValue": 0x00, "prevValue": 0xFF},
                {"event": "ddrb", "newValue": 0x0F, "prevValue": 0xFF},
                {"event": "portb", "newValue": 0x0F, "prevValue": 0x00}
            ]
        );
    }

    @test 'port a events'() {
        var theVia = new Via6522();
        let events = [];
        theVia.on("PORTB", (prevValue, newValue) => {
            events.push({"event": "portb", prevValue: prevValue, newValue: newValue});
        });
        theVia.on("PORTA", (prevValue, newValue) => {
            events.push({"event": "porta", prevValue: prevValue, newValue: newValue});
        });
        theVia.on("DDRB", (prevValue, newValue) => {
            events.push({"event": "ddrb", prevValue: prevValue, newValue: newValue});
        });
        theVia.on("DDRA", (prevValue, newValue) => {
            events.push({"event": "ddra", prevValue: prevValue, newValue: newValue});
        });
        theVia.onWriteData(Register.DIRA, 0xFF); // all outputs
        theVia.onWriteData(Register.PORTA, 0xFF);  // write data
        theVia.onWriteData(Register.PORTA, 0x00);  // write data
        theVia.onWriteData(Register.DIRA, 0x0F); 
        theVia.onWriteData(Register.PORTA, 0xFF);  // write data
        assert.deepEqual(events, 
            [
                { "event": "ddra", "newValue": 0xFF, "prevValue": 0x00 },
                {"event": "porta", "newValue": 0xFF, "prevValue": 0x00 },
                {"event": "porta", "newValue": 0x00, "prevValue": 0xFF},
                {"event": "ddra", "newValue": 0x0F, "prevValue": 0xFF},
                {"event": "porta", "newValue": 0x0F, "prevValue": 0x00}
            ]
        );
    }

    // use this method to future-proof changes to the Via6522 class
    assertVia(theVia: Via6522, theExpectedValue: any) {
        assert.equal(theVia.size, 0x10);
        let jsonVia = JSON.parse(JSON.stringify(theVia));
        delete jsonVia["size"];
        delete jsonVia["_events"];
        delete jsonVia["_eventsCount"];
        assert.deepEqual(jsonVia, theExpectedValue);
    }

    @test 'component initialized on creation'() {
        var theVia = new Via6522();
        this.assertVia(theVia, {
            "_ddra": 0,
            "_ddrb": 0,
            "_porta": 0,
            "_portb": 0,
            }
        );
    }

    @test 'component reset'() {
        var theVia = new Via6522();
        theVia.DDRA = 1;
        theVia.DDRB = 2;
        theVia.PORTA = 3;
        theVia.PORTB = 4;
        this.assertVia(theVia, {
            "_ddra": 1,
            "_ddrb": 2,
            "_porta": 3,
            "_portb": 4,
        });
        theVia.onReset();
        this.assertVia(theVia, {
            "_ddra": 0,
            "_ddrb": 0,
            "_porta": 0,
            "_portb": 0,
            }
        );
    }

    @test 'Data direction A and B set/get'() {
        var theVia = new Via6522();
        [0x0F, 0xFF, 0x5A, 0x47, 0x00].forEach((data) => {
            theVia.onWriteData(Register.DIRA, data);
            var readData = theVia.onReadData(Register.DIRA);
            assert.equal(readData, data);
        });
    }

    @test 'Data direction B get/set'() {
        var theVia = new Via6522();
        [0x0F, 0xFF, 0x5A, 0x47, 0x00].forEach((data) => {
            theVia.onWriteData(Register.DIRB, data);
            var readData = theVia.onReadData(Register.DIRB);
            assert.equal(readData, data);
        });
    }

    @test 'Reading / Writing to unsupported registers'() {
        var theVia = new Via6522();
        [0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F].forEach((regAddr) => {
            expect(function(){theVia.onReadData(regAddr)}).to.throw(`unhandled read register:`);
            expect(function(){theVia.onWriteData(regAddr, 0x00)}).to.throw(`unhandled write register:`);
        });
    }

    @test 'PORT A Input Output w/ Data Direction'() {
        var theVia = new Via6522();

        // all inputs
        theVia.onWriteData(Register.DIRA, 0x00);  // all inputs
        assert.equal(theVia.onReadData(Register.PORTA), 0x00); // default is zeros
        theVia.onWriteData(Register.PORTA, 0xFF);  // try and write data
        assert.equal(theVia.onReadData(Register.PORTA), 0x00); // should still be all zeros

        // all outputs
        theVia.onReset();
        theVia.onWriteData(Register.DIRA, 0xFF);  // all inputs
        assert.equal(theVia.onReadData(Register.PORTA), 0x00); // default is zeros
        theVia.onWriteData(Register.PORTA, 0xFF);  // write data
        assert.equal(theVia.onReadData(Register.PORTA), 0xFF); // all will be set

        // upper 4 bits are outputs, lower 4 are inputs
        theVia.onReset();
        theVia.onWriteData(Register.DIRA, 0xF0);
        assert.equal(theVia.onReadData(Register.PORTA), 0x00); // default is zeros
        theVia.onWriteData(Register.PORTA, 0xFF);  // write data
        assert.equal(theVia.onReadData(Register.PORTA), 0xF0); // only upper 4 are set
        theVia.PORTA |= 0x0F; // back door setting all of the inputs to ON
        assert.equal(theVia.onReadData(Register.PORTA), 0xFF); // all are set
        theVia.onWriteData(Register.PORTA, 0x00);  // try and clear all the bits (should only affect the upper 4)
        assert.equal(theVia.onReadData(Register.PORTA), 0x0F); // only lower 4 are set
    }

    @test 'PORT B Input Output w/ Data Direction'() {
        var theVia = new Via6522();

        // all inputs
        theVia.onWriteData(Register.DIRB, 0x00);  // all inputs
        assert.equal(theVia.onReadData(Register.PORTB), 0x00); // default is zeros
        theVia.onWriteData(Register.PORTB, 0xFF);  // try and write data
        assert.equal(theVia.onReadData(Register.PORTB), 0x00); // should still be all zeros

        // all outputs
        theVia.onReset();
        theVia.onWriteData(Register.DIRB, 0xFF);  // all inputs
        assert.equal(theVia.onReadData(Register.PORTB), 0x00); // default is zeros
        theVia.onWriteData(Register.PORTB, 0xFF);  // write data
        assert.equal(theVia.onReadData(Register.PORTB), 0xFF); // all will be set

        // upper 4 bits are outputs, lower 4 are inputs
        theVia.onReset();
        theVia.onWriteData(Register.DIRB, 0xF0);
        assert.equal(theVia.onReadData(Register.PORTB), 0x00); // default is zeros
        theVia.onWriteData(Register.PORTB, 0xFF);  // write data
        assert.equal(theVia.onReadData(Register.PORTB), 0xF0); // only upper 4 are set
        theVia.PORTB |= 0x0F; // back door setting all of the inputs to ON
        assert.equal(theVia.onReadData(Register.PORTB), 0xFF); // all are set
        theVia.onWriteData(Register.PORTB, 0x00);  // try and clear all the bits (should only affect the upper 4)
        assert.equal(theVia.onReadData(Register.PORTB), 0x0F); // only lower 4 are set
    }
}