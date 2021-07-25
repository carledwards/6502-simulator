import { BusCpuAction } from "../bus-cpu-action";
import { Cpu } from "../cpu";
import { P2ClockListener } from "../p2-clock-listener";

export class CpuRunner implements Cpu {
    busOperations?: BusCpuAction;
    p2ClockListener?: P2ClockListener;

    onReset(): void {
        // TODO - send to browser
    }

    onClockTick(): void {
        // ignore
    }

    setP2ClockListener(cb: P2ClockListener): void {
        this.p2ClockListener = cb;
        // TODO - send P2 clock ticks to components
    }

    setBusOperations(busOperations: BusCpuAction): void {
        this.busOperations = busOperations;
    }

    onNMI(value: boolean): void {
        // TODO - send to browser
    }

    onIRQ(value: boolean): void {
        // TODO - send to browser
    }
}
