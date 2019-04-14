import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';
import './index.css';

const render = (Component: React.ComponentType) => {
  ReactDOM.render(<Component />, document.getElementById('root'));
};

render(App);
