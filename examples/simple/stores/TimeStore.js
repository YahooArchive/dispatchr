/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    debug = require('debug')('TimeStore');

function TimeStore(context, initialState) {
    initialState = initialState || {};
    this.time = initialState.time;
    if (!this.time) {
        this.reset();
    }
}

util.inherits(TimeStore, EventEmitter);

TimeStore.prototype.reset = function () {
    var date = new Date();
    this.time = date.toString();
    debug('time updated');
    this.emit('update');
};

TimeStore.prototype.handleReset = function () {
    var self = this;
    // Simulate async API call
    setTimeout(function () {
        self.reset();
        self.emit('final');
    }, 100);
};

TimeStore.prototype.handleBootstrap = function () {
    var self = this;
    // Simulate polling/push state
    setInterval(function () {
        self.reset();
    }, 5000);
    self.emit('final');
};

TimeStore.handlers = {
    'RESET_TIMER': 'handleReset',
    'BOOTSTRAP': 'handleBootstrap'
};

TimeStore.prototype.getState = function () {
    return {
        time: this.time
    };
};

module.exports = TimeStore;
