/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

// Include setImmediate for browser support
if ('undefined' === typeof setImmediate) {
    require('setimmediate');
}

var Promise = global.Promise || require('es6-promise').Promise;

module.exports = function () {
    var debug = require('debug')('Dispatchr:dispatcher');

    /**
     * @class Dispatcher
     * @param {Object} context The context to be used for store instances
     * @constructor
     */
    function Dispatcher (context) {
        this.context = context || {};
        this.storeInstances = {};
        this.currentAction = null;
        this.actionQueue = [];
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
     * @param {Object} initialState Initial state of the store used for rehydration
     * @returns {Object} The store instance
     */
    Dispatcher.prototype.getStore = function (name, initialState) {
        var storeName = Dispatcher.getStoreName(name);
        if (!this.storeInstances[storeName]) {
            var Store = Dispatcher.stores[storeName];
            if (!Store) {
                throw new Error('Store ' + storeName + ' was not registered.');
            }
            this.storeInstances[storeName] = new (Dispatcher.stores[storeName])(this.context, initialState);
            if (this.storeInstances[storeName].setDispatcher) {
                this.storeInstances[storeName].setDispatcher(this);
            }
        }
        return this.storeInstances[storeName];
    };

    /**
     * Dispatches a new action or queues it up if one is already in progress
     * @method dispatch
     * @param {String} actionName Name of the action to be dispatched
     * @param {Object} payload Parameters to describe the action
     * @param {Function} callback Function to be called upon completion of
     *      the action.
     */
    Dispatcher.prototype.dispatch = function (actionName, payload, callback) {
        if (!Dispatcher.handlers[actionName]) {
            setImmediate(callback);
            return;
        }

        this.actionQueue.push({
            name: actionName,
            payload: payload,
            callback: callback,
            actionPromise: null,
            handlerPromises: {},
            waiting: {}
        });
        debug('action ' + actionName + ' added to queue');
        return this.next();
    };

    /**
     * Handles the next Action in the queue if another Action is not in progress
     * @method next
     * @private
     * @returns {Object}
     */
    Dispatcher.prototype.next = function () {
        if (this.currentAction) {
            return this.currentAction;
        }

        var self = this,
            nextAction = self.actionQueue.shift();

        if (nextAction) {
            self.currentAction = nextAction;

            var actionPromise = self.handleAction(nextAction);
            actionPromise.then(function (result) {
                debug('finished ' + nextAction.name);
                self.currentAction = null;
                if (nextAction.callback) {
                    setImmediate(function () {
                        nextAction.callback(null, result);
                    });
                }
                setImmediate(self.next.bind(self));
            })['catch'](function (err) {
                debug('finished with error ' + nextAction.name);
                self.currentAction = null;
                if (nextAction.callback) {
                    setImmediate(function () {
                        nextAction.callback(err);
                    });
                }
                setImmediate(self.next.bind(self));
            });
        }

        return self.currentAction;
    };

    /**
     * Calls the handler functions for all stores that have registered for
     * the given event.
     * @method handleAction
     * @private
     * @param {Object} action Action object
     * @param {String} action.name Name of the action to be handled
     * @param {Object} action.payload Parameters to describe the action
     * @returns {Promise}
     */
    Dispatcher.prototype.handleAction = function (action) {
        var self = this,
            name = action.name,
            payload = action.payload,
            handlerPromises = [];

        debug('handling ' + name);
        Dispatcher.handlers[name].forEach(function (store) {
            var handlerPromise = new Promise(function(resolve, reject) {
                var storeInstance = self.getStore(store.name);

                setImmediate(function () {
                    storeInstance[store.handler](payload, function storeHandlerDone(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            });
            handlerPromises.push(handlerPromise);
            action.handlerPromises[store.name] = handlerPromise;
        });

        return Promise.all(handlerPromises);
    };

    /**
     * Waits until all stores have finished handling an actionand then calls
     * the callback
     * @param {String|Array} stores An array of stores as strings to wait for
     * @param {Function} callback Called after all stores have completed handling their actions
     */
    Dispatcher.prototype.waitFor = function (stores, callback) {
        var currentAction = this.currentAction,
            waitHandlers = [];

        if (!currentAction) {
            throw new Error('waitFor called even though there is no action being handled!');
        }

        if (!Array.isArray(stores)) {
            stores = [stores];
        }

        stores.forEach(function (store) {
            var storeName = Dispatcher.getStoreName(store),
                actionHandler = currentAction.handlerPromises[storeName];
            if (actionHandler) {
                waitHandlers.push(actionHandler);
            }
        });

        Promise.all(waitHandlers).then(function (result) {
            setImmediate(function () {
                callback(null, result);
            });
        })['catch'](function (err) {
            callback(err);
        });
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
            context: self.context,
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
        self.context = dispatcherState.context || {};
        if (dispatcherState.stores) {
            Object.keys(dispatcherState.stores).forEach(function (storeName) {
                var state = dispatcherState.stores[storeName];
                self.getStore(storeName, state);
            });
        }
    };

    return Dispatcher;
};
