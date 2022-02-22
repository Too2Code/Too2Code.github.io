// 路由默认配置，路由表并不从此注入
export const ROUTER_DEFAULT_CONFIG = {
  waitForData: true,
  transitionOnLoad: true,
  mode: "history",
  base: "/",
  scrollBehavior(to) {
    if (to.hash) {
      return {
        selector: to.hash
      };
    }
  }
};

// vuex 默认配置
export const VUEX_DEFAULT_CONFIG = {
  strict: process.env.NODE_ENV !== "production"
};

// CONST 默认配置
export const CONST_DEFAULT_CONFIG = {
  sep: "/"
};

