module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['public/**/*.html', 'public/js/**/*.js', 'node_modules/bootstrap/dist/css/bootstrap.min.css'], // scan all HTML and JS files
      safelist: ['safelist-class'], // optional: list any classes you want to keep
    }),
    require('cssnano')({
      preset: 'default', // CSSNano minification options
    }),
  ],
};
