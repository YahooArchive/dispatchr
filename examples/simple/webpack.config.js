var webpack = require('webpack');

module.exports = {
    entry: "./bootstrap.js",
    output: {
        path: __dirname+'/build/js',
        filename: "bootstrap.js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" },
            { test: /\.jsx$/, loader: 'jsx-loader' }
        ]
    },
    plugins: [
        new webpack.optimize.DedupePlugin()
    ]
};
