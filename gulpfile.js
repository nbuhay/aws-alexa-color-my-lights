const gulp = require('gulp')
    , stripCode = require('gulp-strip-code')
    , readlineSync = require('readline-sync')
    , fs = require('fs')

gulp.task('default', () => console.log('Hello from aws-alexa-color-my-lights gulpfile!'));

// https://www.concurrencylabs.com/blog/configure-your-lambda-function-like-a-champ-sail-smoothly/
gulp.task('env', () => {
  const envFile = 'env.json'
      , keys = [
          'SpotifyRefreshToken',
          'SpotifyId',
          'SpotifySecret',
          'LifxAppToken',
          'RGBColorCount',
          'RGBQuality'
        ]
  
  let env = []

  keys.forEach((key) => {
     let value = readlineSync.question(`${key}: `);
     env.push({ ParameterKey: key, ParameterValue: value });
  });

  fs.writeFile('env.json', JSON.stringify(env),
    (err) => (err) ? console.error(err) : console.log('Success:  saved to env.json'));
});

// https://philipwalton.com/articles/how-to-unit-test-private-functions-in-javascript/
gulp.task('build', () => {
  gulp.src(['color.js'])
    .pipe(stripCode({
      start_comment: "start-test-block",
      end_comment: "end-test-block"
    }))
    .pipe(gulp.dest('build/'));
});