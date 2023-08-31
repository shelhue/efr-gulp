const {src, dest, watch, series} = require('gulp');

const srcFolder = `./src`;
const buildFolder = `./app`;

const path = {
  src: {},
  build: {},
  watch: {},
}

let isBuild = false;

function changeMode(done) {
  isBuild = true;
  done();
}


exports.dev = series();
exports.build = series();