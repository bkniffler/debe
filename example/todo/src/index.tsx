import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './app';

const render = (Component: React.ComponentType) => {
  ReactDOM.render(<Component />, document.getElementById('root'));
};

render(App);
