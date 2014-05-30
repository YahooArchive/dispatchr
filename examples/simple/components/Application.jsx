/** @jsx React.DOM */
/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

var React = require('react/addons');

var Application = React.createClass({
    getInitialState: function () {
        this.store = this.props.dispatcher.getStore('ExampleStore');
        return this.store.getState();
    },
    componentDidMount: function() {
        var self = this;
        this.store.on('update', function () {
            var state = self.store.getState();
            self.setState(state);
        });
    },
    render: function() {
        return (
            <div>
                <h1>This is the {this.state.url} route!</h1>
            </div>
        );
    }
});

module.exports = Application;
