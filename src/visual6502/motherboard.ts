import { Bus } from "../bus";
import { Cpu } from "../cpu";
import { ComponentManager } from "../component-manager";

export class Motherboard {
    bus: Bus;
    cpu: Cpu;

    constructor(theCpu: Cpu) {
        this.cpu = theCpu;
        this.bus = new Bus(theCpu);
    }

    public reset() {
        this.bus.reset();
        // TODO need to send to the CPU
    }

    public getComponentManager(): ComponentManager {
        return this.bus.componentManager;
    }
}
