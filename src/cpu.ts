import { BusCpuAction } from "./bus-cpu-action";
import { InterruptListener } from "./interrupt-listener";
import { P2ClockListener } from "./p2-clock-listener";
import { ResetListener } from "./reset-listener";

export interface Cpu extends InterruptListener, ResetListener {
    onReset(): void;
    onClockTick(): void;
    setP2ClockListener(cb: P2ClockListener): void;
    setBusOperations(busOperations: BusCpuAction): void;
}