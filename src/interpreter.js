
import yaml from 'js-yaml'
import {Blob} from 'node:buffer';

export function parseSchema(yml)
{
	let json = yaml.load(yml);

	let schema = {
		sections: []
	}

	for(var key of Object.keys(json))
		schema.sections.push(expandSection(key, json[key]));

	return schema;
}

export function interpret(buffer, schema)
{
	let p = 0;
	let result = [];

	for(var s = 0; s < schema.sections.length; s++)
	{
		let section = schema.sections[s];

		for(var v = 0; v < section.values.length; v++)
		{
			let value = section.values[v];

			let datum = interpretValue(buffer, p, value, schema.littleEndian)
			
			// TODO: remove once complete
			if(!datum)
				continue;

			result.push(datum);

			p = datum.end + 1;
		}

		//if(isSectionEndMarker(buffer, p, section))
		//	continue;
	}

	return result;
}

function interpretValue(buffer, position, value, littleEndian)
{
	let retval = {
		name: value.name,
		start: position,
		end: value.bytes ? position + value.bytes - 1 : undefined,
		type: value.type,
		value: undefined
	}

	if(value.bytes === 1)
	{
		retval.value = buffer[position]
		return retval;
	} 

	if(!isNaN(value.bytes))
	{
		if(value.type == 'nullstr')
		{
			retval.type = 'utf8'
			retval.value = readNullTerminatedString(buffer, position, position + value.bytes)
			retval.end = retval.start + value.bytes - 1;
			return retval;
		}
		
		// let dest = Buffer.allocUnsafe(value.bytes);
		// buffer.copy(dest, 0, position, position + value.bytes)
		
	}

	if(value.type == 'uint64')
	{
		retval.value =  littleEndian ? buffer.readBigUInt64LE(position) : buffer.readBigUInt64BE(position);
		retval.end = retval.start + 8 - 1;
		return retval;
	}

	if(value.type == 'nullstr')
	{
		retval.type = 'utf8'
		retval.value = readNullTerminatedString(buffer, position, position + value.bytes)
		// BUG: what happens at the end of the file? we'll add +1 and be out of range
		retval.end = retval.start + (new Blob([retval.value]).size); // don't -1 because we need to count the null terminator we found
		return retval;
	}

	return null;
}

// end is exclusive
function readNullTerminatedString(buffer, start, end)
{
	for(var p = start; p < Math.min(buffer.length, end); p++)
	{
		if(buffer[p] == 0)
			break;
	}

	return buffer.toString('utf8', start, p)
}

function isSectionEndMarker(buffer, position, section)
{
	//for(var i = position; i < position + section.)
}


function expandSection(key, node)
{
	let retval = {
		name: key,
		values: []
	}
	
	for(var key of Object.keys(node))
		retval.values.push(expandDatum(key, node[key]));

	return retval;
}

function expandDatum(key, node)
{
	if(node === null)
	{
		return {
			name: key,
			bytes: 1,
			type: "?"
		}
	}

	if(!isNaN(node))
	{
		return {
			name: key,
			bytes: node,
			type: "?"
		}
	}

	if(node == "uint64")
	{
		return {
			name: key,
			bytes: 8,
			type: "uint64"
		}
	}

	
	if(node == "nullstr")
	{
		return {
			name: key,
			bytes: undefined,
			type: "nullstr"
		}
	}

	return {
		name: key,
		bytes: node.bytes,
		type: node.type
	};
}