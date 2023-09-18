var yaml = require('js-yaml');
const fs = require('fs');

let desc = fs.readFileSync('desc.yaml');

let json = yaml.load(desc);

for(var key of Object.keys(json))
	json[key] = expandSection(key, json[key]);

console.log(json);

function expandSection(key, node)
{
	let retval = {
		name: key,
		values: {}
	}
	
	for(var key of Object.keys(node))
		retval.values[key] = expandDatum(node[key]);

	return retval;
}

function expandDatum(node)
{
	if(node === null)
	{
		return {
			bytes: 1,
			type: "?"
		}
	}

	if(!isNaN(node))
	{
		return {
			bytes: node,
			type: "?"
		}
	}

	if(node == "uint64")
	{
		return {
			bytes: 8,
			type: "uint64"
		}
	}

	
	if(node == "nullstr")
	{
		return {
			bytes: undefined,
			type: "nullstr"
		}
	}

	return node;
}