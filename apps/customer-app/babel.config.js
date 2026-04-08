module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      'react-native-reanimated/plugin',
    ],
  };
};
