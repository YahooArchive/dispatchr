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

Store.storeName = 'Store';
util.inherits(Store, EventEmitter);

Store.prototype.setDispatcher = function (dispatcher) {
    this.dispatcher = dispatcher;
};

Store.prototype.navigate = function (/*payload*/) {
    this.state.called = true;
    this.state.page = 'home';
    this.emit('final');
};

Store.prototype.error = function (/*payload*/) {
    this.state.called = true;
    this.emit('error', new Error('This is an error'));
};

Store.prototype.delay = function (/*payload*/) {
    var self = this;
    self.state.called = true;
    self.dispatcher.waitFor('DelayedStore', function () {
        var delayedStore = self.dispatcher.getStore('DelayedStore');
        if (!delayedStore.getState().final) {
            throw new Error('Delayed store didn\'t finish first!');
        }
        self.state.page = 'delay';
        self.emit('final');
    });
};

Store.prototype.getState = function () {
    return this.state;
};

Store.handlers = {
    'NAVIGATE': 'navigate',
    'DELAY': 'delay',
    'ERROR': 'error'
};

module.exports = Store;
