const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = (env, argv) => ({
  mode: argv.mode === "production" ? "production" : "development",

  // Figma 플러그인 환경을 위한 특별한 설정
  devtool: argv.mode === "production" ? false : "inline-source-map",

  entry: {
    code: "./code.ts",
  },

  module: {
    rules: [
      // TypeScript 파일 처리 (node_modules 제외)
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      esmodules: true,
                    },
                    modules: false,
                    useBuiltIns: false,
                    loose: true,
                    spec: false,
                  },
                ],
              ],
              plugins: [
                "@babel/plugin-transform-runtime",
                "@babel/plugin-transform-object-rest-spread",
                "@babel/plugin-transform-arrow-functions",
                "@babel/plugin-transform-destructuring",
                "@babel/plugin-transform-spread",
                "@babel/plugin-transform-template-literals",
                "@babel/plugin-transform-async-to-generator",
                "@babel/plugin-transform-block-scoping",
                "@babel/plugin-transform-classes",
                "@babel/plugin-transform-computed-properties",
                "@babel/plugin-transform-literals",
                "@babel/plugin-transform-parameters",
                "@babel/plugin-transform-shorthand-properties",
              ],
            },
          },
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      // JavaScript 파일 처리 (node_modules 포함)
      {
        test: /\.jsx?$/,
        include: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      esmodules: true,
                    },
                    modules: false,
                    useBuiltIns: false,
                    loose: true,
                    spec: false,
                  },
                ],
              ],
              plugins: [
                "@babel/plugin-transform-runtime",
                "@babel/plugin-transform-object-rest-spread",
                "@babel/plugin-transform-arrow-functions",
                "@babel/plugin-transform-destructuring",
                "@babel/plugin-transform-spread",
                "@babel/plugin-transform-template-literals",
                "@babel/plugin-transform-async-to-generator",
                "@babel/plugin-transform-block-scoping",
                "@babel/plugin-transform-classes",
                "@babel/plugin-transform-computed-properties",
                "@babel/plugin-transform-literals",
                "@babel/plugin-transform-parameters",
                "@babel/plugin-transform-shorthand-properties",
              ],
            },
          },
        ],
      },
      // CSV 파일을 텍스트로 처리
      {
        test: /\.csv$/,
        use: "raw-loader",
      },
    ],
  },

  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    // Figma 플러그인 환경에 맞는 설정
    globalObject: "this",
    iife: true,
    environment: {
      // ES6 모듈 환경을 위한 설정
      arrowFunction: true,
      bigIntLiteral: false,
      const: true,
      destructuring: true,
      dynamicImport: true,
      forOf: true,
      module: true,
    },
  },

  // Figma 플러그인 환경에 맞는 target
  target: ["web", "es5"],

  optimization: {
    // 코드 분할 완전 비활성화
    splitChunks: false,
    // 런타임 청크 비활성화
    runtimeChunk: false,
    // 압축 설정
    minimize: argv.mode === "production",
  },

  plugins: [
    new Dotenv({
      safe: false,
      systemvars: true,
      silent: false,
    }),
  ],

  // 성능 경고 비활성화
  performance: {
    hints: false,
  },

  // 외부 의존성 처리
  externals: {
    // Figma API는 전역으로 사용 가능
    figma: "figma",
  },

  // webpack 5의 실험적 기능 설정
  experiments: {
    asyncWebAssembly: false,
    layers: false,
    lazyCompilation: false,
    outputModule: false,
    syncWebAssembly: false,
    topLevelAwait: false,
  },
});
