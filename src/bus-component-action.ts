import { Component } from "./component";

export interface BusComponentAction {
    setIRQ(component: Component): void;
    setNMI(component: Component): void;
    removeIRQ(component: Component): void;
}
