import { ComponentManager } from "./component-manager";
import { ResetListener } from "./reset-listener";
import { InterruptListener } from "./interrupt-listener";
import { P2ClockListener } from "./p2-clock-listener";
import { Cpu } from "./cpu";
import { BusCpuAction } from "./bus-cpu-action";
import { BusComponentAction } from "./bus-component-action";

export class Bus implements P2ClockListener, BusCpuAction, BusComponentAction {
    interruptListener: InterruptListener;
    resetListener: ResetListener;
    componentManager: ComponentManager;
    irq = false;
    nmi = false;

    constructor(theCpu: Cpu) {
        this.componentManager = new ComponentManager(this);
        this.interruptListener = theCpu;
        this.resetListener = theCpu;
        theCpu.setP2ClockListener(this);
        theCpu.setBusOperations(this);
    }

    isNmi(): boolean {
        let val = this.nmi;
        this.nmi = false;
        return val;
    }

    isIrq(): boolean {
        let val = this.irq;
        this.irq = false;
        return val;
    }

    Irq(): void {
        this.irq = true;
    }

    Nmi(): void {
        this.nmi = true;
    }
    
    writeData(addr: number, data: number): void {
        this.componentManager.writeData(addr, data);
    }

    readData(addr: number): number {
        return this.componentManager.readData(addr) & 0xFF;
    }

    onP2ClockTick(): void {
        Array.from(this.componentManager.getComponents()).forEach(
            c => c.onP2ClockTick()
        );
    }

    public reset = () => {
        this.resetListener.onReset();
        Array.from(this.componentManager.getComponents()).forEach(
            c => c.onReset()
        );
    }
}
