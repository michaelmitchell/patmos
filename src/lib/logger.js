import winston from "winston";
import util from "util";

//
export default new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: () => new Date().toISOString(),
      formatter: (options) => {
        let level = options.level.toUpperCase();
        let message = (undefined !== options.message ? options.message : "");

        // make stack traces easier to read
        if (options.meta && options.meta.stack) {
          options.meta.stack = options.meta.stack.split("\n");
        }

        let metadata = (options.meta && Object.keys(options.meta).length ? "\n" + util.inspect(options.meta, {depth: null, colors: true}) : "");

        return "[" + options.timestamp() +"] " + level + " " + message + metadata;
      }
    })
  ]
});
