const path = require('path');
const DeftWebpackPlugin = require("deft-webpack-plugin");

const deftOptions = {
    android: {
        appId: "fun.kason.videoconverter",
    }
};

module.exports = {
    entry: {
        index: './ui/main.ts',
    },
    // target: 'node',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            ['@babel/preset-react', {
                                runtime: 'automatic',
                            }]
                        ]
                    }
                }
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [ 'deft-style-loader', 'css-loader', 'postcss-loader']
            },
            {
                test: /\.(jpe?g|png|svg|gif)/i,
                // use: 'inline-loader',
                type: 'asset/inline',
                // type: 'asset/source',
            }
        ],
    },
    devServer: {
        port: 7800,
        hot: true,
        client: {
            logging: "info",
            overlay: false,
        },
        allowedHosts : 'all',
    },
    resolve: {
        extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        // libraryTarget: 'module',
        // chunkFormat: 'module',
    },
    plugins: [
        new DeftWebpackPlugin(deftOptions),
    ],
};