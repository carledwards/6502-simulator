
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var path = require('path');

import { CpuRunner } from "./cpu-runner";
import { Motherboard } from './motherboard';
import { Ram } from "../components/ram";
import { Rom } from "../components/rom";


/**
 * CPU glue setup
 */
let runner = new CpuRunner();

let motherboard = new Motherboard(
  runner
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
// punch in the reset jump vectors
rom.program[0x1FFC] = 0x00;
rom.program[0x1FFD] = 0xE0;

motherboard.getComponentManager().add(0xE000, rom);

motherboard.reset();

/**
 * Web server setup
 */

app.use(express.static(__dirname + '/../../node_modules'));
app.use(express.static(__dirname + '/web'));

app.get('/', function(req: any, res: any) {
    res.sendFile(path.resolve(__dirname + '/web/index.html'));
});

app.get('/cpu/data/write/:addr/:data', function(req: any, res: any) {
    console.log(`write data: ${JSON.stringify(req.params)}`);
    runner.busOperations!.writeData(req.params.addr, req.params.data);
    res.send({});
});

app.get('/cpu/data/read/:addr', function(req: any, res: any) {
    console.log(`read data: ${JSON.stringify(req.params)}`);
    var data = 0;
    try {
        data = runner.busOperations!.readData(req.params.addr);
    } catch (error) {
        data = 0;
    }
    res.send({"addr": req.params.addr, "data": data});
});

server.listen(3000, () => {
    console.log('server is listening on port 3000');
});