export interface InterruptListener {
    onNMI(value: boolean): void;
    onIRQ(value: boolean): void;
}