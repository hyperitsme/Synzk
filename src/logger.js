import pino from 'pino';
const pretty = process.env.NODE_ENV !== 'production';
const logger = pino(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {});
export default logger;
