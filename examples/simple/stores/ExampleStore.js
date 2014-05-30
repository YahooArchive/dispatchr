/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function ExampleStore(context, initialState) {
    initialState = initialState || {};
    this.url = initialState.url || null;
}

util.inherits(ExampleStore, EventEmitter);

ExampleStore.handlers = {
    'NAVIGATE': 'handleNavigate'
};

ExampleStore.prototype.handleNavigate = function (payload) {
    this.url = payload.url;
    this.emit('update'); // Store may be listening for updates to state
    this.emit('final'); // Action has been fully handled
};

ExampleStore.prototype.getState = function () {
    return {
        url: this.url
    };
};

module.exports = ExampleStore;
