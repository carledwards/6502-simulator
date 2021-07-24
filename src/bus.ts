import { ComponentManager } from "./component-manager";
import { ResetListener } from "./reset-listener";
import { InterruptListener } from "./interrupt-listener";
import { P2ClockListener } from "./p2-clock-listener";
import { Cpu } from "./cpu";
import { BusCpuAction } from "./bus-cpu-action";
import { BusComponentAction } from "./bus-component-action";
import { Component } from "./component";

export class Bus implements P2ClockListener, BusCpuAction, BusComponentAction {
    interruptListener: InterruptListener;
    resetListener: ResetListener;
    componentManager: ComponentManager;
    irq: Component[] = [];
    nmi: Component[] = [];

    constructor(theCpu: Cpu) {
        this.componentManager = new ComponentManager(this);
        this.interruptListener = theCpu;
        this.resetListener = theCpu;
        theCpu.setP2ClockListener(this);
        theCpu.setBusOperations(this);
    }

    isNMI(): boolean {
        const val = this.nmi.length > 0;
        this.nmi = []; // reading will reset the NMI
        return val;
    }

    isIRQ(): boolean {
        const val = this.irq.length > 0
        return val;
    }

    setIRQ(component: Component): void {
        if (!this.irq.includes(component)) {
            this.irq.push(component);
        }
    }

    setNMI(component: Component): void {
        if (!this.nmi.includes(component)) {
            this.nmi.push(component);
        }
    }

    removeIRQ(component: Component): void {
        const index = this.irq.indexOf(component);
        if (index >= 0) {
            this.irq = this.irq.filter(item => item !== component);
        }
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
