/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
'use strict';

var expect = require('chai').expect,
    Dispatcher = require('../../../lib/dispatcher'),
    mockStore = require('../../mock/store'),
    delayedStore = require('../../mock/delayedStore');

describe('StoreManager', function () {

    before(function () {
        Dispatcher.registerStore(mockStore);
        Dispatcher.registerStore(delayedStore);
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
                dispatcher = new Dispatcher(context),
                delayFinished = false;

            dispatcher.dispatch('DELAY', {}, function () {
                delayFinished = true;
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
                        page: 'home'
                    }
                }
            };
            dispatcher = new Dispatcher(context);
        });
        it('should dehydrate correctly', function (done) {
            dispatcher.dispatch('NAVIGATE', {}, function () {
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
            expect(state.page).to.equal('home');
        });
    });

});
