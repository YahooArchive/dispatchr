/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function Store(context, initialState) {
    this.context = context;
    this.state = initialState || {};
}

util.inherits(Store, EventEmitter);

Store.prototype.setDispatcher = function (dispatcher) {
    this.dispatcher = dispatcher;
};

Store.prototype.delay = function (/*payload*/) {
    this.state.called = true;
    this.state.page = 'home';
    this.emit('final');
};

Store.prototype.getState = function () {
    return this.state;
};

Store.handlers = {
    'VIEW_SOMETHING': 'delay'
};

module.exports = Store;
