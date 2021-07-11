import { Component } from "./component";
import { BusComponentAction } from "./bus-component-action";

export class ComponentManager {
    componentAddressMap: Component[] = new Array(0xFFFF);
    startAddressMap : Map<Component, number> = new Map<Component, number>();
    compBus: BusComponentAction;

    constructor(bus: BusComponentAction) {
        this.compBus = bus;
    }

    add(startingAddr: number, component: Component) {
        let size = component.getSize();
        if (size <= 0) {
            throw new Error(`component size is too small (<=0): ${size}`);
        }
        if (startingAddr + size > 0x10000) {
            throw new Error(`component size is too large (>0x10000): ${size}`);
        }
        for (let i = startingAddr; i < startingAddr+size; i++) {
            if (this.componentAddressMap[i]) {
                throw new Error("component already exists at this range");
            }
            component.setBus(this.compBus);
            this.componentAddressMap[i] = component;
        }
        this.startAddressMap.set(component, startingAddr);

        component.onReset();
    }

    writeData(addr: number, data: number) {
        let component = this.componentAddressMap[addr];
        let startAddress = this.startAddressMap.get(component);
        if (!startAddress && startAddress != 0) {
            throw new Error(`start Address not found: ${addr.toString(16)}`);
        }
        component.onWriteData(addr - startAddress, data);
    }

    readData(addr: number) {
        let component = this.componentAddressMap[addr];
        let startAddress = this.startAddressMap.get(component);
        if (!startAddress && startAddress != 0) {
            throw new Error(`start Address not found: ${addr.toString(16)}`);
        }
        return component.onReadData(addr - startAddress);
    }

    getComponents(): IterableIterator<Component> {
        return this.startAddressMap.keys();
    }
}