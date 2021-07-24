import { Component } from "../component";

const TIMEOUT_MULTIPLIER = 100;  // 100 microseconds

enum IntGenRegister {
    IRQTimeout = 0,
    NMITimeout = 1,
    IRQCount = 2,
    NMICount = 3
}

/**
 * Easy way to generate an IRQ and/or NMI
 * 
 * Two memory addresses available:
 * 
 * 1 - IRQ timeout value (1/10 sec)
 * 2 - NMI timeout value (1/10 sec)
 * 3 - IRQ count (stops at 127)
 * 4 - NMI count (stops at 127)
 * 
 * Set the timeout value to 0 to have the IRQ/MNI stop.
 * 
 */
export class InterruptGenerator extends Component {
    memory = [0, 0, 0, 0];
    irqTimeoutValue = 0;
    nmiTimeoutValue = 0;
    irqTimer?: ReturnType<typeof setTimeout>;
    nmiTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        super(4);
    }

    incrementInterrupt(register: IntGenRegister) {
        if (this.memory[register] < 0x7F) {
            this.memory[register]++;
        }
    }

    updateTimers() {
        if (this.memory[IntGenRegister.IRQTimeout] * TIMEOUT_MULTIPLIER != this.irqTimeoutValue) {
            if (this.irqTimer) {
                clearInterval(this.irqTimer);
                this.irqTimer = undefined;
            }
            if (this.memory[IntGenRegister.IRQTimeout] > 0 && this.busComponentAction) {
                this.irqTimeoutValue = this.memory[IntGenRegister.IRQTimeout] * TIMEOUT_MULTIPLIER;
                this.irqTimer = setInterval(() => {
                    this.busComponentAction?.setIRQ(this);
                    this.incrementInterrupt(IntGenRegister.IRQCount);
                }, this.irqTimeoutValue);
            }
        }

        if (this.memory[IntGenRegister.NMITimeout] * TIMEOUT_MULTIPLIER != this.nmiTimeoutValue) {
            if (this.nmiTimer) {
                clearInterval(this.nmiTimer);
                this.nmiTimer = undefined;
            }
            if (this.memory[IntGenRegister.NMITimeout] > 0 && this.busComponentAction) {
                this.nmiTimeoutValue = this.memory[IntGenRegister.NMITimeout] * TIMEOUT_MULTIPLIER;
                this.nmiTimer = setInterval(() => {
                    this.busComponentAction?.setNMI(this);
                    this.incrementInterrupt(IntGenRegister.NMICount);
                }, this.nmiTimeoutValue);
            }
        }
    }

    onWriteData(addrOffset: number, data: number): void {
        this.checkAddrOffset(addrOffset);
        this.memory[addrOffset] = data & 0xFF;
        if (addrOffset == IntGenRegister.IRQCount) { // IRQ
            if (this.memory[addrOffset] == 0) { // value of 0 removes IRQ
                this.busComponentAction?.removeIRQ(this);
            }
        }
        else if (addrOffset == IntGenRegister.NMICount) { // NMI
            // writting to the NMI slot has no effect on the NMI on the bus
        }

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