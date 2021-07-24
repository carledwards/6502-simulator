export interface BusCpuAction {
    writeData(addr: number, data: number): void;
    readData(addr: number): number;
    isNMI(): boolean;
    isIRQ(): boolean;
}