export interface BusCpuAction {
    writeData(addr: number, data: number): void;
    readData(addr: number): number;
    isNmi(): boolean;
    isIrq(): boolean;
}