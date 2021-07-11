import { Component } from "../component";

export enum Register {
    PORTB = 0x00,
    PORTA = 0x01,
    DIRB = 0x02,
    DIRA = 0x03,
}

export class Via6522 extends Component {
	_ddra = 0;
    _ddrb = 0;
    _porta = 0;
    _portb = 0;

    public set DDRA(theValue: number) {
        let prevValue = this._ddra;
        this._ddra = theValue;
        this.emit('DDRA', prevValue, this._ddra);
    }

    public get DDRA() {
        return this._ddra;
    }

    public set DDRB(theValue: number) {
        let prevValue = this._ddrb;
        this._ddrb = theValue;
        this.emit('DDRB', prevValue, this._ddrb);
    }

    public get DDRB() {
        return this._ddrb;
    }

    public set PORTA(theValue: number) {
        let prevValue = this._porta;
        this._porta = theValue;
        this.emit('PORTA', prevValue, this._porta);
    }

    public get PORTA() {
        return this._porta;
    }

    public set PORTB(theValue: number) {
        let prevValue = this._portb;
        this._portb = theValue;
        this.emit('PORTB', prevValue, this._portb);
    }

    public get PORTB() {
        return this._portb;
    }

    constructor() {
        super(0x10);
    }

    setRegisterData(register: number, data: number) {
        switch(register) {
            case Register.PORTB: {
                // only set the output bits, preserve the existing input bits
                this.PORTB = (data & this.DDRB) | (this.PORTB & ~this.DDRB);
                break;
            }
            case Register.PORTA: {
                // only set the output bits, preserve the existing input bits
                this.PORTA = data & this.DDRA | (this.PORTA & ~this.DDRA);
                break;
            }
            case Register.DIRB: {
                this.DDRB = data;
                // TODO: should handle resetting the output and input values when this changes
                break;
            }
            case Register.DIRA: {
                this.DDRA = data;
                // TODO: should handle resetting the output and input values when this changes
                break;
            }
            /**
             * TODO: add support for Timers, CB, IRQ
             */
            default: {
                throw new Error(`unhandled write register: ${register.toString(16)}`);
            }
        }
    }

    getRegisterData(register: number): number {
        var data = 0;
        switch(register) {
            case Register.PORTB: {
                data = this.PORTB;
                break;
            }
            case Register.PORTA: {
                data = this.PORTA;
                break;
            }
            case Register.DIRB: {
                data = this.DDRB;
                break;
            }
            case Register.DIRA: {
                data = this.DDRA;
                break;
            }
            /**
             * TODO: add support for Timers, CB, IRQ
             */
            default: {
                throw new Error(`unhandled read register: ${register.toString(16)}`);
            }
        }
        return data;
    }

    onWriteData(addrOffset: number, data: number): void {
        this.checkAddrOffset(addrOffset);
        this.setRegisterData(addrOffset, data & 0xFF);
    }

    onReadData(addrOffset: number): number {
        this.checkAddrOffset(addrOffset);
        return this.getRegisterData(addrOffset) & 0xFF;
    }

    onP2ClockTick(): void {
    }

    onReset(): void {
        this.DDRA = 0;
        this.DDRB = 0;
        this.PORTA = 0;
        this.PORTB = 0;        
    }
}