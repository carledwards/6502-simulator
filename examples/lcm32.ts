import { CpuRunner } from "../src/cpu6502/cpu-runner";
import { Motherboard } from '../src/motherboard';
import { Ram } from "../src/components/ram";
import { Rom } from "../src/components/rom";
import { Register, AddressMode } from "../src/cpu6502/internals";
import { Opcode } from "../src/cpu6502/opcodes";
import { Via6522 } from "../src/components/via-6522";

// helpers
let _statusFlagsUpper = ['N', 'V', '-', 'B', 'D', 'I', 'Z', 'C'];
let _statusFlagsLower = ['n', 'v', '-', 'b', 'd', 'i', 'z', 'c'];

function toHexByte(val: number): string {
    return val.toString(16).toUpperCase().padStart(2, '0')
}

function toHexWord(val: number): string {
    return val.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * LCM32 Memory Map:
 * 
 * $0000-$1FFF - RAM
 * $6000-$600F - VIA 6522 #1
 * $8000-$800F - VIA 6522 #2
 * $E000-$FFFF - ROM
 */

// create the CpuRunner and Motherboard
let runner = new CpuRunner({
    breakOnInfiniteLoop: true,
    skipFullCycles: true
});
var motherboard = new Motherboard(
    runner, 
    30  // perform clock ticks every ~30ms
    );

// install RAM
motherboard.getComponentManager().add(
    0x0000, // starting at $0000
    new Ram(0x2000)); // 8k in size

// install ROM
let rom = new Rom(0x2000); // 8k in size
motherboard.getComponentManager().add(
    0xE000, // starting at $E000
    rom);

// VIA6522 #1
let via6522_1 = new Via6522();
motherboard.getComponentManager().add(0x6000, via6522_1);

// VIA6522 #2
let via6522_2 = new Via6522();
motherboard.getComponentManager().add(0x8000, via6522_2);

// read in the assembled program generaged by the Ophis assembler
var fs = require('fs'), binary = fs.readFileSync('lcm32.bin');
for (var i = 0; i < binary.length; i++) {
    rom.program[i] = binary[i];
}

// install event listeners
runner.on("readData", (context, addr, data) => {
    // uncomment to see the data being read
    // console.log(`\t${context} - 0x${toHexByte(data)} read from $${toHexWord(addr)}`);
});

runner.on("writeData", (context, addr, data) => {
    // uncomment to see the data being written
    // console.log(`\t${context} - 0x${toHexByte(data)} written to $${toHexWord(addr)}`);
});

runner.on("execOpcode", (reg: Register, opcode: Opcode) => {
    var statusFlags = [..._statusFlagsUpper];
    for (var i = 0; i < 8; i++) {
        if (!reg.isFlag(2 ** (7 - i))) {
            statusFlags[i] = _statusFlagsLower[i];
        }
    }

    console.log(`pc:${toHexWord(reg.pc)} ${opcode.name.toUpperCase()}:${toHexByte(opcode.opcode)}`
        + ` - a:${toHexByte(reg.a)} x:${toHexByte(reg.x)} y:${toHexByte(reg.y)} sp:${toHexByte(reg.sp)}`
        + ` [${statusFlags.join('')}] [${reg.p.toString(2).padStart(8, '0')}] mode:${AddressMode[opcode.addrMode]}`);
});

runner.on("irq", (currentPc: number) => {
    console.log (`IRQ at pc: ${toHexWord(currentPc)}`);
});

runner.on("nmi", (currentPc: number) => {
    console.log (`NMI at pc: ${toHexWord(currentPc)}`);
});

via6522_1.on("PORTA", (prevValue:number, newValue:number) => {
    // LED is active low
    const led = ~newValue & 0xFF;
    console.log (`\n\nvia-1 - PORT-A LED: 0b${led.toString(2).padStart(8, '0')}\n\n`);
});

via6522_1.on("PORTB", (prevValue:number, newValue:number) => {
    console.log (`\n\nvia-1 - PORT-B LED: 0b${newValue.toString(2).padStart(8, '0')}\n\n`);
});

via6522_2.on("PORTA", (prevValue:number, newValue:number) => {
    console.log (`\n\nvia-2 - PORT-A LED: 0b${newValue.toString(2).padStart(8, '0')}\n\n`);
});

via6522_2.on("PORTB", (prevValue:number, newValue:number) => {
    console.log (`\n\nvia-2 - PORT-B LED: 0b${newValue.toString(2).padStart(8, '0')}\n\n`);
});

// reset everything and run the app
motherboard.reset();
motherboard.resume();