import { Component } from "../component";

export class Rom extends Component {
    program: number[];

    constructor(size: number) {
        super(size);
        this.program = new Array(size).fill(0x00);
    }

    onWriteData(addrOffset: number, data: number): void {
        // non-destructive... but incorrect user code
        this.checkAddrOffset(addrOffset);
        console.log("Warning: writing to ROM not allowed");
    }

    onReadData(addrOffset: number): number {
        this.checkAddrOffset(addrOffset);
        return this.program[addrOffset] & 0xFF;
    }
    
    onP2ClockTick(): void {
        // nothing needed to do
    }

    onReset(): void {
        // nothing needed to do
    }
}