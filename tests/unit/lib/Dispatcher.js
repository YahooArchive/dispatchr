/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
'use strict';

var expect = require('chai').expect;
var Dispatcher = require('../../../index')();
var mockStore = require('../../mock/Store');
var delayedStore = require('../../mock/DelayedStore');
var noDehydrateStore = require('../../mock/NoDehydrate');

describe('Dispatchr', function () {

    before(function () {
        Dispatcher.registerStore(mockStore);
        Dispatcher.registerStore(delayedStore);
        Dispatcher.registerStore(noDehydrateStore);
    });

    it('should not bleed between requires', function () {
        var Dispatcher2 = require('../../../lib/Dispatcher')();
        expect(Dispatcher2.isRegistered(mockStore)).to.equal(false);
        Dispatcher2.registerStore(delayedStore);
        expect(Dispatcher2.isRegistered(delayedStore)).to.equal(true);
    });

    it('should have handlers registered', function () {
        expect(Dispatcher.stores).to.be.an('object');
        expect(Dispatcher.stores.Store).to.be.a('function');
        expect(Dispatcher.handlers).to.be.an('object');
        expect(Dispatcher.handlers.NAVIGATE).to.be.an('array');
        expect(Dispatcher.handlers.NAVIGATE.length).to.equal(2);
        expect(Dispatcher.handlers.NAVIGATE[0].name).to.equal('Store');
        expect(Dispatcher.handlers.NAVIGATE[0].handler).be.a('function');
    });

    describe('#registerStore', function () {
        it('should throw if store name is already registered', function () {
            expect(function () {
                Dispatcher.registerStore(function Store () {});
            }).to.throw(Error);
        });

        it('should not throw if store is registered twice (should silently do nothing)', function () {
            Dispatcher.registerStore(mockStore);
            expect(Dispatcher.stores).to.be.an('object');
            expect(Dispatcher.stores.Store).to.be.a('function');
        });

        it('should throw if store is not a constructor', function () {
            expect(function () {
                Dispatcher.registerStore('store');
            }).to.throw(Error);
        });
    });

    describe('#isRegistered', function () {
        it('should return true if store name is registered', function () {
            expect(Dispatcher.isRegistered('Store')).to.equal(true);
        });

        it('should return false if store name is not registered', function () {
            expect(Dispatcher.isRegistered('foo')).to.equal(false);
        });

        it('should return false if store with same name is different constructor', function () {
            var store = function () {};
            store.storeName = 'Store';
            expect(Dispatcher.isRegistered(store)).to.equal(false);
        });
    });

    describe('#getStore', function () {
        it('should give me the same store instance', function () {
            var dispatcher = new Dispatcher({}),
                mockStoreInstance = dispatcher.getStore('Store');

            expect(mockStoreInstance).to.be.an('object');

            expect(dispatcher.getStore('Store')).to.equal(mockStoreInstance);
        });
        it('should allow passing constructor instead of class name', function () {
            var dispatcher = new Dispatcher({}),
                mockStoreInstance = dispatcher.getStore(mockStore);

            expect(mockStoreInstance).to.be.an('object');

            expect(dispatcher.getStore('Store')).to.equal(mockStoreInstance);
        });
        it('should throw if name is invalid', function () {
            var dispatcher = new Dispatcher({});

            expect(function () {
                dispatcher.getStore('Invalid');
            }).to.throw(Error);
        });
    });

    describe('#dispatch', function () {
        it('should dispatch to store', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('NAVIGATE', {});
            expect(dispatcher.storeInstances).to.be.an('object');
            expect(dispatcher.storeInstances.Store).to.be.an('object');
            var mockStore = dispatcher.storeInstances.Store;
            expect(mockStore.dispatcher).to.be.an('object');
            expect(mockStore.dispatcher.getStore).to.be.a('function');
            expect(mockStore.dispatcher.waitFor).to.be.a('function');
            var state = mockStore.getState();
            expect(state.called).to.equal(true);
            expect(state.page).to.equal('home');
        });

        it('should allow stores to wait for other stores', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('DELAY', {});
            expect(dispatcher.getStore('Store').getState().page).to.equal('delay');
        });

        it('should allow stores to wait for other stores even if they do not handle that action', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('WAITFOR', {});
            expect(dispatcher.getStore('Store').getState().called).to.equal(true);
        });

        it('should call stores that registered a default action', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('NAVIGATE', {});
            expect(dispatcher.getStore(delayedStore).defaultCalled).to.equal(true);
            expect(dispatcher.getStore(delayedStore).actionHandled).to.equal('NAVIGATE');
        });

        it('should call stores that registered a default action that has no other handlers', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('FOO', {});
            expect(dispatcher.getStore(delayedStore).defaultCalled).to.equal(true);
            expect(dispatcher.getStore(delayedStore).actionHandled).to.equal('FOO');
        });

        it('should not call the default handler if store has explicit action handler', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);
            dispatcher.dispatch('DELAY', {});
            expect(dispatcher.getStore(delayedStore).defaultCalled).to.equal(false);
            expect(dispatcher.getStore(delayedStore).actionHandled).to.equal(null);
        });

        it('should not swallow errors raised by store handler', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);
            expect(function () {
                dispatcher.dispatch('ERROR', {});
            }).to.throw();
            // Should still allow calling another dispatch
            dispatcher.dispatch('DELAY', {});
        });

        it('should throw if a dispatch called with falsy actionName parameter', function () {
          var context = {test: 'test'},
              dispatcher = new Dispatcher(context);

            expect(function () {
                dispatcher.dispatch(undefined, {
                    dispatcher: dispatcher
                });
            }).to.throw();
        });

        it('should throw if a dispatch called within dispatch', function () {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            expect(function () {
                dispatcher.dispatch('DISPATCH', {
                    dispatcher: dispatcher
                });
            }).to.throw();
        });
    });

    describe('#dehydrate', function () {
        var context,
            expectedState,
            dispatcher;
        beforeEach(function () {
            context = { test: 'test' };
            expectedState = {
                stores: {
                    Store: {
                        called: true,
                        page: 'delay'
                    },
                    DelayedStore: {
                        final: true,
                        page: 'delay'
                    }
                }
            };
            dispatcher = new Dispatcher(context);
        });

        it('should dehydrate correctly', function () {
            dispatcher.dispatch('DELAY', {});
            var state = dispatcher.dehydrate();
            expect(state).to.deep.equal(expectedState);
        });

        it('should rehydrate correctly', function () {
            dispatcher.rehydrate(expectedState);

            expect(dispatcher.storeInstances).to.be.an('object');
            expect(dispatcher.storeInstances.Store).to.be.an('object');
            var mockStore = dispatcher.storeInstances.Store;
            expect(mockStore.dispatcher).to.be.an('object');
            expect(mockStore.dispatcher.getStore).to.be.a('function');
            expect(mockStore.dispatcher.waitFor).to.be.a('function');
            var state = mockStore.getState();
            expect(state.called).to.equal(true);
            expect(state.page).to.equal('delay');
        });
    });

    describe('#shouldDehydrate', function () {
        it('should not dehydrate stores that return false from shouldDehydrate', function () {
            var dispatcher = new Dispatcher();
            dispatcher.dispatch('NAVIGATE', {});
            var state = dispatcher.dehydrate();
            expect(state.stores).to.be.an('object');
            expect(state.stores.Store).be.an('object');
            expect(state.stores.NoDehydrateStore).to.equal(undefined);
        });
    });

});
