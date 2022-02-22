export default [{
    name: "root",
    path: "/",
    component: () =>
      import( /* webpackChunkName: "home" */ "Views/Compile/index")
  },
  {
    name: "404",
    path: "/404",
    component: () => import( /* webpackChunkName: "404" */ "Views/ErrorPage/404")
  },
  {
    path: "*",
    redirect: "/404"
  }
];
