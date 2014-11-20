/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';
var debug = require('debug')('Dispatchr:Action');


function Action(name, payload) {
    this.name = name;
    this.payload = payload;
    this._handlers = null;
    this._isExecuting = false;
    this._isCompleted = null;
}

/**
 * Gets a name from a store
 * @method getStoreName
 * @param {String|Object} store The store name or class from which to extract
 *      the name
 * @returns {String}
 */
Action.prototype.getStoreName = function getStoreName(store) {
    if ('string' === typeof store) {
        return store;
    }

    return store.storeName;
};

/**
 * Executes all handlers for the action
 * @method execute
 * @param {Function[]} handlers A mapping of store names to handler function
 * @throws {Error} if action has already been executed
 */
Action.prototype.execute = function execute(handlers) {
    if (this._isExecuting) {
        throw new Error('Action is already dispatched');
    }

    this._handlers = handlers;
    this._isExecuting = true;
    this._isCompleted = {};

    var self = this;

    Object.keys(handlers).forEach(function handlersEach(storeName) {
        self._callHandler(storeName);
    });
};

/**
 * Calls an individual store's handler function
 * @method _callHandler
 * @param {String} storeName
 * @private
 * @throws {Error} if handler does not exist for storeName
 */
Action.prototype._callHandler = function callHandler(storeName) {
    var handlerFn = this._handlers[storeName];

    if (!handlerFn) {
        throw new Error(storeName + ' does not have a handler for action ' + this.name);
    }

    if (this._isCompleted[storeName]) {
        return;
    }

    this._isCompleted[storeName] = false;

    debug('executing handler for ' + storeName);

    handlerFn(this.payload, this.name);

    this._isCompleted[storeName] = true;
};

/**
 * Waits until all stores have finished handling an action and then calls
 * the callback
 * @method waitFor
 * @param {String|String[]|Constructor|Constructor[]} stores An array of stores as strings or constructors to wait for
 * @param {Function} callback Called after all stores have completed handling their actions
 * @throws {Error} if the action is not being executed
 */
Action.prototype.waitFor = function waitFor(stores, callback) {
    if (!this._isExecuting) {
        throw new Error('waitFor called even though there is no action being executed!');
    }

    if (!Array.isArray(stores)) {
        stores = [stores];
    }

    debug('waiting on ' + stores.join(', '));

    var self = this;

    stores.forEach(function storesEach(storeName) {
        storeName = self.getStoreName(storeName);
        self._callHandler(storeName);
    });

    callback();
};


module.exports = Action;
