const {src, dest, watch, series} = require('gulp');

const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const browserSync = require('browser-sync');
const gulpIf = require('gulp-if');
const changed = require('gulp-changed');
const del = require('del');
const fileInclude = require('gulp-file-include');
const htmlmin = require('gulp-htmlmin');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const groupMedia = require('gulp-group-css-media-queries');
const rename = require('gulp-rename');
const cleanCss = require('gulp-clean-css');
const webpack = require('webpack-stream');
const babel = require('gulp-babel');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const fonter = require('gulp-fonter');
const ttfToWoff2 = require('gulp-ttf2woff2');
const zip = require('gulp-zip');

const srcFolder = `./src`;
const buildFolder = `./app`;

const path = {
  src: {
    html: `${srcFolder}/*.html`,
    styles: `${srcFolder}/scss/*.scss`,
    scripts: `${srcFolder}/js/*.js`,
    assets: `${srcFolder}/assets/**/*`,
    images: `${srcFolder}/img/**/*`,
    sprites: `${srcFolder}/sprites/**/*.svg`,
  },
  build: {
    html: `${buildFolder}/`,
    styles: `${buildFolder}/css/`,
    scripts: `${buildFolder}/js/`,
    assets: `${buildFolder}/assets/`,
    images: `${buildFolder}/img/`,
  },
  watch: {
    html: `${srcFolder}/**/*.html`,
    styles: `${srcFolder}/scss/**/*.scss`,
    scripts: `${srcFolder}/js/**/*.js`,
    assets: `${srcFolder}/assets/**/*`,
    images: `${srcFolder}/img/**/*`,
  },
}

function plumberNotify(title) {
  return {
    errorHandler: notify.onError({
      title: title,
      sound: true,
      message: 'Error: <%= error.message %>'
    })
  }
}

function watching() {
  browserSync.init({
    server: {
      baseDir: path.build.html,
    },
    port: 3000,
  })

  watch(path.watch.html, html)
  watch(path.watch.styles, styles)
  watch(path.watch.scripts, scripts)
  watch(path.watch.images, images)
}

function clean() {
  return del(buildFolder)
}

function html()  {
  return src(path.src.html)
    .pipe(gulpIf(!isBuild, changed(path.build.html, { hasChanged: changed.compareContents })))
    .pipe(plumber(plumberNotify("HTML")))
    .pipe(fileInclude())
    .pipe(gulpIf(isBuild, htmlmin({ collapseWhitespace: true })))
    .pipe(dest(path.build.html))
    .pipe(gulpIf(!isBuild, browserSync.stream()))
}

function styles() {
  return src(path.src.styles, {sourcemaps: isBuild ? false : true})
  .pipe(plumber(plumberNotify("SCSS")))
  .pipe(sass())
  .pipe(autoprefixer())
  .pipe(groupMedia())
  .pipe(gulpIf(isBuild, cleanCss({
    level: 2
  })))
  .pipe(rename({
    basename: 'style',
    suffix: '.min',
    extname: '.css'
  }))
  .pipe(dest(path.build.styles))
  .pipe(gulpIf(!isBuild, browserSync.stream()))
}

function scripts() {
  return src(path.src.scripts)
  .pipe(plumber(plumberNotify("JavaScript")))
  .pipe(babel())
  .pipe(webpack({
    mode: isBuild ? 'production' : 'development',
    entry: {
      main: `./src/js/main.js`,
      // contacts: `./src/js/contacts.js`,
    },
    output: {
      filename: '[name].min.js',
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        }
      ]
    }
  }))
  .pipe(dest(path.build.scripts))
  .pipe(gulpIf(!isBuild, browserSync.stream()))
}

function images() {
  return src(path.src.images)
    .pipe(plumber(plumberNotify("IMAGES")))
    .pipe(changed(path.build.images))
    .pipe(webp())
    .pipe(dest(path.build.images))
    .pipe(src(path.src.images))
    .pipe(changed(path.build.images))
    .pipe(gulpIf(isBuild, imagemin()))
    .pipe(dest(path.build.images))
    .pipe(gulpIf(!isBuild, browserSync.stream()))
}

function svgSprites() {
  return src(path.src.sprites)
    .pipe(
      svgmin({
        js2svg: {
          pretty: true,
        },
      })
    )
    .pipe(
      cheerio({
        run: function ($) {
          $('[fill]').removeAttr('fill');
          $('[stroke]').removeAttr('stroke');
          $('[style]').removeAttr('style');
        },
        parserOptions: {
          xmlMode: true
        },
      })
    )
    .pipe(replace('&gt;', '>'))
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: "../icons.svg"
        }
      },
    }))
    .pipe(dest(`./src/img/icons/`));
}

function otf2ttf() {
  return src(`${srcFolder}/fonts/**/*.otf`)
    .pipe(plumber(plumberNotify('Font Converter')))
    .pipe(fonter({
      formats: ['ttf']
    }))
    .pipe(dest(`${srcFolder}/fonts/`))
}

function ttf2woff2() {
  return src(`${srcFolder}/fonts/**/*.ttf`)
  .pipe(plumber(plumberNotify('Font Converter')))
  .pipe(ttfToWoff2())
  .pipe(dest(`${srcFolder}/fonts/`))
}

function fontsClean() {
  return del(`${srcFolder}/fonts/**/*.{ttf,otf}`)
}

function fontsCopy() {
  return src(`${srcFolder}/fonts/**/*.woff2`)
    .pipe(changed(`${buildFolder}/fonts/**/*`))
    .pipe(dest(`${buildFolder}/fonts/`))
    .pipe(gulpIf(!isBuild, browserSync.stream()))
}

function assetsCopy() {
  return src(path.src.assets)
    .pipe(changed(path.build.assets))
    .pipe(dest(path.build.assets))
    .pipe(gulpIf(!isBuild, browserSync.stream()))
}

function archivateApp() {
  return src(`${buildFolder}/**/*`)
    .pipe(zip('app.zip'))
    .pipe(dest('./'))
}

let isBuild = false;

function changeMode(done) {
  isBuild = true;
  done();
}


exports.dev = series(clean, html, styles, scripts, images, fontsCopy, assetsCopy, watching);
exports.build = series(changeMode, clean, html, styles, scripts, fontsCopy, images, assetsCopy);
exports.sprite = series(svgSprites);
exports.fonts = series(otf2ttf, ttf2woff2, fontsClean);
exports.tozip = series(archivateApp);