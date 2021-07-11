import { EventEmitter } from "events";
import { BusComponentAction } from "./bus-component-action";

export abstract class Component extends EventEmitter{
    size: number;
    busComponentAction?: BusComponentAction;

    abstract onWriteData(addrOffset: number, data: number): void;
    abstract onReadData(addrOffset: number): number;
    abstract onP2ClockTick(): void;
    abstract onReset(): void;

    constructor(theSize: number) {
        super();
        this.size = theSize;
    }

    public getSize(): number {
        return this.size;
    }

    public setBus(theBusComponentAction: BusComponentAction) {
        this.busComponentAction = theBusComponentAction;
    }

    protected checkAddrOffset(addrOffset: number) {
        if (addrOffset > this.size || addrOffset < 0) {
            throw new Error(`address offset is out of range: ${addrOffset}`);
        }
    }
}