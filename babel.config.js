module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo auto-configures the Reanimated/Worklets Babel plugin
    // (SDK 50+). Do NOT add 'react-native-reanimated/plugin' manually — on
    // Reanimated 4 that moved into react-native-worklets and adding it errors.
    presets: ['babel-preset-expo'],
  };
};
