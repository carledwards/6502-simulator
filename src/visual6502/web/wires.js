/*
 Copyright (c) 2010 Brian Silverman, Barry Silverman

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

var frame, chipbg, overlay, hilite, hitbuffer, ctx, ctxHilite;
var nodes = new Array();
var transistors = {};
var nodenamelist = [];

var ngnd = nodenames['vss'];
var npwr = nodenames['vcc'];

var chipLayoutIsVisible = true;  // only modified in expert mode
var hilited = [];

function setupNodes() {
	for (var i in segdefs) {
		var seg = segdefs[i];
		var w = seg[0];
		if (nodes[w] == undefined)
			nodes[w] = {
				segs: new Array(), num: w, pullup: seg[1] == '+',
				state: false, gates: new Array(), c1c2s: new Array()
			};
		if (w == ngnd) continue;
		if (w == npwr) continue;
		nodes[w].segs.push(seg.slice(3));
	}
}

function setupTransistors() {
	for (i in transdefs) {
		var tdef = transdefs[i];
		var name = tdef[0];
		var gate = tdef[1];
		var c1 = tdef[2];
		var c2 = tdef[3];
		var bb = tdef[4];
		if (c1 == ngnd) { c1 = c2; c2 = ngnd; }
		if (c1 == npwr) { c1 = c2; c2 = npwr; }
		var trans = { name: name, on: false, gate: gate, c1: c1, c2: c2, bb: bb };
		nodes[gate].gates.push(trans);
		nodes[c1].c1c2s.push(trans);
		nodes[c2].c1c2s.push(trans);
		transistors[name] = trans;
	}
}

function setupBackground() {
	chipbg = document.getElementById('chipbg');
	chipbg.width = grCanvasSize;
	chipbg.height = grCanvasSize;
	var ctx = chipbg.getContext('2d');
	ctx.fillStyle = '#000000';
	ctx.strokeStyle = 'rgba(255,255,255,0.5)';
	ctx.lineWidth = grLineWidth;
	ctx.fillRect(0, 0, grCanvasSize, grCanvasSize);
	for (var i in segdefs) {
		var seg = segdefs[i];
		var c = seg[2];
		if (drawlayers[c]) {
			ctx.fillStyle = colors[c];
			drawSeg(ctx, segdefs[i].slice(3));
			ctx.fill();
			if ((c == 0) || (c == 6)) ctx.stroke();
		}
	}
}

function setupOverlay() {
	overlay = document.getElementById('overlay');
	overlay.width = grCanvasSize;
	overlay.height = grCanvasSize;
	ctx = overlay.getContext('2d');
}

function setupHilite() {
	hilite = document.getElementById('hilite');
	hilite.width = grCanvasSize;
	hilite.height = grCanvasSize;
	ctxHilite = hilite.getContext('2d');
}

function setupHitBuffer() {
	hitbuffer = document.getElementById('hitbuffer');
	hitbuffer.width = grCanvasSize;
	hitbuffer.height = grCanvasSize;
	hitbuffer.style.visibility = 'hidden';
	var ctx = hitbuffer.getContext('2d');
	for (i in nodes) hitBufferNode(ctx, i, nodes[i].segs);
}

function hitBufferNode(ctx, i, w) {
	var low = hexdigit(i & 0xf);
	var mid = hexdigit((i >> 4) & 0xf);
	var high = hexdigit((i >> 8) & 0xf);
	ctx.fillStyle = '#' + high + 'F' + mid + 'F' + low + 'F';
	for (i in w) {
		drawSeg(ctx, w[i]);
		ctx.fill();
	}
}

function hexdigit(n) { return '0123456789ABCDEF'.charAt(n); }


/////////////////////////
//
// Drawing Runtime
//
/////////////////////////

function refresh() {
	if (!chipLayoutIsVisible) return;
	ctx.clearRect(0, 0, grCanvasSize, grCanvasSize);
	ctx.fillStyle = 'rgba(255,0,0,.8)';
	for (n in nodes) {
		if ((nodes[n].state)){
			// overlayNode(nodes[i].segs);
			for (i in nodes[n].segs) {
				const seg = nodes[n].segs[i];
		
				var dx = grChipOffsetX;
				var dy = grChipOffsetY;
				const scaleFactor = grCanvasSize / grChipSize;
				ctx.beginPath();
				ctx.moveTo(
					Math.round((seg[0] + dx)) * scaleFactor, 
					Math.round((grChipSize - seg[1] + dy)) * scaleFactor);
				for (var i = 2; i < seg.length; i += 2) {
					ctx.lineTo(
						Math.round((seg[i] + dx) * scaleFactor), 
						Math.round((grChipSize - seg[i + 1] + dy)) * scaleFactor);
				} 
				ctx.lineTo(
					Math.round((seg[0] + dx) * scaleFactor), 
					Math.round((grChipSize - seg[1] + dy) * scaleFactor)
					);
		
				ctx.fill();
			}
		
		}
	}
	hiliteNode(hilited);
}

function overlayNode(w) {
	ctx.fillStyle = 'rgba(255,0,0,.8)';
	for (i in w) {
		const seg = w[i];

		const dx = grChipOffsetX;
		const dy = grChipOffsetY;
		const scaleFactor = grCanvasSize / grChipSize;
		ctx.beginPath();
		ctx.moveTo(
			Math.round((seg[0] + dx)) * scaleFactor, 
			Math.round((grChipSize - seg[1] + dy)) * scaleFactor);
		for (var i = 2; i < seg.length; i += 2) {
			ctx.lineTo(
				Math.round((seg[i] + dx) * scaleFactor), 
				Math.round((grChipSize - seg[i + 1] + dy)) * scaleFactor);
		} 
		ctx.lineTo(
			Math.round((seg[0] + dx) * scaleFactor), 
			Math.round((grChipSize - seg[1] + dy) * scaleFactor)
			);

		ctx.fill();
	}
}

// originally to highlight using a list of node numbers
//   but can now include transistor names
function hiliteNode(n) {
	ctxHilite.clearRect(0, 0, grCanvasSize, grCanvasSize);
	if (n == -1) return;
	hilited = n;

	for (var i in n) {
		if (isNodeHigh(n[i])) {
			ctxHilite.fillStyle = 'rgba(255,0,0,0.7)';
		} else {
			ctxHilite.fillStyle = 'rgba(255,255,255,0.7)';
		}
		var segs = nodes[n[i]].segs;
		for (var s in segs) { drawSeg(ctxHilite, segs[s]); ctxHilite.fill(); }
	}
}

function ctxDrawBox(ctx, xMin, yMin, xMax, yMax) {
	var cap = ctx.lineCap;
	ctx.lineCap = "square";
	ctx.beginPath();
	ctx.moveTo(xMin, yMin);
	ctx.lineTo(xMin, yMax);
	ctx.lineTo(xMax, yMax);
	ctx.lineTo(xMax, yMin);
	ctx.lineTo(xMin, yMin);
	ctx.stroke();
	ctx.lineCap = cap;
}

function drawSeg(ctx, seg) {
	var dx = grChipOffsetX;
	var dy = grChipOffsetY;
	const scaleFactor = grCanvasSize / grChipSize;
	ctx.beginPath();
	ctx.moveTo(
		Math.round((seg[0] + dx)) * scaleFactor, 
		Math.round((grChipSize - seg[1] + dy)) * scaleFactor);
	for (var i = 2; i < seg.length; i += 2) {
		ctx.lineTo(
			Math.round((seg[i] + dx) * scaleFactor), 
			Math.round((grChipSize - seg[i + 1] + dy)) * scaleFactor);
	} 
	ctx.lineTo(
		Math.round((seg[0] + dx) * scaleFactor), 
		Math.round((grChipSize - seg[1] + dy) * scaleFactor)
		);
}

function clearHighlight() {
	// remove red/white overlay according to logic value
	// for easier layout navigation
	ctx.clearRect(0, 0, grCanvasSize, grCanvasSize);
}

function updateShow(layer, on) {
	drawlayers[layer] = on;
	setupBackground();
}

function localx(el, gx) {
	return gx - el.getBoundingClientRect().left;
}

function localy(el, gy) {
	return gy - el.getBoundingClientRect().top;
}

function setupNodeNameList() {
	for (var i in nodenames)
		nodenamelist.push(i);
}

function nodeName(n) {
	for (var i in nodenames) {
		if (nodenames[i] == n) return i;
	}
	return '';
}

function now() { return new Date().getTime(); }
