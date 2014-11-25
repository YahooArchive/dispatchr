/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var Action = require('./Action'),
    DEFAULT = 'default';

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
        this.dispatcherInterface = {
            getContext: function getContext() { return context; },
            getStore: this.getStore.bind(this),
            waitFor: this.waitFor.bind(this)
        };
    }

    Dispatcher.stores = {};
    Dispatcher.handlers = {
        'default': []
    };

    /**
     * Registers a store so that it can handle actions.
     * @method registerStore
     * @static
     * @param {Object} store A store class to be registered. The store should have a static
     *      `name` property so that it can be loaded later.
     * @throws {Error} if store is invalid
     * @throws {Error} if store is already registered
     */
    Dispatcher.registerStore = function registerStore(store) {
        if ('function' !== typeof store) {
            throw new Error('registerStore requires a constructor as first parameter');
        }
        var storeName = Dispatcher.getStoreName(store);
        if (!storeName) {
            throw new Error('Store is required to have a `storeName` property.');
        }
        if (Dispatcher.stores[storeName]) {
            if (Dispatcher.stores[storeName] === store) {
                // Store is already registered, nothing to do
                return;
            }
            throw new Error('Store with name `' + storeName + '` has already been registered.');
        }
        Dispatcher.stores[storeName] = store;
        if (store.handlers) {
            Object.keys(store.handlers).forEach(function storeHandlersEach(action) {
                var handler = store.handlers[action];
                Dispatcher._registerHandler(action, storeName, handler);
            });
        }
    };

    /**
     * Method to discover if a storeName has been registered
     * @method isRegistered
     * @static
     * @param {Object|String} store The store to check
     * @returns {boolean}
     */
    Dispatcher.isRegistered = function isRegistered(store) {
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
     * @method getStoreName
     * @static
     * @param {String|Object} store The store name or class from which to extract
     *      the name
     * @returns {String}
     */
    Dispatcher.getStoreName = function getStoreName(store) {
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
     * @param {String|Function} handler The function or name of the method that handles the action
     * @returns {number}
     */
    Dispatcher._registerHandler = function registerHandler(action, name, handler) {
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
     * @throws {Error} if store is not registered
     */
    Dispatcher.prototype.getStore = function getStore(name) {
        var storeName = Dispatcher.getStoreName(name);
        if (!this.storeInstances[storeName]) {
            var Store = Dispatcher.stores[storeName];
            if (!Store) {
                throw new Error('Store ' + storeName + ' was not registered.');
            }
            this.storeInstances[storeName] = new (Dispatcher.stores[storeName])(this.dispatcherInterface);
        }
        return this.storeInstances[storeName];
    };

    /**
     * Dispatches a new action or queues it up if one is already in progress
     * @method dispatch
     * @param {String} actionName Name of the action to be dispatched
     * @param {Object} payload Parameters to describe the action
     * @throws {Error} if store has handler registered that does not exist
     */
    Dispatcher.prototype.dispatch = function dispatch(actionName, payload) {
        if (this.currentAction) {
            throw new Error('Cannot call dispatch while another dispatch is executing. Attempted to execute \'' + actionName + '\' but \'' + this.currentAction.name + '\' is already executing.');
        }
        var actionHandlers = Dispatcher.handlers[actionName] || [],
            defaultHandlers = Dispatcher.handlers[DEFAULT] || [];
        if (!actionHandlers.length && !defaultHandlers.length) {
            debug(actionName + ' does not have any registered handlers');
            return;
        }
        debug('dispatching ' + actionName, payload);
        this.currentAction = new Action(actionName, payload);
        var self = this,
            allHandlers = actionHandlers.concat(defaultHandlers),
            handlerFns = {};
        allHandlers.forEach(function actionHandlersEach(store) {
            if (handlerFns[store.name]) {
                // Don't call the default if the store has an explicit action handler
                return;
            }
            var storeInstance = self.getStore(store.name);
            if ('function' === typeof store.handler) {
                handlerFns[store.name] = store.handler.bind(storeInstance);
            } else {
                if (!storeInstance[store.handler]) {
                    throw new Error(store.name + ' does not have a method called ' + store.handler);
                }
                handlerFns[store.name] = storeInstance[store.handler].bind(storeInstance);
            }
        });
        this.currentAction.execute(handlerFns);
        debug('finished ' + this.currentAction.name);
        this.currentAction = null;
    };

    /**
     * Returns a raw data object representation of the current state of the
     * dispatcher and all store instances
     * @method dehydrate
     * @returns {Object} dehydrated dispatcher data
     */
    Dispatcher.prototype.dehydrate = function dehydrate() {
        var self = this,
            stores = {};
        Object.keys(self.storeInstances).forEach(function storeInstancesEach(storeName) {
            var store = self.storeInstances[storeName];
            if (store.dehydrate) {
                stores[storeName] = store.dehydrate();
            }
        });
        return {
            stores: stores
        };
    };

    /**
     * Takes a raw data object and rehydrates the dispatcher and store instances
     * @method rehydrate
     * @param {Object} dispatcherState raw state typically retrieved from `dehydrate`
     *      method
     */
    Dispatcher.prototype.rehydrate = function rehydrate(dispatcherState) {
        var self = this;
        if (dispatcherState.stores) {
            Object.keys(dispatcherState.stores).forEach(function storeStateEach(storeName) {
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
     * @method waitFor
     * @param {String|String[]} stores An array of stores as strings to wait for
     * @param {Function} callback Called after all stores have completed handling their actions
     * @throws {Error} if there is no action dispatching
     */
    Dispatcher.prototype.waitFor = function waitFor(stores, callback) {
        if (!this.currentAction) {
            throw new Error('waitFor called even though there is no action dispatching');
        }
        this.currentAction.waitFor(stores, callback);
    };

    return Dispatcher;
};
