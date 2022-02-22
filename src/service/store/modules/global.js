import {
  setCookie,
} from "Utils/storage";

const global = {
  state: {
    language: '',
  },
  mutations: {
    SET_LANGUAGE: (state, language) => {
      state.language = language;
    },
  },
  actions: {
    SetLanguage({
      commit
    }, language) {
      commit("SET_LANGUAGE", language);
      setCookie("local_language", language, {
        expires: 30
      });
    },
  }
};

export default global;
