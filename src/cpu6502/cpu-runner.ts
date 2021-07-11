import { BusCpuAction } from "../bus-cpu-action";
import { Cpu } from "../cpu";
import { P2ClockListener } from "../p2-clock-listener";
import { Opcodes } from "./opcodes";
import { StatusFlag } from "./internals";

/**
 * skipping full cycles can have a negative effect when you have the 6522 
 * attached and it is expecting to use those cycles to peform a background
 * counter behavior.
 */
export interface Config {
    startAddr?: number,
    breakOnInfiniteLoop?: boolean,
    skipFullCycles?: boolean
}

export class CpuRunner extends Opcodes implements Cpu {
    p2ClockListener?: P2ClockListener;
    busOperations?: BusCpuAction;
    remainingCycles: number = 0;
    config: Config;
    prevPc = -1;
    illegalOpCode = false;
    
    constructor(theConfig: Config) {
        super();
        this.config = theConfig;
    }

    readData(theAddr: number, context:string): number {
        let data = this.busOperations!.readData(theAddr);
        this.emit("readData", context, theAddr, data);
        return data;
    }

    writeData(theAddr: number, theValue: number, context:string): void {
        this.emit("writeData", context, theAddr, theValue);
        this.busOperations!.writeData(theAddr, theValue);
    }

    setBusOperations(busOperations: BusCpuAction): void {
        this.busOperations = busOperations;
    }

    setP2ClockListener(cb: P2ClockListener): void {
        this.p2ClockListener = cb;
    }

    onNMI(): void {
        this.emit('nmi', this.reg.pc);
        this.stackPushWord(this.reg.pc, "nmi - pc");
        this.stackPushByte(this.reg.p, "nmi - status flag");
        this.reg.setStatusFlag(StatusFlag.Break, false);
        this.reg.setStatusFlag(StatusFlag.Constant, true);
        this.reg.setStatusFlag(StatusFlag.Interrupt, true);
        this.reg.pc = this.readData(0xFFFA, "nmi vec - lo") | (this.readData(0xFFFB, "nmi vec - hi") << 8);
        this.remainingCycles = 8;
    }

    onIRQ(): boolean {
        if (!this.reg.isFlag(StatusFlag.Interrupt)) {
            this.emit('irq', this.reg.pc);
            this.stackPushWord(this.reg.pc, "irq - pc");
            this.stackPushByte(this.reg.p, "irq - status flag");
            this.reg.setStatusFlag(StatusFlag.Break, false);
            this.reg.setStatusFlag(StatusFlag.Constant, true);
            this.reg.setStatusFlag(StatusFlag.Interrupt, true);
            this.reg.pc = this.readData(0xFFFE, "irq vec - lo") | (this.readData(0xFFFF, "irq vec - hi") << 8);
            this.remainingCycles = 7;
            return true;
        }
        else {
            return false;
        }
    }

    onReset = () => {
        this.reg.reset();
        this.remainingCycles = 8; // 8 clock cycles for startup
        this.prevPc = -1;
        this.illegalOpCode = false;

        // for the starting address, use the value provided or use the default at 0xFFFC & 0xFFFD
        if (this.config.startAddr) {
            this.reg.pc = this.config.startAddr;
        }
        else {
            let reset_vector = 0xFFFC  // default reset vector
            let lo = this.busOperations!.readData(reset_vector);
            let hi = this.busOperations!.readData(reset_vector + 1);
            this.reg.pc = (hi << 8) | lo;
        }
    }

    onClockTick(): void {
        // the system stops functioning if an illegal op code is encountered
        // only a reset can clear this out.
        if (this.illegalOpCode) {
            return;
        }

        // consistency checker
        if (this.remainingCycles < 0) {
            throw new Error("remainingCycles is below zero");
        }

        // only perform action when all of the clock cycles have completed
        if (this.remainingCycles == 0) {

            // check for interrupts.  NMI is always first, then the IRQ
            if (this.busOperations) {
                if (this.busOperations.isNmi()) {
                    this.onNMI();
                    return;
                }
                else if (this.busOperations.isIrq()) {
                    // IRQ's might be disabled.  If they are, it is just ignored and passes down
                    // to getting the next normal opcode
                    if (this.onIRQ()) {
                        // found an IRQ and they are enabled, skip and start processing the
                        // IRQ code on the next clock tick
                        return;
                    }
                }
            }

            // if there is a branch/jump that is recursive, exit the app if configured to do so
            if (this.config.breakOnInfiniteLoop) {
                if (this.prevPc == this.reg.pc) {
                    throw new Error(`endless loop error at pc: ${this.reg.pc.toString(16)}`);
                }
            }
            this.prevPc = this.reg.pc;

            // reset our Address Mode value
            this.stash.reset();

            // get the opcode definition
            let opcode_def = this.opcodes[this.readData(this.reg.pc, "\nopcode")]!;
            this.reg.setStatusFlag(StatusFlag.Constant, true);  // hard wired to always be on

            // execution event
            this.emit("execOpcode", this.reg, opcode_def);

            // move the PC to the next byte following the opcode being read
            this.reg.pc = (this.reg.pc + 1);

            // setup the address mode needed for the opcode
            let additional_cycle1 = this.addressModeMap[opcode_def.addrMode]();

            var additional_cycle2 = 0;
            try {
                // execute the opcode
                additional_cycle2 = opcode_def.exec();
            }
            catch(e) {
                if (e instanceof Error) {
                    if (e.message === 'illegal opcode used') {
                        this.illegalOpCode = true;
                        return;
                    }
                    else {
                        throw e; // unknown error, rethrow.
                    }
                }
            }

            // calculate the full cycle for this opcode
            this.remainingCycles = opcode_def.cycles + additional_cycle2 + additional_cycle1;
        }

        // skip any remaining cycles if requested to do so
        if (this.config.skipFullCycles) {
            this.remainingCycles = 0;
        }
        else {
            this.remainingCycles--;
        }

        // notify any components on the bus that they can have time to execute
        if (this.p2ClockListener) {
            this.p2ClockListener.onP2ClockTick();
        }
    }
}
