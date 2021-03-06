const path = require("path");
let webpack = require("webpack");
function resolve(dir) {
  return path.join(__dirname, dir);
}
module.exports = {
  publicPath: '/',
  assetsDir: "static",
  runtimeCompiler: true,
  chainWebpack: config => {
    // 添加别名
    config.resolve.alias
      .set("@", resolve("src"))
      .set("~", resolve("node_modules"))
      .set("Assets", resolve("src/assets"))
      .set("Components", resolve("src/components"))
      .set("Config", resolve("src/config"))
      .set("Directives", resolve("src/directives"))
      .set("Libs", resolve("src/libs"))
      .set("Plugins", resolve("src/plugins"))
      .set("Routes", resolve("src/routes"))
      .set("Service", resolve("src/service"))
      .set("Utils", resolve("src/utils"))
      .set("Views", resolve("src/views"))
      .set("Locale", resolve("src/locale"))

    // 修改svg loader
    config.module
      .rule("svg")
      .exclude.add(resolve("src/assets/icons"))
      .end();

    config.module
      .rule('images')
      .use('url-loader')
      .loader('url-loader')
      .end();

    // 添加svg-sprite-loader
    config.module
      .rule("svgSpriteLoader")
      .test(/\.svg$/)
      .include.add(resolve("src/assets/icons"))
      .end()
      .use("svg-sprite-loader")
      .loader("svg-sprite-loader")
      .options({
        symbolId: "icon-[name]"
      })
      .end();
  },
  configureWebpack: config => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/
      })
    );
    config.node = {
      fs: 'empty',
      module: 'empty',
    };
  },
  css: {
    extract: true,
    loaderOptions: {
      // 给 sass-loader 传递选项
      sass: {
        additionalData: `@import "@/assets/style/global.scss";`
      }
    }
  }
};
