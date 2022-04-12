const path = require('path')
function resolve(dir) {
    return path.join(__dirname, dir)
}

// 区分不同环境，配置不同的cdn地址
const mode = process.env.VUE_APP_MODE || 'prod'
console.log('当前构建环境为：' + mode)

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
     * @desc webpack会在本地开启一个node服务，用来转发请求
     */
    devServer: {
        host: 'localhost.domain.com', // 需要在hosts文件添加配置：127.0.0.1 localhost.domain.com
        port: 8009,
        https: true,
        disableHostCheck: true,
        proxy: {
            // 其他配置
            '/demo': {
                target: 'https://demo.domain.com/path', // 代理的真实服务
                changeOrigin: true,
                ws: true, // 本地开发开启ws通道保持连接
                pathRewrite: {
                    '^/demo': ''
                }
            }
        }
    },
    /**
     * css 全局配置，以sass为例。也可以使用 131行 的用法
     */
    css: {
        loaderOptions: {
            sass: {
                prependData: `@import "./css/vars.scss"`
            }
        }
    },

    configureWebpack: config => {
        // 性能优化：生产环境代码压缩
        if (process.env.VUE_APP_MODE === 'prod') {
            config.plugins.push(
                new UglifyJsPlugin({
                    uglifyOptions: {
                        // 生产环境自动删除console
                        warnings: false,
                        compress: {
                            // warnings: false  // 如果打包错误，注释本行
                            drop_debugger: true,
                            drop_console: true,
                            pure_funcs: ['console.log']
                        }
                    },
                    sourceMap: false,
                    parallel: true
                })
            )
        }
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
        // 设置svg雪碧图
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
        // css 预解析
        const oneOfsMap = config.module.rule('scss').oneOfs.store
        oneOfsMap.forEach(item => {
            item.use('sass-resources-loader')
                .loader('sass-resources-loader')
                .options({
                    // 公用scss，全局配置
                    resources: './css/vars.scss'
                })
                .end()
        })
        config.when(process.env.NODE_ENV === 'development', config =>
            config.devtool('cheap-source-map')
        ).end()
        // Vue-loader: https://vue-loader.vuejs.org/zh/options.html#compiler
        config.module
            .rule('vue')
            .use('vue-loader')
            .loader('vue-loader')
            .tap(options => {
                // 去掉模板标签之间的空格
                options.compilerOptions.preserveWhitespace = true
                // 使用xss的npm包过滤来自指令的xss攻击风险。通过给指令包上一层xss处理函数进行过滤
                // main.js： import xss from 'xss'; Vue.prototype.xss = xss;
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
        // 配置source-map(源码)： // cheap-source-map--不显示源码 、source-map--显示源码 、 eval--最快的编译办法
        config
            .when(process.env.NODE_ENV === 'development', config =>
                config.devtool('cheap-source-map')
            ).end()
        config
            .when(process.env.NODE_ENV !== 'development', config => {
            config
                .plugin('ScriptExtHtmlWebpackPlugin')
                .after('html')
                .use('script-ext-html-webpack-plugin', [
                    {
                        inline: /runtime\..*\.js$/
                    }
                ])
                .end()
            // 包拆分
            config.optimization.splitChunks({
                // 分割代码的模式, async-只分割出异步引入的模块, initial-只分割同步引入模块, all-同步异步都分割
                chunks: 'all',
                // 缓存组。将所有加载模块放在缓存里一起分割打包
                cacheGroups: {
                    libs: { // 自定义打包模块
                        name: 'chunk-libs', // 打包输出文件名+hash值
                        test: /[\\/]node_modules[\\/]/,
                        priority: 10, // 优先级。先打包到哪个组里
                        chunks: 'initial' // 分割代码的模式，如上
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
                    },
                    default: { // 默认打包模块
                        priority: -20,
                        reuseExistingChunk: true, // 模块嵌套引入是，判断是否服用已经被打包的模块
                        name: 'common.js'
                    }
                }
            })
            config.optimization.runtimeChunk('single')
        })
    }
}
