# Dispatchr 

[![npm version](https://badge.fury.io/js/dispatchr.svg)](http://badge.fury.io/js/dispatchr)
[![Build Status](https://travis-ci.org/yahoo/dispatchr.svg?branch=master)](https://travis-ci.org/yahoo/dispatchr)
[![Dependency Status](https://david-dm.org/yahoo/dispatchr.svg)](https://david-dm.org/yahoo/dispatchr)
[![devDependency Status](https://david-dm.org/yahoo/dispatchr/dev-status.svg)](https://david-dm.org/yahoo/dispatchr#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/yahoo/dispatchr/badge.png?branch=master)](https://coveralls.io/r/yahoo/dispatchr?branch=master)

A [Flux](http://facebook.github.io/react/docs/flux-overview.html) dispatcher for applications that run on the server and the client.

## Usage

For a more detailed example, see our [example application](https://github.com/yahoo/flux-example).

```js
var Dispatchr = require('dispatchr')(),
    ExampleStore = require('./example-store.js'),
    context = {};

Dispatchr.registerStore(ExampleStore);

var dispatcher = new Dispatchr(context);

dispatcher.dispatch('NAVIGATE', {});
// Action has been handled fully
```

## Differences from [Facebook's Flux Dispatcher](https://github.com/facebook/flux/blob/master/src/Dispatcher.js)

Dispatchr's main goal is to facilitate server-side rendering of Flux applications while also working on the client-side to encourage code reuse. In order to isolate stores between requests on the server-side, we have opted to instantiate the dispatcher and stores classes per request.

In addition, action registration is done by stores as a unit rather than individual callbacks. This allows us to lazily instantiate stores as the events that they handle are dispatched. Since instantiation of stores is handled by the dispatcher, we can keep track of the stores that were used during a request and dehydrate their state to the client when the server has completed its execution.

Lastly, we are able to enforce the Flux flow by restricting access to the dispatcher from stores. Instead of stores directly requiring a singleton dispatcher, we pass a dispatcher interface to the constructor of the stores to provide access to only the functions that should be available to it: `waitFor` and `getStore`. This prevents the stores from dispatching an entirely new action, which should only be done by action creators to enforce the unidirectional flow that is Flux.

## Dispatcher Interface

### registerStore(storeClass)

A static method to register stores to the Dispatcher class making them available to handle actions and be accessible through `getStore` on Dispatchr instances.

### Constructor

Creates a new Dispatcher instance with the following parameters:

 * `context`: A context object that will be made available to all stores. Useful for request or session level settings.

### dispatch(actionName, payload)

Dispatches an action, in turn calling all stores that have registered to handle this action.

 * `actionName`: The name of the action to handle (should map to store action handlers)
 * `payload`: An object containing action information.

### getStore(storeClass)

Retrieve a store instance by class. Allows access to stores from components or stores from other stores.

```js
var store = require('./stores/MessageStore');
dispatcher.getStore(store);
```

### waitFor(storeClasses, callback)

Waits for another store's handler to finish before calling the callback. This is useful from within stores if they need to wait for other stores to finish first.

  * `storeClasses`: An array of store classes to wait for
  * `callback`: Called after all stores have fully handled the action

### dehydrate()

Returns a serializable object containing the state of the Dispatchr instance as well as all stores that have been used since instantiation. This is useful for serializing the state of the application to send it to the client.

### rehydrate(dispatcherState)

Takes an object representing the state of the Dispatchr instance (usually retrieved from dehydrate) to rehydrate the instance as well as the store instance state.

## Store Interface

We have provided [utilities for creating stores](#helper-utilities) but you are not required to use these if you want to keep your stores completely decoupled from the dispatcher. Dispatchr only expects that your stores use the following interface:

### Constructor

The store should have a constructor function that will be used to instantiate your store using `new Store(dispatcherInterface)` where the parameters are as follows:

  * `dispatcherInterface`: An object providing access to dispatcher's waitFor and getStore functions
  * `dispatcherInterface.getContext()`: Retrieve the context object that was passed
  * `dispatcherInterface.getStore(storeClass)`
  * `dispatcherInterface.waitFor(storeClass[], callback)`

  The constructor is also where the initial state of the store should be initialized.

```js
function ExampleStore(dispatcher) {
    this.dispatcher = dispatcher;
    if (this.initialize) {
        this.initialize();
    }
}
```

It is also recommended to extend an event emitter so that your store can emit `change` events to the components.

```js
util.inherits(ExampleStore, EventEmitter);
```


### storeName

The store should define a static property that gives the name of the store. This is used internally and for debugging purposes.

```js
ExampleStore.storeName = 'ExampleStore';
```

### handlers

The store should define a static property that maps action names to handler functions or method names. These functions will be called in the event that an action has been dispatched by the Dispatchr instance.

```js
ExampleStore.handlers = {
    'NAVIGATE': 'handleNavigate',
    'default': 'defaultHandler' // Called for any action that has not been otherwise handled
};
```

The handler function will be passed two parameters:

  * `payload`: An object containing action information.
  * `actionName`: The name of the action. This is primarily useful when using the `default` handler

```js
ExampleStore.prototype.handleNavigate = function (payload, actionName) {
    this.navigating = true;
    this.emit('change'); // Component may be listening for changes to state
};
```

If you prefer to define private methods for handling actions, you can use a static function instead of a method name. This function will be bound to the store instance when it is called:

```js
ExampleStore.handlers = {
    'NAVIGATE': function handleNavigate(payload, actionName) {
        // bound to store instance
        this.navigating = true;
        this.emit('change');
    }
};
```

### dehydrate()

The store should define this function to dehydrate the store if it will be shared between server and client. It should return a serializable data object that will be passed to the client.

```js
ExampleStore.prototype.dehydrate = function () {
    return {
        navigating: this.navigating
    };
};
```

### rehydrate(state)

The store should define this function to rehydrate the store if it will be shared between server and client. It should restore the store to the original state using the passed `state`.

```js
ExampleStore.prototype.rehydrate = function (state) {
    this.navigating = state.navigating;
};
```

## Helper Utilities

These utilities make creating stores less verbose and provide some `change` related functions that are common amongst all store implementations.

### BaseStore

`require('dispatchr/utils/BaseStore')` provides a base store class for extending. Provides `getContext`, `emitChange`, `addChangeListener`, and `removeChangeListener` functions. Example:

```js
var util = require('util');
var BaseStore = require('dispatchr/utils/BaseStore');
var MyStore = function (dispatcherInterface) {
    BaseStore.apply(this, arguments);
};
util.inherits(MyStore, BaseStore);
MyStore.storeName = 'MyStore';
MyStore.handlers = {
    'NAVIGATE': function (payload) { ... this.emitChange() ... }
};
MyStore.prototype.getFoo = function () { var context = this.getContext(), ... }
module.exports = MyStore;
```

### createStore

`require('dispatchr/utils/createStore')` provides a helper function for creating stores similar to React's `createClass` function. The created store class will extend BaseStore and have the same built-in functions. Example:

```js
var createStore = require('dispatchr/utils/createStore');
var MyStore = createStore({
    initialize: function () {}, // Called immediately after instantiation
    storeName: 'MyStore',
    handlers: {
        'NAVIGATE': function (payload) { ... this.emitChange() ... }
    }
    foo: function () { ... }
});
module.exports = MyStore;
```

## License

This software is free to use under the Yahoo! Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/yahoo/dispatchr/blob/master/LICENSE.md
