/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function DelayedStore(context) {
    this.called = false;
    this.context = context;
    this.state = {
        final: false
    };
    this.dependencies = {};
}

util.inherits(DelayedStore, EventEmitter);

DelayedStore.prototype.delay = function (payload, dependencies) {
    var self = this;
    self.called = true;
    self.state.page = 'home';
    self.dependencies = dependencies;
    setTimeout(function () {
        self.state.final = true;
        console.log('delay finish');
        self.emit('final');
    }, 10);
};

DelayedStore.prototype.getState = function () {
    return this.state;
};

DelayedStore.handlers = {
    'DELAY': 'delay'
};

module.exports = DelayedStore;
