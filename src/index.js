import './scss/theme.scss'
import './android-chrome-192x192.png'
import './android-chrome-512x512.png'
import './apple-touch-icon.png'
import './favicon.ico'
import './favicon-16x16.png'
import './favicon-32x32.png'
import './site.webmanifest'

import buff from 'buffer'
const Buffer = buff.Buffer;

import { evaluate } from 'mathjs';
import '@trullock/dollar'
import { interpret, parseSchema } from './interpreter.js'

const $frmDecoder = document.querySelector('form.js-decoder');
			
const $endianness = document.querySelector('[name=endianness]');

const $byte0 = document.querySelector('[name=byte0]');
const $byte1 = document.querySelector('[name=byte1]');
const $byte2 = document.querySelector('[name=byte2]');
const $byte3 = document.querySelector('[name=byte3]');

const $binary0 = document.querySelector('.js-binary-0');
const $binary1 = document.querySelector('.js-binary-1');
const $binary2 = document.querySelector('.js-binary-2');
const $binary3 = document.querySelector('.js-binary-3');

const $uint80 = document.querySelector('.js-uint8-0');
const $uint81 = document.querySelector('.js-uint8-1');
const $uint82 = document.querySelector('.js-uint8-2');
const $uint83 = document.querySelector('.js-uint8-3');

const $int80 = document.querySelector('.js-int8-0');
const $int81 = document.querySelector('.js-int8-1');
const $int82 = document.querySelector('.js-int8-2');
const $int83 = document.querySelector('.js-int8-3');

const $uint160 = document.querySelector('.js-uint16-0');
const $uint161 = document.querySelector('.js-uint16-1');
const $int160 = document.querySelector('.js-int16-0');
const $int161 = document.querySelector('.js-int16-1');
const $uint24 = document.querySelector('.js-uint24');
const $int24 = document.querySelector('.js-int24');
const $uint32 = document.querySelector('.js-uint32');
const $int32 = document.querySelector('.js-int32');

const $calculator = document.querySelector('[name=calculator]')
const $calcError = document.querySelector('.js-calc-error')
const $calcOut = document.querySelector('.js-calculator-output');

function dec2bin(num)
{
	let bin = '000' + num.toString(2);
	return bin.substr(-4, 4);
}

function uint82hex(num, padding = 2)
{
	let bin = '000000000' + num.toString(16).toUpperCase();
	return bin.substr(-padding, padding);
}

$frmDecoder.addEventListener('input', e => {

	const littleEndian = $endianness.value == "little";

	const buff = new Uint8Array(4);
	buff[0] = parseInt($byte0.value, 16);
	buff[1] = parseInt($byte1.value, 16)
	buff[2] = parseInt($byte2.value, 16)
	buff[3] = parseInt($byte3.value, 16)

	const view = new DataView(buff.buffer);

	$binary0.textContent = dec2bin(buff[0]);
	$binary1.textContent = dec2bin(buff[1]);
	$binary2.textContent = dec2bin(buff[2]);
	$binary3.textContent = dec2bin(buff[3]);

	$uint80.textContent = buff[0];
	$uint81.textContent = buff[1];
	$uint82.textContent = buff[2];
	$uint83.textContent = buff[3];

	$int80.textContent = view.getInt8(0);
	$int81.textContent = view.getInt8(1);
	$int82.textContent = view.getInt8(2);
	$int83.textContent = view.getInt8(3);

	$uint160.textContent = view.getUint16(0, littleEndian);
	$uint161.textContent = view.getUint16(2, littleEndian);

	$int160.textContent = view.getInt16(0, littleEndian);
	$int161.textContent = view.getInt16(2, littleEndian);

	const buff24 = new Uint8Array(4);
	if(littleEndian)
	{
		buff24[0] = parseInt($byte0.value, 16);
		buff24[1] = parseInt($byte1.value, 16);
		buff24[2] = parseInt($byte2.value, 16);
		buff24[3] = 0
	}
	else
	{
		buff24[0] = 0
		buff24[1] = parseInt($byte0.value, 16);
		buff24[2] = parseInt($byte1.value, 16);
		buff24[3] = parseInt($byte2.value, 16);
	}
	const view24l = new DataView(buff24.buffer);
	const uint24 = view24l.getUint32(0, littleEndian);
	$uint24.textContent = uint24;
	$int24.textContent = fromTwosComplement(uint24, 3);

	$uint32.textContent = view.getUint32(0, littleEndian);
	$int32.textContent = view.getInt32(0, littleEndian);
	
	try
	{
		const answer = evaluate($calculator.value);
		$calcOut.textContent = `${answer}\n0x${answer.toString(16)}`;
		$calcError.textContent = '';
	}
	catch(e)
	{
		$calcError.textContent = e.message
	}

})



const $fileView = document.$('.js-file-view');
const $fileViewBody = $fileView.$('tbody');
const $fileViewRow = $fileViewBody.firstElementChild;
$fileViewRow.remove();

const $file = document.$('#fupFile');
const $fileSize = document.$('.js-file-size');
const $fileCurrentPos = document.$('.js-file-current-pos');
var fileView = null;
let fileBuffer = null;

$file.addEventListener('change', async e => {
	const reader = new FileReader();
	fileBuffer = await e.target.files[0].arrayBuffer();
	fileView = new DataView(fileBuffer);
	
	$fileSize.textContent = fileView.byteLength
	let mousedown = -1;
	var $row = null;
	for(var i = 0; i < fileView.byteLength; i++)
	{
		var col = i % 16;
		if(col == 0)
		{
			$row = $fileViewRow.cloneNode(true);
			$row.children[0].textContent = "0x" + uint82hex(i, 4);
			$fileViewBody.appendChild($row);
		}

		const $td = $row.children[col + 1];
		$td.textContent = uint82hex(fileView.getUint8(i))
		let index = i;
		$td.addEventListener('mousedown', e => {
			mousedown = index;
		})
		$td.addEventListener('mousemove', e => {
			if(mousedown == -1)
				return;

			clearHighlight();
			var start = Math.min(index, mousedown);
			var end = Math.max(index, mousedown);
			for(var i = start; i <= end; i++)
				highlight(i);
			
		})
		$td.addEventListener('mouseup', e => {
			if(index == mousedown)
			{
				clearHighlight();
				highlight(index);
				highlight(index + 1);
				highlight(index + 2);
				highlight(index + 3);
				select(index);
			}
			else
			{
				var start = Math.min(index, mousedown);
				var end = Math.max(index, mousedown);
				select(start, end)
			}

			mousedown = -1;

		})
	}
})



const $interpreted = document.$('.js-interpreted');
const $interpretedBody = $interpreted.$('tbody');
const $interpretedRow = $interpretedBody.firstElementChild;
$interpretedRow.remove();

const $schema = document.$('#fupSchema');
$schema.addEventListener('change', async e => {
	const reader = new FileReader();
	reader.addEventListener('load', () => {
		let yml = reader.result;

		let schema = parseSchema(yml);

		let results = interpret(Buffer.from(fileBuffer), schema)

		let colors = ['table-primary', 'table-info', 'table-warning', 'table-secondary', 'table-danger'];
		let colorIndex = 0;

		for(var r = 0; r < results.length; r++)
		{
			let result = results[r];

			let $row = $interpretedRow.cloneNode(true);

			$row.children[0].classList.add(colors[colorIndex]);
			for(var h = result.start; h <= result.end; h++)
				highlight(h, colors[colorIndex]);
			colorIndex = colorIndex == colors.length - 1 ? 0 : colorIndex + 1;

			$row.children[1].textContent = result.name;

			$row.children[2].textContent = result.value;
			$row.children[3].textContent = result.start;
			$row.children[4].textContent = result.end;
			$row.children[5].textContent = result.type;

			$row.addEventListener('click', e=> {
				clearHighlight();
				for(var h = result.start; h <= result.end; h++)
					highlight(h);
			})

			$interpretedBody.appendChild($row);
		}

	})
	reader.readAsText(e.target.files[0]);
})

function select(start, end)
{
	if(end === undefined)
		end = start + 3;

	$byte0.value = uint82hex(fileView.getUint8(start))
	$byte1.value = start + 1 < fileView.byteLength ? uint82hex(fileView.getUint8(start + 1)) : '00'
	$byte2.value = start + 2 < fileView.byteLength ? uint82hex(fileView.getUint8(start + 2)) : '00'
	$byte3.value = start + 3 < fileView.byteLength ? uint82hex(fileView.getUint8(start + 3)) : '00'
	$frmDecoder.dispatchEvent(new CustomEvent('input'))

	$fileCurrentPos.textContent = `${start} - ${end}. 0x${start.toString(16).toUpperCase()} - 0x${end.toString(16).toUpperCase()}. ${end-start+1} bytes selected.`;
}

function highlight(index, color)
{
	if(index >= fileView.byteLength)
		return;

	var col = index % 16;
	var row = Math.floor(index / 16);

	$fileViewBody.children[row].children[col + 1].classList.add(color || 'table-highlight');
}

function clearHighlight()
{
	$fileViewBody.$('.table-highlight')?.classList.remove('table-highlight');
}

var isCtrl = false;
document.addEventListener('keyup', e=> {
    if(e.key == 'Control')
		isCtrl = false;
});
document.addEventListener('keydown', e=> {
    if(e.key == 'Control')
		isCtrl = true;

    if(e.key == 'g' && isCtrl == true) {
        e.preventDefault();
		askGoto();
    }
});

function askGoto()
{
	var input = window.prompt('Goto position:');
	var position = parseInt(input, 10);
	select(position);
	highlight(position);
	highlight(position + 1);
	highlight(position + 2);
	highlight(position + 3);
}

document.$('.js-search').addEventListener('submit', e => {
	e.preventDefault();

	var value = document.$('[type=search]').value;
	var type = document.$('[name=searchType]').value;
	
	search(value, type);
})

function search(value, type)
{
	clearHighlight();

	const locations = [];

	if(type == "literal")
	{
		if(value.length % 2 == 1)
		{
			// TODO: proper error
			console.error("Must be nultiple of 2 chars long")
		}
		else
		{
			let bytes = [];
			for(var i = 0; i < value.length; i +=2)
				bytes.push(parseInt(value.substr(i, 2), 16));

			for(var i = 0; i < fileView.byteLength - bytes.length + 1; i++)
			{
				let match = bytes.reduce((p, c, j) => p && fileView.getUint8(i + j) == c, true);

				if(match)
					locations.push(i);
			}

			for(var i = 0; i < locations.length; i++)
			{
				for(var j = 0; j < bytes.length; j++)
					highlight(locations[i] + j)
			}
		}
		return;
	}

	try
	{
		value = evaluate(value);
	}
	catch(e)
	{
		// toDO:
		return;
	}

	if(type == "uint8")
	{
		for(var i = 0; i < fileView.byteLength; i++)
		{
			if(fileView.getUint8(i) == value)
				locations.push(i);
		}

		for(var i = 0; i < locations.length; i++)
		{
			highlight(locations[i])
		}
	}
	else if(type == "uint16")
	{
		for(var i = 0; i < fileView.byteLength - 1; i++)
		{
			if(fileView.getUint16(i, false) == value)
				locations.push(i);

			if(fileView.getUint16(i, true) == value)
				locations.push(i);
		}

		for(var i = 0; i < locations.length; i++)
		{
			highlight(locations[i])
			highlight(locations[i] + 1)
		}
	}
	else if(type == "uint24")
	{
		for(var i = 0; i < fileView.byteLength - 2; i++)
		{
			let buff = new Uint8Array(4);
			buff[0] = fileView.getUint8(i);
			buff[1] = fileView.getUint8(i + 1);
			buff[2] = fileView.getUint8(i + 2);
			buff[3] = 0;
			let dvl = new DataView(buff.buffer);
			
			if(dvl.getUint32(0, true) == value)
				locations.push(i);

			buff[0] = 0
			buff[1] = fileView.getUint8(i);
			buff[2] = fileView.getUint8(i + 1);
			buff[3] = fileView.getUint8(i + 2);

			if(dvl.getUint32(0, false) == value)
				locations.push(i);
		}

		for(var i = 0; i < locations.length; i++)
		{
			highlight(locations[i])
			highlight(locations[i] + 1)
			highlight(locations[i] + 2)
		}
	}
	else if(type == "uint32")
	{
		for(var i = 0; i < fileView.byteLength - 3; i++)
		{
			if(fileView.getUint32(i, false) == value)
				locations.push(i);

			if(fileView.getUint32(i, true) == value)
				locations.push(i);
		}

		for(var i = 0; i < locations.length; i++)
		{
			highlight(locations[i])
			highlight(locations[i] + 1)
			highlight(locations[i] + 2)
			highlight(locations[i] + 3)
		}
	}
}

function fromTwosComplement(twosComplement, numberBytes) 
{   
    var numberBits = (numberBytes || 1) * 8;
    
    if (twosComplement < 0 || twosComplement > (1 << numberBits) - 1)
        throw "Two's complement out of range given " + numberBytes + " byte(s) to represent.";
    
    // If less than the maximum positive: 2^(n-1)-1, the number stays positive
    if (twosComplement <= Math.pow(2, numberBits - 1) - 1)
        return twosComplement;
    
    // Else convert to it's negative representation
    return -(((~twosComplement) & ((1 << numberBits) - 1)) + 1);
}