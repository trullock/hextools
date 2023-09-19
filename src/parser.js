
import yaml from 'js-yaml'

export function parseSchema(yml)
{
	let json = yaml.load(yml);

	let schema = {
		sections: []
	}

	for(var key of Object.keys(json))
		schema.sections.push(parseSection(key, json[key]));

	return schema;
}

function parseSection(key, node)
{
	let retval = {
		name: key,
		values: []
	}
	
	for(var key of Object.keys(node))
	{
		retval.values.push(parseValue(key, node[key]));
	}
	
	
	return retval;
}

function parseRepeat(key, node)
{
	let retval = {
		type: 'repeater',
		name: key,
		until: node['repeat until'],
		values: []
	}

	var subKeys = Object.keys(node)
	// remove repeat-until
	subKeys.splice(-1, 1);

	for(var i = 0; i < subKeys.length; i++)
		retval.values.push(parseValue(subKeys[i], node[subKeys[i]]));	

	return retval;
}

function parseMatch(key, node)
{
	let retval = {
		type: 'match',
		name: key,
		match: node['match'],
		values: []
	}

	var subKeys = Object.keys(node)
	// remove match
	subKeys.splice(0, 1);

	for(var i = 0; i < subKeys.length; i++)
		retval.values.push(parseValue(subKeys[i], node[subKeys[i]]));	

	return retval;
}

function parseValue(key, node)
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

	if(node['repeat until'])
		return parseRepeat(key, node)

	if(node['match'])
		return parseMatch(key, node)

	return {
		name: key,
		bytes: node.bytes,
		type: node.type || '?'
	};
}