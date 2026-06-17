module.exports = function (api) {
  api.cache(true);
  return {
    // zustand 的 persist 中间件用了 import.meta(Hermes 不支持),开 unstable_transformImportMeta 转译掉。
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: ["react-native-reanimated/plugin"]
  };
};
