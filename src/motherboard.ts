import { Bus } from "./bus";
import { Cpu } from "./cpu";
import { ComponentManager } from "./component-manager";

export class Motherboard {
    bus: Bus;
    cpu: Cpu;
    clock?: ReturnType<typeof setTimeout>;
    clockInterval: number;

    constructor(theCpu: Cpu, theClockInterval: number) {
        this.cpu = theCpu;
        this.clock = undefined;
        this.bus = new Bus(theCpu);
        this.clockInterval = theClockInterval;
    }

    public resume() {
        if (!this.clock) {
            this.clock = setInterval(() => {
                this.cpu.onClockTick();
            }, this.clockInterval);
        }
    }

    public pause() {
        if (this.clock) {
            clearInterval(this.clock);
            this.clock = undefined;
        }
    }

    public reset() {
        this.pause();
        this.bus.reset();
    }

    public getComponentManager(): ComponentManager {
        return this.bus.componentManager;
    }
}
