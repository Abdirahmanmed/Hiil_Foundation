export const logger = {
  info: (message, meta = {}) => {
    console.log(`ℹ️  ${message}`, meta);
  },

  warn: (message, meta = {}) => {
    console.warn(`⚠️  ${message}`, meta);
  },

  error: (message, meta = {}) => {
    console.error(`❌ ${message}`, meta);
  },
};
