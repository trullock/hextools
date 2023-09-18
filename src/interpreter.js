
import yaml from 'js-yaml'

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

			if(Array.isArray(datum) && datum.length)
			{
				result = result.concat(datum);
				p = datum[datum.length - 1].end + 1;
			}
			else 
			{
				result.push(datum);
				p = datum.end + 1;
			}
		}
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
		if(retval.type == '?')
			retval.type = 'byte';

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

		if(value.type == 'float')
		{
			if(value.bytes == 8)
			retval.value =  littleEndian ? buffer.readDoubleLE(position) : buffer.readDoubleBE(position);
			else if(value.bytes == 4)
				retval.value =  littleEndian ? buffer.readFloatLE(position) : buffer.readFloatBE(position);
			else
				throw new Error(`Unsupported float number of bytes ${value.bytes} for ${value.name}`);
			
			retval.end = retval.start + value.bytes - 1;

			return retval;
		}
	}

	if(value.type == 'uint24')
	{
		retval.value = littleEndian ? buffer.readUIntLE(position, 3) : buffer.readUIntBE(position, 3);
		retval.end = retval.start + 3 - 1;
		return retval;
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
		retval.end = retval.start + ((new TextEncoder().encode(retval.value)).length); // don't -1 because we need to count the null terminator we found
		return retval;
	}

	if(value.type == 'repeater')
	{
		retval = [];

		while(!isSectionEndMarker(buffer, position, value.until))
		{
			for(var i = 0; i < value.values.length; i++)
			{
				let result = interpretValue(buffer, position, value.values[i]);
				retval.push(result);
				position = result.end + 1
			}
		}

		retval.push({
			name: 'Separator',
			type: 'ctrl',
			value: "0x" + buffer.toString('hex', position, position + value.until.length).toUpperCase(),
			start: position,
			end: position + value.until.length - 1
		})

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

function isSectionEndMarker(buffer, position, until)
{
	// end of file
	if(position >= buffer.length - until.length)
		return false;

	// compare until with current buffer pos
	for(var i = 0; i < until.length; i++)
	{
		if(buffer[position + i] != until[i])
			return false;
		else
			continue;
	}

	return true;
}


function expandSection(key, node)
{
	let retval = {
		name: key,
		values: []
	}
	
	for(var key of Object.keys(node))
	{
		if(key == "repeat")
		{
			var subKeys = Object.keys(node[key])
			if(subKeys[subKeys.length - 1] == "until")
			{
				subKeys.splice(-1, 1);

				const repeater = {
					type: 'repeater',
					until: node[key]["until"],
					values: []
				}

				for(var i = 0; i < subKeys.length; i++)
					repeater.values.push(expandValue(subKeys[i], node[key][subKeys[i]]));	

				retval.values.push(repeater);
			}
		}
		else
		{
			retval.values.push(expandValue(key, node[key]));
		}
	}
	
	
	return retval;
}

function expandValue(key, node)
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

	if(node == "uint8")
	{
		return {
			name: key,
			bytes: 1,
			type: "uint8"
		}
	}

	if(node == "uint16")
	{
		return {
			name: key,
			bytes: 2,
			type: "uint16"
		}
	}

	if(node == "uint24")
	{
		return {
			name: key,
			bytes: 3,
			type: "uint24"
		}
	}

	if(node == "uint32")
	{
		return {
			name: key,
			bytes: 4,
			type: "uint32"
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