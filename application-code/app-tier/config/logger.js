'use strict';

function normalizeContext(context) {
    const normalized = { ...context };

    if (normalized.error instanceof Error) {
        normalized.error = {
            name: normalized.error.name,
            message: normalized.error.message,
            stack: normalized.error.stack
        };
    }

    return normalized;
}

function write(stream, level, message, context = {}) {
    const entry = {
        ...normalizeContext(context),
        timestamp: new Date().toISOString(),
        level,
        message
    };

    stream.write(`${JSON.stringify(entry)}\n`);
}

module.exports = Object.freeze({
    info(message, context) {
        write(process.stdout, 'info', message, context);
    },
    error(message, context) {
        write(process.stderr, 'error', message, context);
    }
});
