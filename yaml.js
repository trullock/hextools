
import fs from 'fs'
import { interpret, parseSchema } from './src/interpreter.js';

let desc = fs.readFileSync('desc.yaml', 'utf8');
let schema = parseSchema(desc);

console.log(schema);


let file = fs.readFileSync('log');
schema.littleEndian = true
let result = interpret(file, schema);


for(var i = 0; i < result.length; i++)
	console.log(result[i]);