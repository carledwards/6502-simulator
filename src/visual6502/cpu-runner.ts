import { BusCpuAction } from "../bus-cpu-action";
import { Cpu } from "../cpu";
import { P2ClockListener } from "../p2-clock-listener";
import * as Visual6502 from './web/all'
export class CpuRunner implements Cpu {
    busOperations?: BusCpuAction;
    p2ClockListener?: P2ClockListener;
    remainingNMIClockTicks = 0;
    hasBeenSetup = false;
    tickCount = 0;

    onReset(): void {
        if (this.hasBeenSetup) {
            return;
        }
        Visual6502.setupNodes();
        Visual6502.setupTransistors();
        Visual6502.initChip(
            (a: number)=>{
                return this.busOperations!.readData(a)
            },
            (a: number, d: number)=>{
                this.busOperations!.writeData(a, d);
        })
        console.log("init chip completed");
        this.hasBeenSetup = true;
    }

    onClockTick(): void {
        this.tickCount++;
        if (this.tickCount % 1000 == 0) {
            console.log(this.tickCount);
        }
        // console.log(`nmi: ${Visual6502.isNodeHigh(Visual6502.nodenames['nmi'])}, irq: ${Visual6502.isNodeHigh(Visual6502.nodenames['irq'])}`)
        if (this.busOperations!.isNMI()) {
            Visual6502.setLow('nmi');
            this.remainingNMIClockTicks = 8;
        }
        else {
            // NMI's should be a pulse (not something held down)
            // this code will only set the internal NMI to "high" 
            // once we have executed ~8 clock ticks.  This gives
            // the NMI enough time to be seen by the CPU.
            if (this.remainingNMIClockTicks > 0) {
                this.remainingNMIClockTicks--;
            }
            else {
                Visual6502.setHigh('nmi');
            }
        }
        if (this.busOperations!.isIRQ()) {
            Visual6502.setLow('irq');
        }
        else {
            Visual6502.setHigh('irq');
        }
        Visual6502.runChip();
    }

    setP2ClockListener(cb: P2ClockListener): void {
        this.p2ClockListener = cb;
        // TODO - send P2 clock ticks to components
    }

    setBusOperations(busOperations: BusCpuAction): void {
        this.busOperations = busOperations;
    }

    onNMI(value: boolean): void {
    }

    onIRQ(value: boolean): void {
    }
}
