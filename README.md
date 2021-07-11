# 6502 Simulator
Simulates a 6502 CPU and allows for connecting components on a motherboard (e.g. RAM, ROM, 6522).

Disclaimer: This is my first app being built with TypeScript and Node.  You will see many "newbie" mistakes in here.  I do appreciate any feedback you have to make my skills better.

Why another 6502 Simulator?  This project was inspired by the [LCM-32 (Low Cost Microcontroller)](https://github.com/carledwards/lcm-32) created back in 1986.  I was fortunate to work with [Matt Gilliland](https://www.amazon.com/Microcontroller-Application-Cookbook-Cookbooks/dp/0615115527/ref=sr_1_2?dchild=1&qid=1626021321&refinements=p_27%3AMatt+Gilliland&s=books&sr=1-2&text=Matt+Gilliland) to help create and sell this microcontroller.  We spent many hours laying out/verifying the traces on his light-board.  My love for software and creative debugging came when programming the LCM-32 on using a Commodore 64, the [Promenade C1 EEPROM Programmer](http://mikenaberezny.com/hardware/c64-128/promenade-c1-eprom-burner/), and the [HES MON 64](https://archive.org/details/HES_Mon_64_1983_HesWare).

## Setup
Install the dependant Node libraries:

	yarn install

## Running Hello World - an LED counter


	yarn helloworld

What it does:

* Adds RAM, ROM, 6522 and an Interrupt Generator
* Every time the IRQ fires, it increments PORT A of the VIA chip
* Every time the NMI fires, it increments PORT B of the VIA chip
* The main loop of the app is a NOP + JMP

Sample output:

	opcode - 0xEA read from $E013
	pc:E013 NOP:EA - a:FF x:00 y:00 sp:FF [Nv-bdizc] [10100000] mode:IMP
	
	opcode - 0x4C read from $E014
	pc:E014 JMP:4C - a:FF x:00 y:00 sp:FF [Nv-bdizc] [10100000] mode:ABSO
		addr - abs lo - 0x13 read from $E015
		addr - abs hi - 0xE0 read from $E016
	IRQ at pc: E013
		irq - pc hi - 0xE0 written to $01FF
		irq - pc lo - 0x13 written to $01FE
		irq - status flag - 0xA0 written to $01FD
		irq vec - lo - 0x00 read from $FFFE
		irq vec - hi - 0xF1 read from $FFFF
	
	opcode - 0xEE read from $F100
	pc:F100 INC:EE - a:FF x:00 y:00 sp:FC [Nv-bdIzc] [10100100] mode:ABSO
		addr - abs lo - 0x01 read from $F101
		addr - abs hi - 0xB0 read from $F102
		inc - 0x07 read from $B001
		inc - 0x08 written to $B001
	
	PORT-A LED: 0b00001000
	
	opcode - 0x40 read from $F103
	pc:F103 RTI:40 - a:FF x:00 y:00 sp:FC [nv-bdIzc] [00100100] mode:IMP
		rti - status flag - 0xA0 read from $01FD
		rti - pc lo - 0x13 read from $01FE
		rti - pc hi - 0xE0 read from $01FF
	
	opcode - 0xEA read from $E013
	pc:E013 NOP:EA - a:FF x:00 y:00 sp:FF [Nv-bdizc] [10100000] mode:IMP

## Creating your own simulation
1. Create the `CpuRunner`

        let runner = new CpuRunner({
              startAddr: 0xE000 // start at $E000
        });

2. Create the `Motherboard`

        let motherboard = new Motherboard(
            runner, 
            10  // tick the system clock every 10ms
        );

3. Create an 8k block of RAM and add it to the motherboard starting at `$0000`
        
        motherboard.getComponentManager().add(
            0x0000,          // staring address
            new Ram(0x2000)  // 8k of memory
        );


4. Create an 8k ROM, copy the program into it, add it to the motherboard

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

5. Add some output during execution

		runner.on("execOpcode", (reg:Register, opcode: Opcode) => {
		  process.stdout.write(".");
		});
 
6. Reset the motherboard and resume

        motherboard.reset();
        motherboard.resume(); // cpu will be start running



## CpuRunner Configuration

The CpuRunner can be configured by passing the any of following config items in the constructor:

| Key | Type | Description |
| --- | --- | --- |
| startAddr | number | CPU starting address.  Default is to use reset vectors at $FFFC and $FFFD |
| breakOnInfiniteLoop | boolean | App will stop working if the program counter doesn't advance |
| skipFullCycles | boolean | skip processing full opcode cpu cycles  |


## System Components

Components are items that are installed on to the motherboard and are connected through a bus.  Components get their clock after the CPU performs a clock cycle.  If you set the CpuRunner config `skipFullCycles` to `true`, each installed component will get one clock tick for every instruction executed.

### Ram

* Can be configured to any size
* Allows read and write of any size
* Reset on the motherboard will reset all of memory to a value of 0 (zero)

### Rom

* Can be configured to any size
* Allows read only (writes will be ignored)
* Reset does not affect the stored program

### 6522

* Has a fixed set of 16 registers
* Only the follow registers are supported:
	* $00 - DDRB
	* $01 - DDRA
	* $02 - PORTB
	* $03 - PORTA

*Note:* Timers, CB are not implemented at this time, writing to any of the other registers will throw an error and stop the app.

### Interrupt Generator

Allows you to test your IRQ/NMI code as this component will auto-generate interrupts on a timer.

* When installed on the motherboard, there are two registers that hold a 1-byte interval timer value: 
	* $01 - IRQ
	* $02 - NMI
* The 1-byte register value represents 1/10 of a second.
* A value of 0 (zero) disables the timer.


## Events
To "listen in" on different components in the system, there are Emitter Events available for gluing the internals to the outside world.

| Component | Event | Parameters |
| --- | --- | --- |
| CpuRunner | readData | `context` - (string) description of the operation, `addr` - (number) address being read, `data` - (number) data returned from the read |
| CpuRunner | writeData | `context` - (string) description of the operation, `addr` - (number) address being written to, `data` - (number) data being written |
| CpuRunner | execOpcode | `reg` - (internals.Register) all of the CPU internal registers, `opcodeDef` - (opcodes.Opcode) definition of the opcode |
| CpuRunner | irq | `currentPc` - (number) current program counter |
| CpuRunner | nmi | `currentPc` - (number) current program counter |
| Via6522 | DDRA | `prevValue` - (number) previous value of this register, `newValue` - (number) new value |
| Via6522 | DDRB | `prevValue` - (number) previous value of this register, `newValue` - (number) new value |
| Via6522 | PORTA | `prevValue` - (number) previous value of this register, `newValue` - (number) new value |
| Via6522 | PORTB | `prevValue` - (number) previous value of this register, `newValue` - (number) new value |


## Running the unit and functional tests

###Unit tests

	yarn test

###Functional tests
Download Klaus2m5's file: [6502\_functional\_test.bin](https://github.com/Klaus2m5/6502_65C02_functional_tests/blob/master/bin_files/6502_functional_test.bin). Place this file in the root direction of the project. Run the following command:

	yarn functional

## Errata

* Not all of the timing penalties have been implemented/verified. Something for the future for completeness.
* Decimal mode is not implemented

## Special Thanks To...
This project utilized multiple different existing resources.  I really appreciate all of their hard work they have put in to building their simulators and being a reference:

* First and foremost, to [Matt Gilliland](https://www.amazon.com/Microcontroller-Application-Cookbook-Cookbooks/dp/0615115527/ref=sr_1_2?dchild=1&qid=1626021321&refinements=p_27%3AMatt+Gilliland&s=books&sr=1-2&text=Matt+Gilliland).  Matt has not only been my mentor and inspiration helping me discover my passion for the insersection of software-meets-hardware, but really one of the best friends anyone can have.
* All of the people who have contributed on [6502.org](http://www.6502.org/tutorials/)
* [Ben Eater](https://eater.net/)
* [Easy 6502](https://skilldrick.github.io/easy6502/)
* [gianlucag's mos6502](https://github.com/gianlucag/mos6502)
* [Jeremy Neiman's Py65 Emu](https://github.com/docmarionum1/py65emu)
* [Klaus2m5](https://github.com/Klaus2m5/6502_65C02_functional_tests) 
* [MAMEHub](https://github.com/MisterTea/MAMEHub)
* [Matt Goldbolt's Blog](https://xania.org/201405/jsbeeb-emulating-a-bbc-micro-in-javascript)
* [rubbermallet's fake 6502](http://rubbermallet.org/fake6502.c)
* [Visual 6502](https://github.com/trebonian/visual6502) 
