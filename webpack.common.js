const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: {
		index: './src/index.js'
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: 'src/index.html'
		}),
	],
	module: {
		rules: [
			{
				test: /\.html$/i,
				loader: "html-loader",
			},
			{
			  test: /\.s[ac]ss$/i,
			  use: [
				"style-loader",
				"css-loader",
				"sass-loader",
			  ],
			},
			{
				test: /\.(png|ico|webmanifest)$/i,
				type: 'asset/resource'
			},
		],
	},
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'dist'),
	}
};