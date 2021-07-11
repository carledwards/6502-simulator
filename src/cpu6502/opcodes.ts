import { AddressMode, Internals, StatusFlag } from './internals';

export interface Opcode {
    opcode: number,
    name: string,
    exec: () => number,
    cycles: number,
    addrMode: AddressMode
}

export abstract class Opcodes extends Internals {
    opcodes: Opcode[];

    constructor() {
        super();
        this.opcodes = [
            {opcode: 0x00, name: 'brk', exec: this.brkOpcode, cycles: 7, addrMode: AddressMode.IMP},
            {opcode: 0x01, name: 'ora', exec: this.oraOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0x02, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x03, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x04, name: 'nop', exec: this.nopOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x05, name: 'ora', exec: this.oraOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x06, name: 'asl', exec: this.aslOpcode, cycles: 5, addrMode: AddressMode.ZP},
            {opcode: 0x07, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x08, name: 'php', exec: this.phpOpcode, cycles: 3, addrMode: AddressMode.IMP},
            {opcode: 0x09, name: 'ora', exec: this.oraOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x0A, name: 'asl', exec: this.aslOpcode_acc, cycles: 2, addrMode: AddressMode.ACC},
            {opcode: 0x0B, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x0C, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x0D, name: 'ora', exec: this.oraOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x0E, name: 'asl', exec: this.aslOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0x0F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x10, name: 'bpl', exec: this.bplOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0x11, name: 'ora', exec: this.oraOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0x12, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x13, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x14, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x15, name: 'ora', exec: this.oraOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x16, name: 'asl', exec: this.aslOpcode, cycles: 6, addrMode: AddressMode.ZPX},
            {opcode: 0x17, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x18, name: 'clc', exec: this.clcOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x19, name: 'ora', exec: this.oraOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0x1A, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x1B, name: 'slo', exec: this.illegalOpcode, cycles: 7, addrMode: AddressMode.ABSY},
            {opcode: 0x1C, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x1D, name: 'ora', exec: this.oraOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x1E, name: 'asl', exec: this.aslOpcode, cycles: 7, addrMode: AddressMode.ABSX},
            {opcode: 0x1F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x20, name: 'jsr', exec: this.jsrOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0x21, name: 'and', exec: this.andOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0x22, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x23, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x24, name: 'bit', exec: this.bitOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x25, name: 'and', exec: this.andOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x26, name: 'rol', exec: this.rolOpcode, cycles: 5, addrMode: AddressMode.ZP},
            {opcode: 0x27, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x28, name: 'plp', exec: this.plpOpcode, cycles: 4, addrMode: AddressMode.IMP},
            {opcode: 0x29, name: 'and', exec: this.andOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x2A, name: 'rol', exec: this.rolOpcode_acc, cycles: 2, addrMode: AddressMode.ACC},
            {opcode: 0x2B, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x2C, name: 'bit', exec: this.bitOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x2D, name: 'and', exec: this.andOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x2E, name: 'rol', exec: this.rolOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0x2F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x30, name: 'bmi', exec: this.bmiOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0x31, name: 'and', exec: this.andOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0x32, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x33, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x34, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x35, name: 'and', exec: this.andOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x36, name: 'rol', exec: this.rolOpcode, cycles: 6, addrMode: AddressMode.ZPX},
            {opcode: 0x37, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x38, name: 'sec', exec: this.secOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x39, name: 'and', exec: this.andOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0x3A, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x3B, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x3C, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x3D, name: 'and', exec: this.andOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x3E, name: 'rol', exec: this.rolOpcode, cycles: 7, addrMode: AddressMode.ABSX},
            {opcode: 0x3F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x40, name: 'rti', exec: this.rtiOpcode, cycles: 6, addrMode: AddressMode.IMP},
            {opcode: 0x41, name: 'eor', exec: this.eorOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0x42, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x43, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x44, name: 'nop', exec: this.nopOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x45, name: 'eor', exec: this.eorOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x46, name: 'lsr', exec: this.lsrOpcode, cycles: 5, addrMode: AddressMode.ZP},
            {opcode: 0x47, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x48, name: 'pha', exec: this.phaOpcode, cycles: 3, addrMode: AddressMode.IMP},
            {opcode: 0x49, name: 'eor', exec: this.eorOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x4A, name: 'lsr', exec: this.lsrOpcode_acc, cycles: 2, addrMode: AddressMode.ACC},
            {opcode: 0x4B, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x4C, name: 'jmp', exec: this.jmpOpcode, cycles: 3, addrMode: AddressMode.ABSO},
            {opcode: 0x4D, name: 'eor', exec: this.eorOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x4E, name: 'lsr', exec: this.lsrOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0x4F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x50, name: 'bvc', exec: this.bvcOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0x51, name: 'eor', exec: this.eorOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0x52, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x53, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x54, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x55, name: 'eor', exec: this.eorOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x56, name: 'lsr', exec: this.lsrOpcode, cycles: 6, addrMode: AddressMode.ZPX},
            {opcode: 0x57, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x58, name: 'cli', exec: this.cliOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x59, name: 'eor', exec: this.eorOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0x5A, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x5B, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x5C, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x5D, name: 'eor', exec: this.eorOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x5E, name: 'lsr', exec: this.lsrOpcode, cycles: 7, addrMode: AddressMode.ABSX},
            {opcode: 0x5F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x60, name: 'rts', exec: this.rtsOpcode, cycles: 6, addrMode: AddressMode.IMP},
            {opcode: 0x61, name: 'adc', exec: this.adcOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0x62, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x63, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x64, name: 'nop', exec: this.nopOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x65, name: 'adc', exec: this.adcOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x66, name: 'ror', exec: this.rorOpcode, cycles: 5, addrMode: AddressMode.ZP},
            {opcode: 0x67, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x68, name: 'pla', exec: this.plaOpcode, cycles: 4, addrMode: AddressMode.IMP},
            {opcode: 0x69, name: 'adc', exec: this.adcOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x6A, name: 'ror', exec: this.rorOpcode_acc, cycles: 2, addrMode: AddressMode.ACC},
            {opcode: 0x6B, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x6C, name: 'jmp', exec: this.jmpOpcode, cycles: 5, addrMode: AddressMode.IND},
            {opcode: 0x6D, name: 'adc', exec: this.adcOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x6E, name: 'ror', exec: this.rorOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0x6F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x70, name: 'bvs', exec: this.bvsOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0x71, name: 'adc', exec: this.adcOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0x72, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x73, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x74, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x75, name: 'adc', exec: this.adcOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x76, name: 'ror', exec: this.rorOpcode, cycles: 6, addrMode: AddressMode.ZPX},
            {opcode: 0x77, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x78, name: 'sei', exec: this.seiOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x79, name: 'adc', exec: this.adcOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0x7A, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x7B, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x7C, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x7D, name: 'adc', exec: this.adcOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0x7E, name: 'ror', exec: this.rorOpcode, cycles: 7, addrMode: AddressMode.ABSX},
            {opcode: 0x7F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x80, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x81, name: 'sta', exec: this.staOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0x82, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x83, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x84, name: 'sty', exec: this.styOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x85, name: 'sta', exec: this.staOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x86, name: 'stx', exec: this.stxOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0x87, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x88, name: 'dey', exec: this.deyOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x89, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x8A, name: 'txa', exec: this.txaOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x8B, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0x8C, name: 'sty', exec: this.styOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x8D, name: 'sta', exec: this.staOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x8E, name: 'stx', exec: this.stxOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0x8F, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x90, name: 'bcc', exec: this.bccOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0x91, name: 'sta', exec: this.staOpcode, cycles: 6, addrMode: AddressMode.INDY},
            {opcode: 0x92, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x93, name: 'nop', exec: this.nopOpcode, cycles: 6, addrMode: AddressMode.INDY},
            {opcode: 0x94, name: 'sty', exec: this.styOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x95, name: 'sta', exec: this.staOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0x96, name: 'stx', exec: this.stxOpcode, cycles: 4, addrMode: AddressMode.ZPY},
            {opcode: 0x97, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0x98, name: 'tya', exec: this.tyaOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x99, name: 'sta', exec: this.staOpcode, cycles: 5, addrMode: AddressMode.ABSY},
            {opcode: 0x9A, name: 'txs', exec: this.txsOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0x9B, name: 'nop', exec: this.nopOpcode, cycles: 5, addrMode: AddressMode.ABSY},
            {opcode: 0x9C, name: 'nop', exec: this.nopOpcode, cycles: 5, addrMode: AddressMode.ABSX},
            {opcode: 0x9D, name: 'sta', exec: this.staOpcode, cycles: 5, addrMode: AddressMode.ABSX},
            {opcode: 0x9E, name: 'nop', exec: this.nopOpcode, cycles: 5, addrMode: AddressMode.ABSY},
            {opcode: 0x9F, name: 'nop', exec: this.nopOpcode, cycles: 5, addrMode: AddressMode.ABSY},
            {opcode: 0xA0, name: 'ldy', exec: this.ldyOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xA1, name: 'lda', exec: this.ldaOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0xA2, name: 'ldx', exec: this.ldxOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xA3, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xA4, name: 'ldy', exec: this.ldyOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xA5, name: 'lda', exec: this.ldaOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xA6, name: 'ldx', exec: this.ldxOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xA7, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xA8, name: 'tay', exec: this.tayOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xA9, name: 'lda', exec: this.ldaOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xAA, name: 'tax', exec: this.taxOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xAB, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xAC, name: 'ldy', exec: this.ldyOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xAD, name: 'lda', exec: this.ldaOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xAE, name: 'ldx', exec: this.ldxOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xAF, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xB0, name: 'bcs', exec: this.bcsOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0xB1, name: 'lda', exec: this.ldaOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0xB2, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xB3, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xB4, name: 'ldy', exec: this.ldyOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0xB5, name: 'lda', exec: this.ldaOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0xB6, name: 'ldx', exec: this.ldxOpcode, cycles: 4, addrMode: AddressMode.ZPY},
            {opcode: 0xB7, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xB8, name: 'clv', exec: this.clvOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xB9, name: 'lda', exec: this.ldaOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0xBA, name: 'tsx', exec: this.tsxOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xBB, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xBC, name: 'ldy', exec: this.ldyOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0xBD, name: 'lda', exec: this.ldaOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0xBE, name: 'ldx', exec: this.ldxOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0xBF, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xC0, name: 'cpy', exec: this.cpyOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xC1, name: 'cmp', exec: this.cmpOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0xC2, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xC3, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xC4, name: 'cpy', exec: this.cpyOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xC5, name: 'cmp', exec: this.cmpOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xC6, name: 'dec', exec: this.decOpcode, cycles: 5, addrMode: AddressMode.ZP},
            {opcode: 0xC7, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xC8, name: 'iny', exec: this.inyOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xC9, name: 'cmp', exec: this.cmpOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xCA, name: 'dex', exec: this.dexOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xCB, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xCC, name: 'cpy', exec: this.cpyOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xCD, name: 'cmp', exec: this.cmpOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xCE, name: 'dec', exec: this.decOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0xCF, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xD0, name: 'bne', exec: this.bneOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0xD1, name: 'cmp', exec: this.cmpOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0xD2, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xD3, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xD4, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0xD5, name: 'cmp', exec: this.cmpOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0xD6, name: 'dec', exec: this.decOpcode, cycles: 6, addrMode: AddressMode.ZPX},
            {opcode: 0xD7, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xD8, name: 'cld', exec: this.cldOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xD9, name: 'cmp', exec: this.cmpOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0xDA, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xDB, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xDC, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0xDD, name: 'cmp', exec: this.cmpOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0xDE, name: 'dec', exec: this.decOpcode, cycles: 7, addrMode: AddressMode.ABSX},
            {opcode: 0xDF, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xE0, name: 'cpx', exec: this.cpxOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xE1, name: 'sbc', exec: this.sbcOpcode, cycles: 6, addrMode: AddressMode.INDX},
            {opcode: 0xE2, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xE3, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xE4, name: 'cpx', exec: this.cpxOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xE5, name: 'sbc', exec: this.sbcOpcode, cycles: 3, addrMode: AddressMode.ZP},
            {opcode: 0xE6, name: 'inc', exec: this.incOpcode, cycles: 5, addrMode: AddressMode.ZP},
            {opcode: 0xE7, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xE8, name: 'inx', exec: this.inxOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xE9, name: 'sbc', exec: this.sbcOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xEA, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xEB, name: 'sbc', exec: this.sbcOpcode, cycles: 2, addrMode: AddressMode.IMM},
            {opcode: 0xEC, name: 'cpx', exec: this.cpxOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xED, name: 'sbc', exec: this.sbcOpcode, cycles: 4, addrMode: AddressMode.ABSO},
            {opcode: 0xEE, name: 'inc', exec: this.incOpcode, cycles: 6, addrMode: AddressMode.ABSO},
            {opcode: 0xEF, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xF0, name: 'beq', exec: this.beqOpcode, cycles: 2, addrMode: AddressMode.REL},
            {opcode: 0xF1, name: 'sbc', exec: this.sbcOpcode, cycles: 5, addrMode: AddressMode.INDY},
            {opcode: 0xF2, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xF3, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xF4, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0xF5, name: 'sbc', exec: this.sbcOpcode, cycles: 4, addrMode: AddressMode.ZPX},
            {opcode: 0xF6, name: 'inc', exec: this.incOpcode, cycles: 6, addrMode: AddressMode.ZPX},
            {opcode: 0xF7, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xF8, name: 'sed', exec: this.sedOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xF9, name: 'sbc', exec: this.sbcOpcode, cycles: 4, addrMode: AddressMode.ABSY},
            {opcode: 0xFA, name: 'nop', exec: this.nopOpcode, cycles: 2, addrMode: AddressMode.IMP},
            {opcode: 0xFB, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
            {opcode: 0xFC, name: 'nop', exec: this.nopOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0xFD, name: 'sbc', exec: this.sbcOpcode, cycles: 4, addrMode: AddressMode.ABSX},
            {opcode: 0xFE, name: 'inc', exec: this.incOpcode, cycles: 7, addrMode: AddressMode.ABSX},
            {opcode: 0xFF, name: 'ill', exec: this.illegalOpcode, cycles: 0, addrMode: AddressMode.IMM},
        ];
    }

    rtiOpcode = ()=> {
        this.reg.p = this.stackPopByte("rti - status flag");
        this.reg.pc = this.stackPopWord("rti - pc");        
        return 0;
    }
    
    brkOpcode = ()=> {
        this.reg.pc++;
        this.stackPushWord(this.reg.pc, "brk - pc");
        this.stackPushByte(this.reg.p | StatusFlag.Break, "brk - status flag");
        this.reg.setStatusFlag(StatusFlag.Interrupt, true);
        this.reg.pc = this.readData(0xFFFE, "brk - irq vec - lo") | (this.readData(0xFFFF, "brk - irq vec - hi") << 8);
        return 0;
    }

    oraOpcode = ()=> {
        let value = this.readData(this.stash.addr, "ora");
        let result = this.reg.a | value;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.a = result;
        return 1;
    }

    nopOpcode = ()=> {
        return 0;
    }

    illegalOpcode = ()=> {
        throw new Error(`illegal opcode used`);
    }

    aslOpcode_acc = ()=> {
        let value = this.reg.a;
        let result = value << 1;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.setStatusFlag(StatusFlag.Carry, result > 0xFF);
        this.reg.a = result;
        return 0;
    }

    aslOpcode = ()=> {
        let value = this.readData(this.stash.addr, "asl");
        let result = value << 1;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.setStatusFlag(StatusFlag.Carry, result > 0xFF);
        this.writeData(this.stash.addr, result & 0xFF, "asl");
        return 0;
    }

    bplOpcode = ()=> {
        if (!this.reg.isFlag(StatusFlag.Negative)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    clcOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Carry, false);
        return 0;
    }

    jsrOpcode = ()=> {
        this.reg.pc--;

        this.stackPushWord(this.reg.pc, "jsr - pc");
        this.reg.pc = this.stash.addr;
        return 0;
    }

    rtsOpcode = ()=> {
        this.reg.pc = this.stackPopWord("rts - pc");
        this.reg.pc++;
        return 0;
    }

    andOpcode = ()=> {
        let value = this.readData(this.stash.addr, "and");
        let result = value & this.reg.a;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.a = result;
        return 1;
    }

    bitOpcode = ()=> {
        let value = this.readData(this.stash.addr, "bit");
        let result = this.reg.a & value;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (value & StatusFlag.Negative) == StatusFlag.Negative);
        this.reg.setStatusFlag(StatusFlag.Overflow, (value & StatusFlag.Overflow) == StatusFlag.Overflow);
        return 0;
    }

    rolOpcode_acc = ()=> {
        let value = this.reg.a;
        var result = value << 1;
        if (this.reg.isFlag(StatusFlag.Carry)) {
            result |= 0x01;
        }
        this.reg.setStatusFlag(StatusFlag.Carry, result > 0xFF);
        result &= 0xFF;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.a = result;
        return 0;
    }

    rolOpcode = ()=> {
        let value = this.readData(this.stash.addr, "rol");
        var result = value << 1;
        if (this.reg.isFlag(StatusFlag.Carry)) {
            result |= 0x01;
        }
        this.reg.setStatusFlag(StatusFlag.Carry, result > 0xFF);
        result &= 0xFF;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.writeData(this.stash.addr, result, "rol");
        return 0;
    }

    phpOpcode = ()=> {
        this.stackPushByte(this.reg.p | StatusFlag.Break, "php status flag");
        return 0;
    }

    phaOpcode = ()=> {
        this.stackPushByte(this.reg.a, "pha status flag");
        return 0;
    }

    plaOpcode = ()=> {
        this.reg.a = this.stackPopByte("pla reg.a");
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.a == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.a & 0x80) == 0x80);
        return 0;
    }

    plpOpcode = ()=> {
        this.reg.p = this.stackPopByte("plp status flag");
        this.reg.setStatusFlag(StatusFlag.Constant, true);
        return 0;
    }

    tsxOpcode = ()=> {
        this.reg.x = this.reg.sp;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.x == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.x & 0x80) == 0x80);
        return 0;
    }

    txsOpcode = ()=> {
        this.reg.sp = this.reg.x;
        return 0;
    }

    bmiOpcode = ()=> {
        if (this.reg.isFlag(StatusFlag.Negative)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    secOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Carry, true);
        return 0;
    }

    eorOpcode = ()=> {
        this.reg.a = this.reg.a ^ this.readData(this.stash.addr, "eor");
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.a == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.a & 0x80) == 0x80);
        return 1;
    }

    lsrOpcode_acc = ()=> {
        let value = this.reg.a;
        this.reg.setStatusFlag(StatusFlag.Carry, (value & 0x01) == 0x01);
        let result = value >> 1;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.a = result;
        return 0;
    }

    lsrOpcode = ()=> {
        let value = this.readData(this.stash.addr, "lsr");
        this.reg.setStatusFlag(StatusFlag.Carry, (value & 0x01) == 0x01);
        let result = value >> 1;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.writeData(this.stash.addr, result & 0xFF, "lsr");
        return 0;
    }

    jmpOpcode = ()=> {
        this.reg.pc = this.stash.addr;
        return 0;
    }

    bvcOpcode = ()=> {
        if (!this.reg.isFlag(StatusFlag.Overflow)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    cliOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Interrupt, false);
        return 0;
    }

    adcOpcode = ()=> {
        let fetched = this.readData(this.stash.addr, "adc");
        var temp = this.reg.a + fetched + (this.reg.isFlag(StatusFlag.Carry) ? 1 : 0);
        this.reg.setStatusFlag(StatusFlag.Carry, temp > 0xFF);
        this.reg.setStatusFlag(StatusFlag.Zero, (temp & 0xFF) == 0);
        this.reg.setStatusFlag(StatusFlag.Negative, (temp & 0x80) == 0x80);
        this.reg.setStatusFlag(StatusFlag.Overflow, ((~(this.reg.a ^ fetched) & (this.reg.a ^ temp)) & 0x0080) == 0x0080);
        this.reg.a = temp;
        return 1;
    }

    rorOpcode_acc = ()=> {
        let value = this.reg.a;
        var result = value;
        if (this.reg.isFlag(StatusFlag.Carry)) {
            result |= 0x0100; // append a 1 to the 9th bit, once shifted it will be moved to the 8th bit
        }
        this.reg.setStatusFlag(StatusFlag.Carry, (value & 0x01) == 0x01);
        result = result >> 1;
        result &= 0xFF;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.reg.a = result;
        return 0;
    }

    rorOpcode = ()=> {
        let value = this.readData(this.stash.addr, "ror");
        var result = value;
        if (this.reg.isFlag(StatusFlag.Carry)) {
            result |= 0x0100; // append a 1 to the 9th bit, once shifted it will be moved to the 8th bit
        }
        this.reg.setStatusFlag(StatusFlag.Carry, (value & 0x01) == 0x01);
        result = result >> 1;
        result &= 0xFF;
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        this.writeData(this.stash.addr, result, "ror");
        return 0;
    }

    bvsOpcode = ()=> {
        if (this.reg.isFlag(StatusFlag.Overflow)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    seiOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Interrupt, true);
        return 0;
    }

    staOpcode = ()=> {
        this.writeData(this.stash.addr, this.reg.a, "sta - reg.a");
        return 0;
    }

    styOpcode = ()=> {
        this.writeData(this.stash.addr, this.reg.y, "sty - reg.y");
        return 0;
    }

    stxOpcode = ()=> {
        this.writeData(this.stash.addr, this.reg.x, "stx - reg.x");
        return 0;
    }

    deyOpcode = ()=> {
        this.reg.y -= 1;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.y == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.y & 0x80) == 0x80);
        return 0;
    }

    txaOpcode = ()=> {
        this.reg.a = this.reg.x;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.a == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.a & 0x80) == 0x80);
        return 0;
    }

    bccOpcode = ()=> {
        if (!this.reg.isFlag(StatusFlag.Carry)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    tyaOpcode = ()=> {
        this.reg.a = this.reg.y;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.a == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.a & 0x80) == 0x80);
        return 0;
    }

    ldyOpcode = ()=> {
        this.reg.y = this.readData(this.stash.addr, "ldy");
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.y == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.y & 0x80) == 0x80);
        return 1;
    }

    ldaOpcode = ()=> {
        this.reg.a = this.readData(this.stash.addr, "lda");
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.a == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.a & 0x80) == 0x80);
        return 1;
    }

    ldxOpcode = ()=> {
        this.reg.x = this.readData(this.stash.addr, "ldx");
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.x == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.x & 0x80) == 0x80);
        return 1;
    }

    tayOpcode = ()=> {
        this.reg.y = this.reg.a;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.y == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.y & 0x80) == 0x80);
        return 0;
    }

    taxOpcode = ()=> {
        this.reg.x = this.reg.a;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.x == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.x & 0x80) == 0x80);
        return 0;
    }

    bcsOpcode = ()=> {
        if (this.reg.isFlag(StatusFlag.Carry)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    clvOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Overflow, false);
        return 0;
    }

    cpxOpcode = ()=> {
        let value = this.readData(this.stash.addr, "cpx");
        let result = (this.reg.x - value) & 0xFF;
        this.reg.setStatusFlag(StatusFlag.Carry, this.reg.x >= value);
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        return 0;
    }

    cpyOpcode = ()=> {
        let value = this.readData(this.stash.addr, "cpy");
        let result = (this.reg.y - value) & 0xFF;
        this.reg.setStatusFlag(StatusFlag.Carry, this.reg.y >= value);
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        return 1;
    }

    cmpOpcode = ()=> {
        let value = this.readData(this.stash.addr, "cmp");
        let result = (this.reg.a - value) & 0xFF;
        this.reg.setStatusFlag(StatusFlag.Carry, this.reg.a >= value);
        this.reg.setStatusFlag(StatusFlag.Zero, (result & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (result & 0x80) == 0x80);
        return 1;
    }

    decOpcode = ()=> {
        var value = this.readData(this.stash.addr, "dec");
        value--;
        this.reg.setStatusFlag(StatusFlag.Zero, (value & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (value & 0x80) == 0x80);
        this.writeData(this.stash.addr, value, "dec");
        return 0;
    }

    inyOpcode = ()=> {
        this.reg.y += 1;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.y == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.y & 0x80) == 0x80);
        return 0;
    }

    dexOpcode = ()=> {
        this.reg.x -= 1;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.x == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.x & 0x80) == 0x80);
        return 0;
    }

    bneOpcode = ()=> {
        if (!this.reg.isFlag(StatusFlag.Zero)) {
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    cldOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Decimal, false);
        return 0;
    }

    sbcOpcode = ()=> {
        let value = this.readData(this.stash.addr, "sbc") ^ 0x00FF;
        let temp = this.reg.a + value + (this.reg.isFlag(StatusFlag.Carry) ? 1 : 0);
        this.reg.setStatusFlag(StatusFlag.Carry, temp > 0xFF);
        this.reg.setStatusFlag(StatusFlag.Zero, (temp & 0xFF) == 0);
        this.reg.setStatusFlag(StatusFlag.Negative, (temp & 0x80) == 0x80);
        this.reg.setStatusFlag(StatusFlag.Overflow, ((temp ^ this.reg.a) & (temp ^ value) & 0x0080) == 0x0080);
        this.reg.a = temp;
        return 1;
    }

    incOpcode = ()=> {
        var value = this.readData(this.stash.addr, "inc");
        value = (value + 1) & 0xFF;
        this.reg.setStatusFlag(StatusFlag.Zero, (value & 0xFF) == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (value & 0x80) == 0x80);
        this.writeData(this.stash.addr, value, "inc");
        return 0;
    }

    inxOpcode = ()=> {
        this.reg.x = this.reg.x + 1;
        this.reg.setStatusFlag(StatusFlag.Zero, this.reg.x == 0x00);
        this.reg.setStatusFlag(StatusFlag.Negative, (this.reg.x & 0x80) == 0x80);
        return 0;
    }

    beqOpcode = ()=> {
        if (this.reg.isFlag(StatusFlag.Zero)) {
            // console.log(`beq ${this.reg.pc.toString(16)} ${this.stash.addr.toString(16)}`);
            this.reg.pc += this.stash.addr;
        }
        return 0;
    }

    sedOpcode = ()=> {
        this.reg.setStatusFlag(StatusFlag.Decimal, true);
        return 0;
    }
}

