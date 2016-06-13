import winston from 'winston';

//
export default new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: () => new Date().toISOString(),
      formatter: (options) => {
        let level = options.level.toUpperCase();
        let message = (undefined !== options.message ? options.message : '')
        let metadata = (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : '');

        return '[' + options.timestamp() +'] ' + level + ': ' + message + ' ' + metadata;
      }
    })
  ]
});
