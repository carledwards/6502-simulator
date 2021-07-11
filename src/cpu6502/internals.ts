import EventEmitter from "events";

export function toHexByte(val: number): string {
    return val.toString(16).toUpperCase().padStart(2, '0')
}

export function toHexWord(val: number): string {
    return val.toString(16).toUpperCase().padStart(4, '0')
}

export enum AddressMode {
    IMP = 1, // Implied
    IMM,     // Immediate
    ZP,      // Zero Page
    ZPX,     // Zero Page with X offset
    ZPY,     // Zero Page with Y offset
    REL,     // Relative
    ABSO,    // Absolute
    ABSX,    // Absolute with X Offset
    ABSY,    // Absolute with Y Offset
    IND,     // Indirect
    INDX,    // Indirect with X Offset
    INDY,    // Indirect with Y Offset
    ACC,     // Accumulator
}

export enum StatusFlag {
    Negative  = 0x80,
    Overflow  = 0x40,
    Constant  = 0x20, // unused, but always set
    Break     = 0x10,
    Decimal   = 0x08,
    Interrupt = 0x04,
    Zero      = 0x02,
    Carry     = 0x01
}

export class CPUStash {
    private _addr: number = -1;

    public get addr() {
        if (this._addr == -1) {
            throw new Error("absolute addr not set");
        }
        return this._addr;
    }

    public set addr(theAddr: number) {
        this._addr = theAddr & 0xFFFF;
        // console.log(`stash addr: ${this._addr.toString(16)}`);
    } 

    public reset(): void {
        this._addr = -1;
    }
}

export class Register {
    private _a: number = 0;  // accumulator
    private _x: number = 0;  // general purpose X
    private _y: number = 0;  // general purpose y
    private _sp: number = 0; // stack pointer
    private _pc: number= 0;  // program counter
    private _p: number = 0;  // flags/processor status N|V|-|B|D|I|Z|C

    constructor() {
        this.a = 0;
        this.x = 0;
        this.y = 0;
        this.sp = 0;
        this.pc = 0;
        this.p = 0;
        this.reset();
    }

    reset(): void {
        this.a = 0x00;
        this.x = 0x00;
        this.y = 0x00;
        this.sp = 0xFF;
        this.pc = 0x0000;

        this.p = 0b00100100 // Unused is always set to a 1, Interrupts are disabled on startup
    }

    public set a(theA: number) {
        this._a = theA & 0xFF;
    }

    public get a() {
        return this._a;
    }

    public set x(theX: number) {
        this._x = theX & 0xFF;
    }

    public get x() {
        return this._x;
    }

    public set y(theY: number) {
        this._y = theY & 0xFF;
    }

    public get y() {
        return this._y;
    }

    public set sp(theSP: number) {
        this._sp = theSP & 0xFF;
    }

    public get sp() {
        return this._sp;
    }

    public set pc(thePC: number) {
        this._pc = thePC & 0xFFFF;
    }

    public get pc() {
        return this._pc;
    }

    public set p(theP: number) {
        this._p = theP & 0xFF;
    }

    public get p() {
        return this._p;
    }

    setStatusFlag(theFlag:StatusFlag, theValue:boolean): void {
        if (theValue) {
            this._p |= theFlag;
        }
        else {
            this._p &= (~theFlag);
        }
    }

    isFlag(theFlag:StatusFlag): boolean {
        return (this._p & theFlag) == theFlag;
    }
}

export abstract class Internals extends EventEmitter {
    reg: Register = new Register();
    stash: CPUStash;
    addressModeMap: Array<() => number> = new Array(Object.keys(AddressMode).length/2);

    constructor() {
        super();
        this.stash = new CPUStash();
        this.addressModeMap[AddressMode.IMP] = this.addrImplied;
        this.addressModeMap[AddressMode.REL] = this.addrRelative;
        this.addressModeMap[AddressMode.IMM] = this.addrImmediate;
        this.addressModeMap[AddressMode.ZP] = this.addrZeroPage;
        this.addressModeMap[AddressMode.ZPX] = this.addrZeroPageX;
        this.addressModeMap[AddressMode.ZPY] = this.addrZeroPageY;
        this.addressModeMap[AddressMode.ABSO] = this.addrAbsolute;
        this.addressModeMap[AddressMode.ABSX] = this.addrAbsoluteX;
        this.addressModeMap[AddressMode.ABSY] = this.addrAbsoluteY;
        this.addressModeMap[AddressMode.IND] = this.addrIndirect;
        this.addressModeMap[AddressMode.INDX] = this.addrIndirectX;
        this.addressModeMap[AddressMode.INDY] = this.addrIndirectY;
        this.addressModeMap[AddressMode.ACC] = this.addrAccumulator;
    }

    stackPushByte = (data: number, context: string) => {
        if (this.reg.sp == 0x00) {
            throw new Error("Stack is full; unable to push another byte");
        }
        if (data > 0xFF || data < 0x00) {
            throw new Error(`data is out of range: ${data}`);
        }
        this.writeData(0x0100 + this.reg.sp, data, context);
        this.reg.sp--; // stack grows downwards (FF -> 00)
    }

    stackPushWord = (data: number, context: string) => {
        this.stackPushByte(data >> 8, `${context} hi`);
        this.stackPushByte(data & 0xFF, `${context} lo`);
    }

    stackPopByte = (context: string) => {
        if (this.reg.sp == 0xFF) {
            throw new Error("Stack is empty; unable to pop byte");
        }
        this.reg.sp++; // stack grows downwards (FF -> 00)
        return this.readData(0x0100 + this.reg.sp, context);
    }

    stackPopWord = (context: string) => {
        var word = this.stackPopByte(`${context} lo`);
        word |= this.stackPopByte(`${context} hi`) << 8;
        return word;
    }

    addrAccumulator=()=> {
        return 0;
    }

    /**
     * Y, Indirect
     * 
     * An 8-bit address identifies a pointer. The value of the Y register is 
     * added to the address contained in the pointer. 
     * 
     * Effectively, the pointer is the base address and the Y register is an 
     * index past that base address.
     */
    addrIndirectY=()=> {
        let t = this.readData(this.reg.pc, "addr - ind y");
        this.reg.pc += 1;
        let lo = this.readData(t & 0x00FF, "addr - ind y lo");
        let hi = this.readData((t + 1) & 0x00FF, "addr - ind y hi");
        this.stash.addr = (hi << 8) | lo;
        this.stash.addr += this.reg.y;
        
        if ((this.stash.addr & 0xFF00) != (hi << 8)) {
            return 1;
        }
        else {
            return 0;
        }
    }

    /**
     * X, Indirect
     * 
     * An 8-bit zero-page address and the X register are added, without 
     * carry (if the addition overflows, the address wraps around within 
     * page 0).
     * 
     * The resulting address is used as a pointer to the data being accessed.
     * Note that, effectively, this makes the X register an index into a list 
     * of pointers.
     */
    addrIndirectX=()=> {
        let t = this.readData(this.reg.pc, "addr - ind x");
        this.reg.pc += 1;
        let lo = this.readData((t + this.reg.x) & 0x00FF, "addr - ind x lo");
        let hi = this.readData((t + this.reg.x + 1) & 0x00FF, "addr - ind x hi");
        this.stash.addr = (hi << 8) | lo;
        return 0;
    }

    addrIndirect=()=> {
        let lo = this.readData(this.reg.pc, "addr - ind lo");
        let hi = this.readData(this.reg.pc + 1, "addr - ind hi");
        let ptr = (hi << 8) | lo;
    
        if (lo == 0x00FF) { // Simulate page boundary hardware bug
            let loAddr = this.readData(ptr + 0, "addr - ind page boundary lo");
            let hiAddr = this.readData(ptr & 0xFF00, "addr - ind page boundary hi");
            this.stash.addr = (hiAddr << 8) | loAddr;
        }
        else {// Behave normally
            let loAddr = this.readData(ptr + 0, "addr - ind lo");
            let hiAddr = this.readData(ptr + 1, "addr - ind hi");
            this.stash.addr = (hiAddr << 8) | loAddr;
        }
        this.reg.pc += 2;
        return 0;
    }

    addrAbsoluteY=()=> {
        var penalty = 0;
        let lo = this.readData(this.reg.pc, "addr - abs y lo");
        let hi = this.readData(this.reg.pc + 1, "add - abs y hi");
        this.stash.addr = (hi << 8) | lo;
        let startpage = this.stash.addr & 0xFF00;
        this.stash.addr += this.reg.y;

        //one cycle penlty for page-crossing
        if (startpage != (this.stash.addr & 0xFF00)) {
            penalty = 1;
        }

        this.reg.pc += 2;
        return penalty;
    }

    addrAbsoluteX=()=> {
        var penalty = 0;
        let lo = this.readData(this.reg.pc, "addr - abs x lo");
        let hi = this.readData(this.reg.pc + 1, "addr - abs x hi");
        this.stash.addr = (hi << 8) | lo;
        let startpage = this.stash.addr & 0xFF00;
        this.stash.addr += this.reg.x;

        //one cycle penlty for page-crossing
        if (startpage != (this.stash.addr & 0xFF00)) {
            penalty = 1;
        }

        this.reg.pc += 2;
        return penalty;
    }

    /**
     * Absolute
     * 
     * Data is accessed using 16-bit address specified as a constant.
     */
    addrAbsolute=()=> {
        let lo = this.readData(this.reg.pc, "addr - abs lo");
        let hi = this.readData(this.reg.pc + 1, "addr - abs hi");
        this.stash.addr = (hi << 8) | lo;
        this.reg.pc += 2;
        return 0;
    }

    /**
     * Y, Zero page
     * 
     * An 8-bit address is provided, to which the Y register is added (without carry - 
     * if the addition overflows, the address wraps around within the zero page).
     */
     addrZeroPageY=()=> {
        this.stash.addr = (this.readData(this.reg.pc, "addr - zp y")  + this.reg.y) & 0x00FF;
        this.reg.pc += 1;
        return 0;
    }

    /**
     * X, Zero page
     * 
     * An 8-bit address is provided, to which the X register is added (without carry - 
     * if the addition overflows, the address wraps around within the zero page).
     */
    addrZeroPageX=()=> {
        this.stash.addr = (this.readData(this.reg.pc, "addr - zp x") + this.reg.x) & 0x00FF;
        this.reg.pc += 1;
        return 0;
    }

    /**
     * Zero page
     * 
     * An 8-bit address is provided within the zero page.
     */
    addrZeroPage=()=> {
        this.stash.addr = this.readData(this.reg.pc, "addr - zp") & 0x00FF;
        this.reg.pc += 1;
        return 0;
    }

    addrImmediate=()=> {
        this.stash.addr = this.reg.pc;
        this.reg.pc += 1;
        return 0;
    }

    /**
     * Relative
     * 
     * An 8-bit signed offset is provided. This value is added to the program counter 
     * (PC) to find the effective address.
     */
    addrRelative=()=> {
        let rel = this.readData(this.reg.pc, "add - rel");
        this.reg.pc += 1;
        if ((rel & 0x80) == 0x80) {
            rel |= 0xFF00;
        }
        this.stash.addr = rel;
        return 0;
    }

    addrImplied(): number {
        return 0;
    }

    abstract readData(theAddr: number, context:string): number;
    abstract writeData(theAddr: number, theValue: number, context:string): void;
}