import { BusCpuAction } from "../bus-cpu-action";
import { Cpu } from "../cpu";
import { P2ClockListener } from "../p2-clock-listener";


export class CpuRunner implements Cpu {
    busOperations?: BusCpuAction;
    p2ClockListener?: P2ClockListener;
    socketClient: any;

    setSocketClient(theClient: any) {
        this.socketClient = theClient;
    }

    onReset(): void {
        if (this.socketClient) {
            this.socketClient.emit("reset", "");
        }
    }

    onClockTick(): void {
        if (this.socketClient) {
            this.socketClient.emit("clockTick", "");
        }
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
