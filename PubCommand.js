const { Command } = require('klasa');

module.exports = class PubCommand extends Command {
    constructor(client, store, file, core, {
        conditions = [],
        examples = [],
        ...options
    }) {
        super(client, store, file, core, options);
        this.examples = examples
        this.conditions = conditions;
    }
};