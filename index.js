const ProgressBar = require('progress');
const chalk = require('chalk');
const webpack = require('webpack');

const noop = () => {};

require('object.assign').shim();

module.exports = function ProgressBarPlugin(options = {}) {
  const stream = options.stream || process.stderr;
  const enabled = stream && stream.isTTY;

  if (!enabled) {
    return noop;
  }

  const barLeft = chalk.bold('[');
  const barRight = chalk.bold(']');
  const preamble = chalk.cyan.bold('  build ') + barLeft;
  const barFormat = options.format || `${preamble}:bar${barRight}${chalk.green.bold(' :percent')}`;
  const {
    format, total, summary, summaryContent, customSummary, updateAfter, ...opts
  } = options;

  const barOptions = Object.assign({
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: 100,
    clear: true,
  }, opts);

  const bar = new ProgressBar(barFormat, barOptions);

  let running = false;
  let startTime = 0;
  let lastPercent = 0;
  let interval;

  return new webpack.ProgressPlugin(((percent, msg) => {
    if (!running && lastPercent !== 0 && !customSummary) {
      stream.write('\n');
    }

    const newPercent = Math.floor(percent * barOptions.width);

    if (lastPercent < newPercent || newPercent === 0) {
      bar.update(percent, {
        msg,
      });
      lastPercent = newPercent;
      if (interval && interval.clearInterval) {
        interval.clearInterval();
      }
      if (updateAfter) {
        interval = setInterval(() => bar.update(percent, { msg }), updateAfter);
      }
    }

    if (!running) {
      running = true;
      startTime = new Date();
      lastPercent = 0;
    } else if (percent === 1) {
      const now = new Date();
      const buildTime = `${(now - startTime) / 1000}s`;

      bar.terminate();

      if (summary) {
        stream.write(chalk.green.bold(`Build completed in ${buildTime}\n\n`));
      } else if (summaryContent) {
        stream.write(`${summaryContent}(${buildTime})\n\n`);
      }

      if (customSummary) {
        customSummary(buildTime);
      }

      running = false;
    }
  }));
};
