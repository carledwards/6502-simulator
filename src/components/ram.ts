import { Component } from "../component";

export class Ram extends Component {
    memory: number[];

    constructor(size: number) {
        super(size);
        this.memory = new Array(size).fill(0x00);
    }

    onWriteData(addrOffset: number, data: number): void {
        this.checkAddrOffset(addrOffset);
        this.memory[addrOffset] = data & 0xFF;
    }
    onReadData(addrOffset: number): number {
        this.checkAddrOffset(addrOffset);
        return this.memory[addrOffset] & 0xFF;
    }

    onP2ClockTick(): void {
    }

    onReset(): void {
        this.memory.fill(0x00);
    }
}