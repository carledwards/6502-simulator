import { Component } from "../component";

const TIMEOUT_MULTIPLIER = 100;  // 100 microseconds

/**
 * Easy way to generate an IRQ and/or NMI
 * 
 * Two memory addresses available:
 * 
 * 1 - IRQ timeout value (1/10 sec)
 * 2 - NMI timeout value (1/10 sec)
 * 
 * Set the value to 0 to have the IRQ/MNI stop.
 * 
 */
export class InterruptGenerator extends Component {
    memory = [0,0];
    irqTimeoutValue = 0;
    nmiTimeoutValue = 0;
    irqTimer?: ReturnType<typeof setTimeout>;
    nmiTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        super(2);
    }

    updateTimers() {
        if (this.memory[0] * TIMEOUT_MULTIPLIER != this.irqTimeoutValue) {
            if (this.irqTimer) {
                clearInterval(this.irqTimer);
                this.irqTimer = undefined;
            }
            if (this.memory[0] > 0 && this.busComponentAction) {
                this.irqTimeoutValue = this.memory[0] * TIMEOUT_MULTIPLIER;
                this.irqTimer = setInterval(() => {
                    this.busComponentAction?.Irq();
                }, this.irqTimeoutValue);
            }
        }

        if (this.memory[1] * TIMEOUT_MULTIPLIER != this.nmiTimeoutValue) {
            if (this.nmiTimer) {
                clearInterval(this.nmiTimer);
                this.nmiTimer = undefined;
            }
            if (this.memory[1] > 0 && this.busComponentAction) {
                this.nmiTimeoutValue = this.memory[1] * TIMEOUT_MULTIPLIER;
                this.nmiTimer = setInterval(() => {
                    this.busComponentAction?.Nmi();
                }, this.nmiTimeoutValue);
            }
        }
    }

    onWriteData(addrOffset: number, data: number): void {
        this.checkAddrOffset(addrOffset);
        this.memory[addrOffset] = data & 0xFF;
        this.updateTimers();
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