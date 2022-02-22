<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  name: "App",
  components: {
  },
  data() {
    return {
      polkadotInstallLink:
        "https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd",
    };
  },
  watch: {
  },
  computed: {
    ...mapState({
    }),
  },
  beforeDestroy() {
  },
  created() {
  },
  mounted() {
  },
  methods: {
    init() {
    },
  },
};
</script>
<style lang='scss' scoped>
</style>
<style lang="scss">
@import "./assets/style/index.scss";
body {
  background: linear-gradient(227deg, rgba(99,48,221,0.1) 0%, rgba(223,62,64,0.1) 100%);
}
</style>
