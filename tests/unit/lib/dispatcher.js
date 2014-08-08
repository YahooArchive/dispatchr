/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
'use strict';

var expect = require('chai').expect,
    Dispatcher = require('../../../lib/dispatcher')(),
    mockStore = require('../../mock/store'),
    delayedStore = require('../../mock/delayedStore');

describe('Dispatchr', function () {

    before(function () {
        Dispatcher.registerStore(mockStore);
        Dispatcher.registerStore(delayedStore);
    });

    it('should not bleed between requires', function () {
        var Dispatcher2 = require('../../../lib/dispatcher')();
        expect(Dispatcher2.isRegistered(mockStore)).to.equal(false);
        Dispatcher2.registerStore(delayedStore);
        expect(Dispatcher2.isRegistered(delayedStore)).to.equal(true);
    });

    it('should have handlers registered', function () {
        expect(Dispatcher.stores).to.be.an('object');
        expect(Dispatcher.stores.Store).to.be.a('function');
        expect(Dispatcher.handlers).to.be.an('object');
        expect(Dispatcher.handlers.NAVIGATE).to.be.an('array');
        expect(Dispatcher.handlers.NAVIGATE.length).to.equal(1);
        expect(Dispatcher.handlers.NAVIGATE[0].name).to.equal('Store');
        expect(Dispatcher.handlers.NAVIGATE[0].handler).to.equal('navigate');
    });

    describe('#registerStore', function () {
        it('should throw if store is already registered', function () {
            expect(function () {
                Dispatcher.registerStore(function Store () {});
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
        it('should dispatch to store', function (done) {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('NAVIGATE', {}, function (err) {
                expect(dispatcher.storeInstances).to.be.an('object');
                expect(dispatcher.storeInstances.Store).to.be.an('object');
                var mockStore = dispatcher.storeInstances.Store;
                expect(mockStore.dispatcher).to.equal(dispatcher);
                var state = mockStore.getState();
                expect(state.called).to.equal(true);
                expect(state.page).to.equal('home');
                done(err);
            });
        });

        it('should allow stores to wait for other stores', function (done) {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context);

            dispatcher.dispatch('DELAY', {}, function () {
                done();
            });
        });

        it('should handle one action at a time', function (done) {
            var context = {test: 'test'},
                dispatcher = new Dispatcher(context),
                delayFinished = false;

            dispatcher.dispatch('DELAY', {}, function () {
                delayFinished = true;
            });

            dispatcher.dispatch('NAVIGATE', {}, function () {
                if (delayFinished) {
                    done();
                } else {
                    done(new Error('DELAY action did not finish first.'));
                }
            });
        });

        it('should asynchronously call back if no actions registered', function (done) {
            var dispatcher = new Dispatcher({}),
                callbackCalled = false;

            dispatcher.dispatch('INVALID', {}, function () {
                callbackCalled = true;
                done();
            });

            expect(callbackCalled).to.equal(false);
        });

        it('should call the callback with error if the store returned error', function (done) {
            var dispatcher = new Dispatcher({});

            dispatcher.dispatch('ERROR', {}, function (err) {
                expect(err).to.be.an('object');
                done();
            });
        });
    });

    describe('#waitFor', function () {
        it('should call the callback with error if the store returned error', function (done) {
            var dispatcher = new Dispatcher({});

            dispatcher.dispatch('ERROR', {}, function (err) {
                expect(err).to.be.an('object');
                done();
            });

            dispatcher.waitFor('Store', function (err) {
                expect(err).to.be.an('object');
            });
        });

        it('should throw if there is no action being handled', function () {
            var dispatcher = new Dispatcher({});

            expect(function () {
                dispatcher.waitFor(['MockStore']);
            }).to.throw(Error);
        });
    });

    describe('#toJSON', function () {
        var context,
            expectedState,
            dispatcher;
        beforeEach(function () {
            context = { test: 'test' };
            expectedState = {
                context: context,
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

        it('should dehydrate correctly', function (done) {
            dispatcher.dispatch('DELAY', {}, function () {
                var state = dispatcher.toJSON();
                    expect(state).to.deep.equal(expectedState);
                done();
            });
        });

        it('should rehydrate correctly', function () {
            dispatcher.rehydrate(expectedState);

            expect(dispatcher.storeInstances).to.be.an('object');
            expect(dispatcher.storeInstances.Store).to.be.an('object');
            var mockStore = dispatcher.storeInstances.Store;
            expect(mockStore.dispatcher).to.equal(dispatcher);
            var state = mockStore.getState();
            expect(state.called).to.equal(true);
            expect(state.page).to.equal('delay');
        });
    });

});
