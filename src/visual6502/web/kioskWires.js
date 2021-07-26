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

var animateChipLayout = true;
var userCode = [];
var userResetLow;
var userResetHigh;

// Some constants for the graphics presentation
// the canvas is embedded in an 600x600 clipping div
//   which gives rise to some of the 300 and 400 values in the code
//   there are also some 600 values
// the 6502D chip coords are in the box (216,179) to (8983,9807)
// we have 4 canvases all the same size, now 2000 pixels square
//   chip background - the layout
//   overlay - a red/white transparency to show logic high or low
//   hilite - to show the selected polygon
//   hitbuffer - abusing color values to return which polygon is under a point
// we no longer use a scaling transform - we now scale the chip data at 
//   the point of drawing line segments
// if the canvas is any smaller than chip coordinates there will be
//   rounding artifacts, and at high zoom there will be anti-aliasing on edges.
var grChipSize = 10000;
var grChipOffsetX = 400;
var grChipOffsetY = 0;
var grCanvasSize = 2000;
var grLineWidth = 1;

// Index of layerNames corresponds to index into drawLayers
var layernames = ['metal', 'switched diffusion', 'inputdiode', 'grounded diffusion', 'powered diffusion', 'polysilicon'];
var colors = ['rgba(128,128,192,0.4)', '#FFFF00', '#FF00FF', '#4DFF4D',
	'#FF4D4D', '#801AC0', 'rgba(128,0,255,0.75)'];
var drawlayers = [true, true, true, true, true, true];

/////////////////////////
//
// Drawing Setup
//
/////////////////////////

// try to present a meaningful page before starting expensive work
function setup() {
	frame = document.getElementById('frame');
	setupNodes();
	setupTransistors();
	setupLayerVisibility();
	setupBackground();
	setupOverlay();
	setupHilite();
	setupHitBuffer();
	refresh();
	initChip();
}


/////////////////////////
//
// Etc.
//
/////////////////////////

function setChipStyle(props) {
	for (var i in props) {
		chipbg.style[i] = props[i];
		overlay.style[i] = props[i];
		hilite.style[i] = props[i];
		hitbuffer.style[i] = props[i];
	}
}
