const path = require('path')
function resolve(dir) {
    return path.join(__dirname, dir)
}

const apmlink = (mode === 'prod' || mode === 'pre') ? '' : '.test'

// CDN资源
const cdn = {
    // cdn的css链接
    css: [],
    // cdn的js链接
    js: [
    ],
    // cdn: 模块名称和模块作用域命名（对应window里面挂载的变量名称）
    externals: {
    }
}
/**
 * @description 设置框架的title内容
 */
const name = 'APP'
const pubPath = process.env.NODE_ENV === 'development' ? '/' : '/pc/'
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
module.exports = {
    /**
     * @description 设置打包后生成路径的规则
     */
    publicPath: pubPath,
    /**
     * 当时有npm run build之后
     * 生产环境生成的项目录存放文件夹
     */
    outputDir: 'dist' + pubPath,
    // 放置生成的静态资源 (js、css、img、fonts)
    // assetsDir: 'static',
    /**
     * @description 通过process.env.NODE_ENV获得当前环境
     * 判断如果是developmen(开发环境)，那么当保存的时候，进行语法检测
     */
    lintOnSave: process.env.NODE_ENV === 'development',
    /**
     * 不产生map，较小打包体积
     */
    productionSourceMap: process.env.NODE_ENV === 'development',
    /**
     * 本地代理跨域请求
     */
    devServer: {
        host: 'localhost.domain.com', // 需要在hosts文件添加配置：127.0.0.1 localhost.domain.com
        port: 8009,
        https: true,
        disableHostCheck: true,
        proxy: {
            // 其他配置
            '/demo': {
                target: 'https://demo.domain.com/path',
                changeOrigin: true,
                ws: true,
                pathRewrite: {
                    '^/demo': ''
                }
            }
        }
    },
    configureWebpack: config => {
        return {
            name: name,
            externals: cdn.externals,
            resolve: {
                alias: {
                    '@': resolve('src')
                }
            },
            output: {
                filename: 'js/[name].[hash].js',
                chunkFilename: 'js/[name].[hash].js'
            }
        }
    },

    plugins: [
        new ModuleFederationPlugin({
            name: "app_one_remote",
            remotes: {
                app_two: "app_two_remote",
                app_three: "app_three_remote"
            },
            exposes: {
                'AppContainer':'./src/App'
            },
            shared: ["react", "react-dom","react-router-dom"]
        }),
        new HtmlWebpackPlugin({
            template: "./public/index.html",
            chunks: ["main"]
        })
    ],
    chainWebpack(config) {
        config.plugins.delete('preload')
        config.plugins.delete('prefetch')
        // 自定义loader
        config.module
            .rule('production tools')
            .test(/\.(css)(\?.*)?$/i)
            .use('string-replace')
            .loader(require.resolve('./replace-loader.js'))
            .end()
        // 注入cdn
        config.plugin('html').tap(args => {
            args[0].cdn = cdn
            return args
        })
        // set svg-sprite-loader
        config.module
            .rule('svg')
            .exclude.add(resolve('src/icons'))
            .end()
        config.module
            .rule('icons')
            .test(/\.svg$/)
            .include.add(resolve('src/icons'))
            .end()
            .use('svg-sprite-loader')
            .loader('svg-sprite-loader')
            .options({
                symbolId: 'icon-[name]'
            })
            .end()
        // css pre analysis
        const oneOfsMap = config.module.rule('scss').oneOfs.store
        oneOfsMap.forEach(item => {
            item.use('sass-resources-loader')
                .loader('sass-resources-loader')
                .options({
                    // 公用scss
                    resources: './src/style/vars.scss'
                })
                .end()
        })
        config.when(process.env.NODE_ENV === 'development', config =>
            config.devtool('cheap-source-map')
        ).end()
        // set preserveWhitespace
        config.module
            .rule('vue')
            .use('vue-loader')
            .loader('vue-loader')
            .tap(options => {
                options.compilerOptions.preserveWhitespace = true
                options.compilerOptions.directives = {
                    html(node, directiveMeta) {
                        const props = node.props || (node.props = [])
                        props.push({
                            name: 'innerHTML',
                            value: `$xss.process(_s(${directiveMeta.value}))`
                        })
                    }
                }
                return options
            })
            .end()
        config
            .when(process.env.NODE_ENV === 'development', config =>
                config.devtool('cheap-source-map')
            ).end()
        config.when(process.env.NODE_ENV !== 'development', config => {
            config
                .plugin('ScriptExtHtmlWebpackPlugin')
                .after('html')
                .use('script-ext-html-webpack-plugin', [
                    {
                        inline: /runtime\..*\.js$/
                    }
                ])
                .end()
            config.optimization.splitChunks({
                chunks: 'all',
                cacheGroups: {
                    libs: {
                        name: 'chunk-libs',
                        test: /[\\/]node_modules[\\/]/,
                        priority: 10,
                        chunks: 'initial'
                    },
                    elementUI: {
                        name: 'chunk-elementUI',
                        priority: 20,
                        test: /[\\/]node_modules[\\/]_?element-ui(.*)/ // 兼容cnpm
                    },
                    echarts: {
                        name: 'chunk-echarts',
                        priority: 20,
                        test: /[\\/]node_modules[\\/]_?echarts(.*)/ // 兼容cnpm
                    },
                    commons: {
                        name: 'chunk-commons',
                        test: resolve('src/components'),
                        minChunks: 3,
                        priority: 5,
                        reuseExistingChunk: true
                    }
                }
            })
            config.optimization.runtimeChunk('single')
        })
    }
}
