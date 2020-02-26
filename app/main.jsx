import React from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore } from 'redux';
import { store, cache } from './store';
import { App } from './components';


ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('main'));