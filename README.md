# Dispatchr [![Build Status](https://travis-ci.org/yahoo/dispatchr.svg?branch=master)](https://travis-ci.org/yahoo/dispatchr) [![Dependency Status](https://david-dm.org/yahoo/dispatchr.svg)](https://david-dm.org/yahoo/dispatchr)

A [Flux](http://facebook.github.io/react/docs/flux-overview.html) dispatcher for applications that run on the server and the client.

## Usage

For a more detailed example, see our [example application](https://github.com/yahoo/flux-example).

```js
var Dispatchr = require('dispatchr')(),
    ExampleStore = require('./example-store.js'),
    context = {};

Dispatchr.registerStore(ExampleStore);

var dispatcher = new Dispatchr(context);

dispatcher.dispatch('NAVIGATE', {}, function (err) {
    // Action has been handled fully
});
```

## Dispatcher Interface

### registerStore(store)

A static method to register stores to Dispatchr making them available to handle actions and be accessible through `getStore` on Dispatchr instances.

### Constructor

Creates a new instance of Dispatchr with the following parameters:

 * `context`: A context object that will be made available to all stores. Useful for request or session level settings.

### dispatch(actionName, payload, callback)

Dispatches an action, in turn calling all stores that have registered to handle this action.

 * `actionName`: The name of the action to handle (should map to store action handlers)
 * `payload`: An object containing action information.
 * `callback`: A function that will be called when the action has been fully handled by all stores

### getStore(storeName)

Retrieve a store instance by name. Allows access to stores from components or stores from other stores.

### waitFor(stores, callback)

Waits for another store's handler to finish before calling the callback. This is useful from within stores if they need to wait for other stores to finish first.

  * `stores`: A string or array of strings of store names to wait for
  * `callback`: Called after all stores have fully handled the action

### toJSON()

Returns a serializable object containing the state of the Dispatchr instance as well as all stores that have been used since instantiation. This is useful for serializing the state of the application to send it to the client.

### rehydrate(dispatcherState)

Takes an object representing the state of the Dispatchr instance (usually retrieved from toJSON) to rehydrate the instance as well as the store instance state.

## Store Interface

Dispatchr expects that your stores use the following interface:

### Constructor

The store should have a constructor function that will be used to instantiate your store using `new Store(context, initialState)` where the parameters are as follows:

  * `context`: The context object that was passed to Dispatchr's constructor.
  * `initialState`: The initialState of the store (generally used during rehydration)

```js
function ExampleStore(context, initialState) {
    this.navigating = false;
}
```

It is also recommended to extend an event emitter so that your store can emit `update` events to the components.

```js
util.inherits(ExampleStore, EventEmitter);
```


### storeName

The store should define a static property that gives the name of the store. This is used for accessing stores from the dispatcher via `dispatcher.getStore(name)`.

```js
ExampleStore.storeName = 'ExampleStore';
```

### handlers

The store should define a static property that maps action names to handler function names. These functions will be called in the event that an action has been dispatched by the Dispatchr instance.

```js
ExampleStore.handlers = {
    'NAVIGATE': 'handleNavigate'
};
```

The handler function will be passed two parameters:

  * `payload`: An object containing action information.
  * `done`: A function to be called when the action has been fully handled by the store

```js
ExampleStore.prototype.handleNavigate = function (payload, done) {
    this.navigating = true;
    this.emit('update'); // Component may be listening for updates to state
    done(); // Action has been fully handled
};
```

### getState()

The store should implement this function that will return a serializable data object that can be transferred from the server to the client and also be used by your components.

```js
ExampleStore.prototype.getState = function () {
    return {
        navigating: this.navigating
    };
};
```

### setDispatcher(dispatcher)

The store can optionally define this function that will receive the Dispatchr instance after instantiation of the store. This gives the store access to functions like `waitFor` and `getStore` to call other stores.

```js
ExampleStore.prototype.setDispatcher = function (dispatcher) {
    this.dispatcher = dispatcher;
};
```

### toJSON()

The store can optionally define this function to customize the dehydration of the store. It should return a serializable data object that will be passed to the client.

## License

This software is free to use under the Yahoo! Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/yahoo/dispatchr/blob/master/LICENSE.md
