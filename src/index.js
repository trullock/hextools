import './style.scss'

import { evaluate } from 'mathjs';
import '@trullock/dollar'

const $frmDecoder = document.querySelector('form.js-decoder');
			
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

const $uint16l = document.querySelector('.js-uint16-l');
const $uint16b = document.querySelector('.js-uint16-b');
const $uint24l = document.querySelector('.js-uint24-l');
const $uint24b = document.querySelector('.js-uint24-b');
const $uint32l = document.querySelector('.js-uint32-l');
const $uint32b = document.querySelector('.js-uint32-b');

const $calculator = document.querySelector('[name=calculator]')
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

	$uint16l.textContent = view.getUint16(0, true);
	$uint16b.textContent = view.getUint16(0, false);

	const buff24l = new Uint8Array(4);
	buff24l[0] = parseInt($byte0.value, 16);
	buff24l[1] = parseInt($byte1.value, 16);
	buff24l[2] = parseInt($byte2.value, 16);
	buff24l[3] = 0
	const view24l = new DataView(buff24l.buffer);
	$uint24l.textContent = view24l.getUint32(0, true);

	const buff24b = new Uint8Array(4);
	buff24b[0] = 0
	buff24b[1] = parseInt($byte0.value, 16);
	buff24b[2] = parseInt($byte1.value, 16);
	buff24b[3] = parseInt($byte2.value, 16);
	const view24b = new DataView(buff24b.buffer);
	$uint24b.textContent = view24b.getUint32(0, false);

	$uint32l.textContent = view.getUint32(0, true);
	$uint32b.textContent = view.getUint32(0, false);
	
	try
	{
		const answer = evaluate($calculator.value);
		$calcOut.textContent = `${answer}\n0x${answer.toString(16)}`;
	}
	catch(e)
	{
		$calcOut.textContent = e.message
	}

})



const $fileView = document.$('.js-file-view');
const $fileViewBody = $fileView.$('tbody');
const $fileViewRow = $fileViewBody.firstElementChild;
$fileViewRow.remove();

const $file = document.$('[type=file]');
const $fileSize = document.$('.js-file-size');
const $fileCurrentPos = document.$('.js-file-current-pos');
var fileView = null;

$file.addEventListener('change', async e => {
	const reader = new FileReader();
	let buffer = await e.target.files[0].arrayBuffer();
	fileView = new DataView(buffer);
	
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

function highlight(index)
{
	if(index >= fileView.byteLength)
		return;

	var col = index % 16;
	var row = Math.floor(index / 16);

	$fileViewBody.children[row].children[col + 1].classList.add('table-success');
}

function clearHighlight()
{
	$fileViewBody.$('.table-success')?.classList.remove('table-success');
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
	
	try
	{
		value = evaluate(value);

		search(value, type); 
	}
	catch(e)
	{

	}
})

function search(value, type)
{
	clearHighlight();

	const locations = [];

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
		for(var i = 0; i < fileView.byteLength; i++)
		{
			if(i == fileView.byteLength - 1)
				break;

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
		for(var i = 0; i < fileView.byteLength; i++)
		{
			if(i == fileView.byteLength - 2)
				break;

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
		for(var i = 0; i < fileView.byteLength; i++)
		{
			if(i == fileView.byteLength - 3)
				break;

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