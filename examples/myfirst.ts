import { CpuRunner } from "../src/cpu6502/cpu-runner";
import { Motherboard } from '../src/motherboard';
import { Ram } from "../src/components/ram";
import { Rom } from "../src/components/rom";
import { Register } from "../src/cpu6502/internals";
import { Opcode } from "../src/cpu6502/opcodes";

let runner = new CpuRunner({
  startAddr: 0xE000 // start at $E000
});

let motherboard = new Motherboard(
  runner, 
  10  // tick the system clock every 10ms
);

motherboard.getComponentManager().add(
  0x0000,          // staring address
  new Ram(0x2000)  // 8k of memory
);

let rom = new Rom(0x2000);
let code = [
    0xa9, 0xff,         // lda #$ff
    0x8d, 0x00, 0x03,   // sta $300
    0x4c, 0x00, 0xE0,   // jmp $E000
];  
for (var i = 0; i < code.length; i++) {
    rom.program[i] = code[i];
}
motherboard.getComponentManager().add(0xE000, rom);

runner.on("execOpcode", (reg:Register, opcode: Opcode) => {
  process.stdout.write(".");
});

motherboard.reset();
motherboard.resume();