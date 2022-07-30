import { createLoader } from 'simple-functional-loader';
import * as Path from 'path';
import * as Webpack from 'webpack';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

import { createRequire } from 'module';


const externals: Record<string, string> = {
  chokidar: 'self.chokidar',
  purgecss: 'self.purgecss',
  tmp: 'self.tmp',
};

export const createRuntimeWebpackConfig = async (context: string): Promise<Webpack.Configuration> => {
  const require = createRequire(context + '/');

  const config: Webpack.Configuration = {
    context,
    entry: {
      index: Path.resolve(__dirname, '../dist/index.js')
    },
    output: {
      filename: '[name].js',
      globalObject: 'self',
      library: {
        type: 'global',
        name: 'TailwindRuntimeJit'
      }
    },
    resolve: {
      alias: {
        fs: Path.resolve(__dirname, '../dist/modules/fs.js'),
      },
      fallback: {
        module: false,
      },
      modules: require.main!.paths
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          type: 'asset/source'
        },
        {
          test: require.resolve('glob-parent'),
          use: [
            createLoader(function (_source: string) {
              return `module.exports = () => ''`;
            }),
          ],
        },
        {
          test: require.resolve('is-glob'),
          use: [
            createLoader(function (_source: string) {
              return `module.exports = () => false`;
            }),
          ],
        },
        {
          test: require.resolve('fast-glob'),
          use: [
            createLoader(function (source: string) {
              return `module.exports = { sync: (patterns) => [].concat(patterns) }`
            }),
          ],
        },
        {
          test: require.resolve('tailwindcss/lib/lib/setupTrackingContext.js'),
          use: createLoader(function (source: string) {
            return source.replace(`require(userConfigPath)`, `null`)
          }),
        },
      ]
    },
    plugins: [
      new NodePolyfillPlugin(),
      new Webpack.DefinePlugin({
        'process.env.TAILWIND_MODE': JSON.stringify('build'),
        'process.env.TAILWIND_DISABLE_TOUCH': true,
      })
    ],
    externals: [
      ({ context, request }, callback) => {
        if (/node_modules/.test(context!) && externals[request!]) {
          return callback(undefined, externals[request!]);
        }
        callback();
      }
    ],
  };

  return config;
};
