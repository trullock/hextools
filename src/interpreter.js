let position = 0;
let results = [];

export function interpret(buffer, schema)
{
	position = 0;
	results = [];

	for(var s = 0; s < schema.sections.length; s++)
	{
		let section = schema.sections[s];

		if(!interpretValues(buffer, section.values, schema.littleEndian))
			break;
	}

	return results;
}

function interpretValues(buffer, values, littleEndian)
{
	if(!values.length)
		return true;

	// all values must be matches or not
	let matching = !!values[0].match
	let matchAggregate = false;

	for(var v = 0; v < values.length; v++)
	{
		let result = interpretValue(buffer, values[v], littleEndian)

		if(!matching && !result)
			return false;

		if(matching)
			matchAggregate |= result;
	}

	return matching ? matchAggregate : true;
}

function interpretValue(buffer, value, littleEndian)
{
	let result = {
		name: value.name,
		start: position,
		end: value.bytes ? position + value.bytes - 1 : undefined,
		type: value.type,
		value: undefined
	}

	if(value.type == 'uint24')
	{
		if(position > buffer.length - 3)
			return false;

		result.value = littleEndian ? buffer.readUIntLE(position, 3) : buffer.readUIntBE(position, 3);
		result.end = result.start + 3 - 1;
		position = result.end + 1;
		results.push(result);
		return true;
	}

	if(value.type == 'uint16')
	{
		if(position > buffer.length - 2)
			return false;

		result.value =  littleEndian ? buffer.readUInt16LE(position) : buffer.readUInt16BE(position);
		result.end = result.start + 2 - 1;
		position = result.end + 1;
		results.push(result);
		return true;
	}


	if(value.type == 'uint32')
	{
		if(position > buffer.length - 4)
			return false;

		result.value =  littleEndian ? buffer.readUInt32LE(position) : buffer.readUInt32BE(position);
		result.end = result.start + 4 - 1;
		position = result.end + 1;
		results.push(result);
		return true;
	}

	if(value.type == 'uint64')
	{
		if(position > buffer.length - 8)
			return false;

		result.value =  littleEndian ? buffer.readBigUInt64LE(position) : buffer.readBigUInt64BE(position);
		result.end = result.start + 8 - 1;
		position = result.end + 1;
		results.push(result);
		return true;
	}

	if(!isNaN(value.bytes))
	{
		if(position > buffer.length - value.bytes)
			return false;

		if(value.type == 'nullstr')
		{
			result.type = 'utf8'
			result.value = readNullTerminatedString(buffer, position, position + value.bytes)
			result.end = result.start + value.bytes - 1;
			position = result.end + 1;
			results.push(result);
			return true;
		}

		if(value.type == 'float')
		{
			if(value.bytes == 8)
				result.value =  littleEndian ? buffer.readDoubleLE(position) : buffer.readDoubleBE(position);
			else if(value.bytes == 4)
				result.value =  littleEndian ? buffer.readFloatLE(position) : buffer.readFloatBE(position);
			else
				throw new Error(`Unsupported float number of bytes ${value.bytes} for ${value.name}`);
			
			result.end = result.start + value.bytes - 1;
			position = result.end + 1;

			results.push(result);
			return true;
		}

		if(result.type == '?')
		{
			result.value = "0x" + buffer.toString('hex', position, position + value.bytes).toUpperCase();
			result.type = 'raw';
			result.end = position + value.bytes - 1
			position = result.end + 1;
			results.push(result);
			return true;
		}
			
		
	}

	if(value.type == 'nullstr')
	{
		if(position > buffer.length - 1)
			return false;

		result.type = 'utf8'
		result.value = readNullTerminatedString(buffer, position, position + value.bytes)
		// BUG: what happens at the end of the file? we'll add +1 and be out of range
		result.end = result.start + ((new TextEncoder().encode(result.value)).length); // don't -1 because we need to count the null terminator we found
		position = result.end + 1;
		results.push(result);
		return true;
	}

	if(value.type == 'repeater')
		return interpretRepeater(buffer, value, littleEndian);

	if(value.type == 'match')
		return interpretMatch(buffer, value, littleEndian);

	

	throw new Error(`Node type not supported ${value.type}`);
}

function interpretRepeater(buffer, value, littleEndian)
{
	while(!isSectionEndMarker(buffer, position, value.until))
	{
		if(!interpretValues(buffer, value.values, littleEndian))
			return false;
	}
	
	if(value.until != "eof")
	{
		results.push({
			name: 'Separator',
			type: 'ctrl',
			value: "0x" + buffer.toString('hex', position, position + value.until.length).toUpperCase(),
			start: position,
			end: position + value.until.length - 1
		})

		position += value.until.length;
	}

	return true;
}

function interpretMatch(buffer, value, littleEndian)
{
	if(bytesMatch(buffer, position, value.match))
		return interpretValues(buffer, value.values, littleEndian)	
	
	return false;
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

function isSectionEndMarker(buffer, pos, until)
{
	if(until == "eof")
		return false;

	// end of file
	if(pos >= buffer.length - until.length)
		return false;

	// compare until with current buffer pos
	for(var i = 0; i < until.length; i++)
	{
		if(buffer[pos + i] != until[i])
			return false;
		else
			continue;
	}

	return true;
}

function bytesMatch(buffer, pos, compare)
{
	// end of file
	if(pos >= buffer.length - compare.length)
		return false;

	// compare until with current buffer pos
	for(var i = 0; i < compare.length; i++)
	{
		if(buffer[pos + i] != compare[i])
			return false;
		else
			continue;
	}

	return true;
}