/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var Action = require('./Action');

module.exports = function () {
    var debug = require('debug')('Dispatchr:dispatcher');

    /**
     * @class Dispatcher
     * @param {Object} context The context to be used for store instances
     * @constructor
     */
    function Dispatcher (context) {
        this.storeInstances = {};
        this.currentAction = null;
        this.storeInterface = {
            getContext: function () { return context; },
            getStore: this.getStore.bind(this),
            waitFor: this.waitFor.bind(this)
        };
    }

    Dispatcher.stores = {};
    Dispatcher.handlers = {};

    /**
     * Registers a store so that it can handle actions.
     * @method registerStore
     * @static
     * @param {Object} store A store class to be registered. The store should have a static
     *      `name` property so that it can be loaded later.
     */
    Dispatcher.registerStore = function (store) {
        var storeName = Dispatcher.getStoreName(store);
        if (!storeName) {
            throw new Error('Store is required to have a `storeName` property.');
        }
        if (Dispatcher.stores[storeName]) {
            throw new Error('Store `' + storeName + '` is already registerd.');
        }
        Dispatcher.stores[storeName] = store;
        if (store.handlers) {
            Object.keys(store.handlers).forEach(function (action) {
                var handler = store.handlers[action];
                Dispatcher.registerHandler(action, storeName, handler);
            });
        }
        return Dispatcher.stores[storeName];
    };

    /**
     * Method to discover if a storeName has been registered
     * @param {Object|String} store The store to check
     * @returns {boolean}
     */
    Dispatcher.isRegistered = function (store) {
        var storeName = Dispatcher.getStoreName(store),
            storeInstance = Dispatcher.stores[storeName];

        if (!storeInstance) {
            return false;
        }

        if ('function' === typeof store) {
            if (store !== storeInstance) {
                return false;
            }
        }
        return true;
    };

    /**
     * Gets a name from a store
     * @param {String|Object} store The store name or class from which to extract
     *      the name
     * @returns {String}
     */
    Dispatcher.getStoreName = function (store) {
        if ('string' === typeof store) {
            return store;
        }
        return store.storeName;
    };

    /**
     * Adds a handler function to be called for the given action
     * @method registerHandler
     * @private
     * @static
     * @param {String} action Name of the action
     * @param {String} name Name of the store that handles the action
     * @param {String} handler Name of the function that handles the action
     * @returns {number}
     */
    Dispatcher.registerHandler = function (action, name, handler) {
        Dispatcher.handlers[action] = Dispatcher.handlers[action] || [];
        Dispatcher.handlers[action].push({
            name: Dispatcher.getStoreName(name),
            handler: handler
        });
        return Dispatcher.handlers.length - 1;
    };

    /**
     * Returns a single store instance and creates one if it doesn't already exist
     * @method getStore
     * @param {String} name The name of the instance
     * @returns {Object} The store instance
     */
    Dispatcher.prototype.getStore = function (name) {
        var storeName = Dispatcher.getStoreName(name);
        if (!this.storeInstances[storeName]) {
            var Store = Dispatcher.stores[storeName];
            if (!Store) {
                throw new Error('Store ' + storeName + ' was not registered.');
            }
            this.storeInstances[storeName] = new (Dispatcher.stores[storeName])(this.storeInterface);
        }
        return this.storeInstances[storeName];
    };

    /**
     * Dispatches a new action or queues it up if one is already in progress
     * @method dispatch
     * @param {String} actionName Name of the action to be dispatched
     * @param {Object} payload Parameters to describe the action
     */
    Dispatcher.prototype.dispatch = function (actionName, payload) {
        if (!Dispatcher.handlers[actionName]) {
            debug(actionName + ' does not have any registered handlers');
            return;
        }
        this.currentAction = new Action(actionName, payload);
        var self = this,
            handlerFns = {};
        Dispatcher.handlers[actionName].forEach(function (store) {
            var storeInstance = self.getStore(store.name);
            if (!storeInstance[store.handler]) {
                throw new Error(store.name + ' does not have a method called ' + store.handler);
            }
            handlerFns[store.name] = storeInstance[store.handler].bind(storeInstance);
        });
        this.currentAction.dispatch(handlerFns);
        debug('finished ' + this.currentAction.name);
        this.currentAction = null;
    };

    /**
     * Returns a raw data object representation of the current state of the
     * dispatcher and all store instances
     * @returns {Object} dehydrated dispatcher data
     */
    Dispatcher.prototype.toJSON = function () {
        var self = this,
            stores = {};
        Object.keys(self.storeInstances).forEach(function (storeName) {
            var store = self.storeInstances[storeName];
            if (store.toJSON) {
                stores[storeName] = store.toJSON();
            } else {
                stores[storeName] = store.getState();
            }
        });
        return {
            stores: stores
        };
    };

    /**
     * Takes a raw data object and rehydrates the dispatcher and store instances
     * @param {Object} dispatcherState raw state typically retrieved from `toJSON`
     *      method
     */
    Dispatcher.prototype.rehydrate = function (dispatcherState) {
        var self = this;
        if (dispatcherState.stores) {
            Object.keys(dispatcherState.stores).forEach(function (storeName) {
                var state = dispatcherState.stores[storeName],
                    store = self.getStore(storeName);
                if (store.rehydrate) {
                    store.rehydrate(state);
                }
            });
        }
    };

    /**
     * Waits until all stores have finished handling an action and then calls
     * the callback
     * @param {String|Array} stores An array of stores as strings to wait for
     * @param {Function} [callback] Called after all stores have completed handling their actions
     */
    Dispatcher.prototype.waitFor = function (stores, callback) {
        this.currentAction.waitFor(stores, callback);
    };

    return Dispatcher;
};
