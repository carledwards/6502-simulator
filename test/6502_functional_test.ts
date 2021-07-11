/** 
 * This test runs Klaus2m5's 6502 functional tests.
 * 
 * The file is located here: https://github.com/Klaus2m5/6502_65C02_functional_tests/blob/master/bin_files/6502_functional_test.bin
 * and needs to be placed into the project's root folder.
 * 
 * This test takes a long time to run (multiple hours).
 */

import { CpuRunner } from "../src/cpu6502/cpu-runner";
import { Motherboard } from '../src/motherboard';
import { Ram } from "../src/components/ram";

var motherboard = new Motherboard(
    new CpuRunner({
        skipFullCycles : true,
        startAddr : 0x0400,  // starting addr for the functional test
        breakOnInfiniteLoop: true
    }), 10);
var ram = new Ram(0x10000);  // 64k of ram
motherboard.getComponentManager().add(0x0000, ram);
motherboard.reset();

// the tests has self-modifying code so they need to be in RAM
// load the test file and push it into the RAM
// NOTE: this has to be done *after* the reset() call as that call will zero-out memory
var fs = require('fs'), binary = fs.readFileSync('./6502_functional_test.bin');
for (var i = 0; i < binary.length; i++) {
    ram.memory[i] = binary[i];
}

// NOTE: if you want to jump to a specific test, add the lo/hi vectors here
//  ram.memory[0x040C] = 0x03;  // lo
//  ram.memory[0x040D] = 0x33;  // hi

motherboard.resume();